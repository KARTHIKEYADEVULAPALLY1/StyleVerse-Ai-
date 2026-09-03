"""Tests for real merchant feed ingestion (CSV/JSON).

Covers: CSV + JSON parsing, malformed feeds, missing required fields,
invalid prices/URLs, duplicate external ids, offer updates vs creation,
feed timeout/unavailable/oversized handling, SSRF URL validation,
admin authorization, and that Test Feed never modifies the catalog.
"""
from __future__ import annotations

import json
import socket
import urllib.error

import pytest

import app.connectors.feed_connector as feed_connector_module
from app.connectors.base import ConnectorError
from app.connectors.feed_connector import (
    FeedValidationError,
    MerchantFeedConnector,
    validate_feed_url,
)
from app.models.merchant import Merchant
from app.models.product_offer import ProductOffer
from app.schemas.external_product import ExternalProduct
from app.services.ingestion_service import get_or_create_merchant, ingest_external_products

ADMIN_HEADER = {'X-Admin-Key': 'test-admin-key-123'}

VALID_CSV = (
    'external_product_id,name,brand,category,price,currency,image_url,product_url,'
    'availability,rating,colors,sizes\n'
    'ZU-100,Zephyr Denim Jacket,Riverstone,Jackets,3499.50,INR,'
    'https://cdn.zudio.test/z100.jpg,https://shop.zudio.test/p/z100,In Stock,4.4,Navy|Black,S|M|L\n'
    'ZU-101,Court Sneakers,Riverstone,shoes,2599,INR,,'
    'https://shop.zudio.test/p/z101,in_stock,4.8,White,42|43\n'
)

# Row 2 has a negative price, row 3 a non-http product_url, row 4 a missing name.
MIXED_CSV = (
    'external_product_id,name,price,currency,product_url\n'
    'OK-1,Good Item,500,INR,https://ok.test/1\n'
    'BAD-1,Bad Price,-100,INR,https://ok.test/2\n'
    'BAD-2,Bad URL,300,INR,ftp://files.test/3\n'
    'BAD-3,,400,INR,https://ok.test/4\n'
)


class FakeResponse:
    """Minimal urlopen() response double used by fetch tests."""

    headers = {'Content-Type': 'text/csv'}

    def __init__(self, payload=b''):
        self._payload = payload
        self._exhausted = False

    def read(self, amount=-1):
        if self._exhausted:
            return b''
        self._exhausted = True
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture(autouse=True)
def _admin_key(monkeypatch):
    monkeypatch.setenv('ADMIN_API_KEY', 'test-admin-key-123')


def get_merchant(db, slug='amazon'):
    return db.query(Merchant).filter(Merchant.slug == slug).first()


def make_connector(slug='zudio', fmt='csv', **kwargs):
    return MerchantFeedConnector(
        slug,
        kwargs.pop('feed_url', 'https://example.com/feed.csv'),
        fmt,
        **kwargs,
    )


# ---------------------------------------------------------------------------
# Parsing + validation (pure functions - no network)
# ---------------------------------------------------------------------------

def test_valid_csv_parses_and_validates():
    report = make_connector().validate_content(VALID_CSV.encode('utf-8'))
    assert report.format_detected == 'csv'
    assert report.records_received == 2
    assert report.valid_count == 2
    assert report.invalid_count == 0
    first = report.products[0]
    assert first.external_product_id == 'ZU-100'
    assert first.price == 3499.5
    assert first.colors == ['Navy', 'Black']
    assert first.sizes == ['S', 'M', 'L']
    # Raw category values are preserved here; normalization to 'Sneakers'
    # happens downstream inside the ingestion pipeline.
    assert report.products[1].category == 'shoes'


def test_valid_json_parses_and_validates():
    valid_json = json.dumps(
        {
            'products': [
                {
                    'external_product_id': 'JS-200',
                    'name': 'Atlas Tote Bag',
                    'brand': 'Carryon',
                    'category': 'Bags',
                    'price': 1899,
                    'currency': 'INR',
                    'image_url': 'https://cdn.atlas.test/tote.jpg',
                    'product_url': 'https://atlas.test/tote',
                    'availability': 'In Stock',
                    'rating': 4.6,
                    'colors': ['Tan', 'Olive'],
                }
            ]
        }
    )
    report = make_connector(fmt='json').validate_content(valid_json.encode())
    assert report.format_detected == 'json'
    assert report.valid_count == 1
    product = report.products[0]
    assert product.external_product_id == 'JS-200'
    assert product.price == 1899
    assert product.colors == ['Tan', 'Olive']
    assert report.invalid_count == 0


def test_malformed_csv_is_rejected():
    broken = b'external_product_id,name,price\ncol1,col2\n"unterminated,3\n'
    with pytest.raises(FeedValidationError):
        make_connector().validate_content(broken)


def test_malformed_json_is_rejected():
    with pytest.raises(FeedValidationError, match='not valid JSON'):
        make_connector(fmt='json').validate_content(b'{ not json !!')


def test_json_non_object_records_are_rejected():
    with pytest.raises(FeedValidationError, match='non-object'):
        make_connector(fmt='json').validate_content(b'["one", {"external_product_id": "X"}]')


def test_missing_required_fields_are_quarantined():
    report = make_connector().validate_content(MIXED_CSV.encode('utf-8'))
    assert report.records_received == 4
    assert report.valid_count == 1
    assert report.invalid_count == 3
    errors_by_id = {e['external_product_id']: e['errors'] for e in report.invalid_records}
    assert any('negative' in msg for msg in errors_by_id['BAD-1'])
    assert any('http' in msg for msg in errors_by_id['BAD-2'])
    assert any('name is required' in msg for msg in errors_by_id['BAD-3'])
    # Invalid records never become products.
    assert [p.external_product_id for p in report.products] == ['OK-1']


def test_invalid_price_formats_are_rejected():
    csv_text = (
        'external_product_id,name,price,currency,product_url\n'
        'P-1,A,abc,INR,https://a.test/1\n'
        'P-2,B,12..34,INR,https://a.test/2\n'
    )
    report = make_connector().validate_content(csv_text.encode())
    assert report.valid_count == 0
    assert all('valid number' in '; '.join(e['errors']) for e in report.invalid_records)


def test_negative_price_is_rejected():
    csv_text = (
        'external_product_id,name,price,currency,product_url\n'
        'P-1,A,-42,INR,https://a.test/1\n'
    )
    report = make_connector().validate_content(csv_text.encode())
    assert report.invalid_count == 1
    assert any('negative' in msg for msg in report.invalid_records[0]['errors'])


def test_local_image_paths_are_not_accepted():
    csv_text = (
        'external_product_id,name,price,currency,product_url,image_url\n'
        'I-1,A,100,INR,https://a.test/1,/etc/passwd\n'
        'I-2,B,100,INR,https://a.test/2,file:///etc/passwd\n'
    )
    report = make_connector().validate_content(csv_text.encode())
    # image_url is stripped -> records stay valid but carry no local path.
    assert report.invalid_count == 0
    assert all(product.image_url is None for product in report.products)


# ---------------------------------------------------------------------------
# Pipeline integration: dedupe, updates vs creation
# ---------------------------------------------------------------------------

def test_duplicate_external_ids_do_not_duplicate_offers(seeded_db):
    merchant = get_or_create_merchant(seeded_db, 'zudio', name='Zudio')
    report = make_connector('zudio').validate_content(VALID_CSV.encode())
    first = ingest_external_products(seeded_db, report.products, merchant)
    count_after_first = seeded_db.query(ProductOffer).count()

    second = ingest_external_products(seeded_db, report.products, merchant)
    assert second['offers_created'] == 0
    assert second['offers_updated'] == first['offers_created'] + first['offers_updated']
    assert seeded_db.query(ProductOffer).count() == count_after_first


def test_existing_offer_is_updated_in_place(seeded_db):
    merchant = get_or_create_merchant(seeded_db, 'zudio', name='Zudio')
    report = make_connector('zudio').validate_content(VALID_CSV.encode())
    ingest_external_products(seeded_db, report.products, merchant)
    offer_before = (
        seeded_db.query(ProductOffer)
        .filter(ProductOffer.merchant_product_id == 'ZU-100')
        .first()
    )
    assert offer_before is not None

    # Same external id, new price -> same offer row updated, not duplicated.
    changed = make_connector('zudio').validate_content(
        VALID_CSV.replace('3499.50', '2999.00').encode()
    )
    result = ingest_external_products(seeded_db, changed.products, merchant)

    seeded_db.expire_all()
    offer_after = (
        seeded_db.query(ProductOffer)
        .filter(ProductOffer.merchant_product_id == 'ZU-100')
        .first()
    )
    assert result['offers_created'] == 0
    assert result['offers_updated'] >= 2
    # Identity preserved + price refreshed.
    assert offer_after.id == offer_before.id
    assert offer_after.price == 2999.0


def test_feed_products_flow_through_normalization(seeded_db):
    """'shoes' must land in the canonical Sneakers category like mock data."""
    from app.models.product import Product

    merchant = get_or_create_merchant(seeded_db, 'zudio', name='Zudio')
    report = make_connector('zudio').validate_content(VALID_CSV.encode())
    ingest_external_products(seeded_db, report.products, merchant)

    product = (
        seeded_db.query(Product)
        .filter(Product.name == 'Court Sneakers', Product.brand == 'Riverstone')
        .first()
    )
    assert product is not None
    assert product.category == 'Sneakers'
    assert product.brand == 'Riverstone'


# ---------------------------------------------------------------------------
# URL security (SSRF) + bounded fetching
# ---------------------------------------------------------------------------

def test_feed_url_validation_blocks_unsafe_targets(monkeypatch):
    monkeypatch.delenv('FEED_ALLOW_PRIVATE_HOSTS', raising=False)
    for unsafe in (
        'file:///etc/passwd',
        'http://localhost/feed.csv',
        'http://127.0.0.1/feed.csv',
        'http://192.168.1.10/feed.csv',
        'http://169.254.169.254/latest/meta-data',
        '',
    ):
        with pytest.raises(FeedValidationError):
            validate_feed_url(unsafe)
    # A resolvable public host passes validation.
    assert validate_feed_url('https://example.com/products.csv')


def test_feed_timeout_maps_to_readable_error():
    def slow_opener(request, timeout=None):
        raise urllib.error.URLError(socket.timeout('timed out'))

    connector = make_connector()
    with pytest.raises(ConnectorError, match='timed out'):
        connector.fetch_content(opener=slow_opener)


def test_feed_unavailable_maps_to_readable_error():
    def failing_opener(request, timeout=None):
        raise urllib.error.URLError(OSError('connection refused'))

    connector = make_connector()
    with pytest.raises(ConnectorError, match='could not be reached'):
        connector.fetch_content(opener=failing_opener)


def test_feed_http_error_maps_to_readable_error():
    def failing_opener(request, timeout=None):
        raise urllib.error.HTTPError(request.full_url, 404, 'Not Found', None, None)

    connector = make_connector()
    with pytest.raises(ConnectorError, match='HTTP 404'):
        connector.fetch_content(opener=failing_opener)


def test_oversized_feed_is_rejected(monkeypatch):
    monkeypatch.setattr(feed_connector_module, 'get_feed_max_bytes', lambda: 1024)
    big_payload = (VALID_CSV * 20).encode()  # far beyond 1 KB

    class HugeResponse(FakeResponse):
        def read(self, amount=-1):
            return big_payload

    connector = make_connector()
    with pytest.raises(ConnectorError, match='maximum allowed size'):
        connector.fetch_content(opener=lambda request, timeout=None: HugeResponse())


def test_auth_header_comes_from_env_var_name_only(monkeypatch):
    captured = {}

    def opener(request, timeout=None):
        captured['auth'] = request.get_header('Authorization')
        return FakeResponse(VALID_CSV.encode())

    monkeypatch.setenv('ZUDIO_FEED_TOKEN', 'secret-token-value')
    connector = make_connector(auth_env_var='ZUDIO_FEED_TOKEN')
    content, _content_type = connector.fetch_content(opener=opener)
    assert captured['auth'] == 'Bearer secret-token-value'
    assert len(content) > 0
    # Only the env-var NAME is known to the connector - never the secret.
    assert connector.auth_env_var == 'ZUDIO_FEED_TOKEN'
    assert 'secret' not in (connector.feed_url or '')


# ---------------------------------------------------------------------------
# Admin API: configuration, test-feed, feed-sync
# ---------------------------------------------------------------------------

class StubFeedConnector:
    """Stands in for MerchantFeedConnector inside API tests."""

    def __init__(self, slug, url, fmt=None, auth_env_var=None):
        self.slug, self.url, self.fmt = slug, url, fmt

    def is_available(self):
        return True

    def fetch_with_report(self):
        from app.connectors.feed_connector import FetchReport

        report = FetchReport(format_detected=self.fmt or 'csv')
        for ext_id, name, price in (
            ('FD-1', 'Feed Parka', 4999),
            ('FD-2', 'Feed Hoodie', 2799),
        ):
            report.products.append(
                ExternalProduct(
                    merchant=self.slug,
                    external_product_id=ext_id,
                    name=name,
                    brand='FeedBrand',
                    category='Jackets',
                    price=price,
                    currency='INR',
                    image_url='https://cdn.feed.test/x.jpg',
                    product_url=f'https://shop.feed.test/{ext_id.lower()}',
                    availability='In Stock',
                    rating=4.5,
                )
            )
        report.records_received = len(report.products)
        return report


@pytest.fixture()
def feed_ready_merchant(seeded_db, monkeypatch):
    import app.services.merchant_sync_service as sync_service
    from app.services.merchant_sync_service import update_sync_config

    monkeypatch.setattr(sync_service, 'MerchantFeedConnector', StubFeedConnector)
    update_sync_config(
        seeded_db,
        get_merchant(seeded_db, 'amazon'),
        {
            'feed_type': 'url',
            'feed_url': 'https://example.com/amazon.csv',
            'feed_format': 'csv',
        },
    )
    seeded_db.expire_all()
    return get_merchant(seeded_db, 'amazon')


def test_feed_sync_imports_records_and_records_stats(client, seeded_db, monkeypatch):
    import app.services.merchant_sync_service as sync_service

    monkeypatch.setattr(sync_service, 'MerchantFeedConnector', StubFeedConnector)
    merchant = get_merchant(seeded_db, 'amazon')
    from app.services.merchant_sync_service import update_sync_config

    update_sync_config(
        seeded_db,
        merchant,
        {'feed_type': 'url', 'feed_url': 'https://example.com/a.csv', 'feed_format': 'json'},
    )
    response = client.post(f'/api/admin/merchants/{merchant.id}/feed-sync', headers=ADMIN_HEADER)
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'completed'
    stats = body['result_stats']
    assert stats['records_received'] == 2
    assert stats['records_valid'] == 2
    assert stats['records_invalid'] == 0
    assert stats['offers_created'] == 2
    assert 'duplicates_detected' in stats


def test_repeat_feed_sync_does_not_duplicate(client, seeded_db, monkeypatch):
    import app.services.merchant_sync_service as sync_service
    from app.services.merchant_sync_service import update_sync_config

    monkeypatch.setattr(sync_service, 'MerchantFeedConnector', StubFeedConnector)
    merchant = get_merchant(seeded_db, 'amazon')
    update_sync_config(
        seeded_db,
        merchant,
        {'feed_type': 'url', 'feed_url': 'https://example.com/a.csv', 'feed_format': 'csv'},
    )
    client.post(f'/api/admin/merchants/{merchant.id}/feed-sync', headers=ADMIN_HEADER)

    response = client.post(f'/api/admin/merchants/{merchant.id}/feed-sync', headers=ADMIN_HEADER)
    assert response.status_code == 200
    stats = response.json()['result_stats']
    assert stats['offers_created'] == 0
    assert stats['offers_updated'] == 2
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'amazon')
    feed_offers = [
        offer for offer in merchant.offers
        if offer.merchant_product_id in ('FD-1', 'FD-2')
    ]
    assert len(feed_offers) == 2


def test_feed_sync_requires_configuration(client, seeded_db):
    merchant = get_merchant(seeded_db, 'ajio')
    # The live database may carry a committed feed configuration from earlier
    # real usage; reset it inside this rolled-back transaction so the test
    # exercises the unconfigured path deterministically.
    from app.services.merchant_sync_service import update_sync_config

    update_sync_config(seeded_db, merchant, {'feed_type': 'mock', 'feed_url': None})
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'ajio')

    response = client.post(
        f'/api/admin/merchants/{merchant.id}/feed-sync', headers=ADMIN_HEADER
    )
    assert response.status_code == 400
    assert 'No feed configured' in response.json()['detail']


def test_feed_sync_failure_preserves_catalog(client, seeded_db, monkeypatch):
    import app.services.merchant_sync_service as sync_service
    from app.services.merchant_sync_service import update_sync_config

    monkeypatch.setattr(sync_service, 'MerchantFeedConnector', StubFeedConnector)
    merchant = get_merchant(seeded_db, 'amazon')
    update_sync_config(
        seeded_db,
        merchant,
        {'feed_type': 'url', 'feed_url': 'https://example.com/a.csv', 'feed_format': 'csv'},
    )
    client.post(f'/api/admin/merchants/{merchant.id}/feed-sync', headers=ADMIN_HEADER)
    offers_before = len(list(merchant.offers))
    assert offers_before >= 2

    def broken_connector(*args, **kwargs):
        raise ConnectorError('Feed could not be reached: connection refused')

    monkeypatch.setattr(sync_service, 'MerchantFeedConnector', broken_connector)
    response = client.post(f'/api/admin/merchants/{merchant.id}/feed-sync', headers=ADMIN_HEADER)
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'failed'

    # Previous valid product/offer data is never wiped by a failed feed.
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'amazon')
    assert len(list(merchant.offers)) == offers_before
    failed_run = max(merchant.syncs, key=lambda s: s.id)
    assert failed_run.status == 'failed'
    assert 'could not be reached' in (failed_run.error_message or '')


def test_test_feed_does_not_modify_catalog(client, seeded_db, monkeypatch):
    import app.routes.admin as admin_routes

    merchant = get_merchant(seeded_db, 'amazon')
    from app.services.merchant_sync_service import update_sync_config

    update_sync_config(
        seeded_db,
        merchant,
        {'feed_type': 'url', 'feed_url': 'https://feeds.example.test/a.csv', 'feed_format': 'csv'},
    )
    offers_before = len(list(merchant.offers))
    products_before = len(client.get('/api/products').json())

    monkeypatch.setattr(admin_routes, 'MerchantFeedConnector', StubFeedConnector)
    response = client.post(
        f'/api/admin/merchants/{merchant.id}/test-feed', headers=ADMIN_HEADER
    )
    assert response.status_code == 200
    body = response.json()
    assert body['connection'] == 'ok'
    assert body['record_count'] == 2
    assert body['format_detected'] == 'csv'
    assert body['sample'], 'expected preview rows'

    # The dry run imported nothing.
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'amazon')
    assert len(list(merchant.offers)) == offers_before
    assert len(client.get('/api/products').json()) == products_before


def test_new_admin_endpoints_require_authorization(client, seeded_db):
    merchant = get_merchant(seeded_db, 'amazon')
    assert client.post(f'/api/admin/merchants/{merchant.id}/test-feed').status_code == 401
    assert client.post(f'/api/admin/merchants/{merchant.id}/feed-sync').status_code == 401
    wrong = {'X-Admin-Key': 'not-the-key'}
    assert client.post(
        f'/api/admin/merchants/{merchant.id}/feed-sync', headers=wrong
    ).status_code == 403


def test_feed_url_is_ssrf_checked_at_configuration_time(client, seeded_db, monkeypatch):
    monkeypatch.delenv('FEED_ALLOW_PRIVATE_HOSTS', raising=False)
    merchant = get_merchant(seeded_db, 'myntra')
    response = client.patch(
        f'/api/admin/merchants/{merchant.id}/sync-config',
        headers=ADMIN_HEADER,
        json={'feed_type': 'url', 'feed_url': 'http://169.254.169.254/feed'},
    )
    assert response.status_code == 422
    assert 'private' in response.json()['detail']


def test_invalid_feed_format_is_rejected(client, seeded_db):
    merchant = get_merchant(seeded_db, 'myntra')
    response = client.patch(
        f'/api/admin/merchants/{merchant.id}/sync-config',
        headers=ADMIN_HEADER,
        json={'feed_format': 'xml'},
    )
    assert response.status_code == 422