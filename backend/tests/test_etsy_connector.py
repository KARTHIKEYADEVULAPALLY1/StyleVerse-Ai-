"""Tests for the first real merchant connector: Etsy Open API v3.

All HTTP access is stubbed via the connector's ``_request``/opener seams -
no network calls, no credentials required. Covers: authentication header,
401 handling, pagination, 429 rate-limit retry, timeout, invalid response,
missing/invalid fields, successful import through the pipeline, offer
update vs duplicate prevention, admin authorization for the 'etsy' source,
and sync-failure catalog preservation.
"""
from __future__ import annotations

import json
import socket
import urllib.error

import pytest

import app.services.merchant_sync_service as sync_service
from app.connectors.base import ConnectorError
from app.connectors.etsy_connector import MAX_ATTEMPTS, EtsyConnector
from app.models.merchant import Merchant
from app.models.product_offer import ProductOffer
from app.schemas.external_product import ExternalProduct
from app.services.ingestion_service import get_or_create_merchant, ingest_external_products

ADMIN_HEADER = {'X-Admin-Key': 'test-admin-key-123'}


def listing(ext_id='ET-1', title='Linen Dress', price=4999, **overrides):
    row = {
        'listing_id': ext_id,
        'title': title,
        'description': 'Handmade linen dress',
        'price': price,
        'divider': 100,
        'currency_code': 'USD',
        'url': f'https://www.etsy.com/listing/{ext_id}',
        'state': 'active',
        'quantity': 3,
        'taxonomy_path': ['Clothing', 'Dress'],
        'images': [
            {'url_570xN': f'https://i.etsystatic.com/{ext_id}_570N.jpg'},
        ],
    }
    row.update(overrides)
    return row


def api_page(results, count=None):
    return {'count': count if count is not None else len(results), 'results': results}


def make_connector(**kwargs):
    kwargs.setdefault('api_key', 'test-key-abc')
    kwargs.setdefault('enabled', True)
    kwargs.setdefault('keywords', 'dress')
    return EtsyConnector('etsy', **kwargs)


def http_error(code, headers_dict=None):
    import email.message

    headers = email.message.Message()
    for key, value in (headers_dict or {}).items():
        headers[key] = str(value)
    return urllib.error.HTTPError(
        'https://openapi.etsy.com/x', code, 'err', headers, None
    )


class _PageResponse:
    def __init__(self, payload):
        self._body = json.dumps(payload).encode()

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def get_merchant(db, slug='amazon'):
    return db.query(Merchant).filter(Merchant.slug == slug).first()


@pytest.fixture(autouse=True)
def _admin_key(monkeypatch):
    monkeypatch.setenv('ADMIN_API_KEY', 'test-admin-key-123')


def _page_response(results, count):
    return _PageResponse({'count': count, 'results': results})


# ---------------------------------------------------------------------------
# Authentication + HTTP failure handling
# ---------------------------------------------------------------------------

def test_authentication_header_is_sent_from_env_key():
    captured = {}

    def opener(request, timeout=None):
        # urllib stores headers capitalized: 'x-api-key' -> 'X-api-key'.
        captured['key'] = request.get_header('X-api-key')
        return _PageResponse(api_page([listing()], 1))

    connector = make_connector(api_key='secret-key-value')
    assert connector.is_configured() and connector.is_available()
    payload = connector._request('/application/listings/active', {}, opener=opener)
    assert captured['key'] == 'secret-key-value'
    assert payload['results'][0]['listing_id'] == 'ET-1'


def test_auth_failure_401_is_readable_and_not_retried():
    attempts = {'n': 0}

    def opener(request, timeout=None):
        attempts['n'] += 1
        raise http_error(401)

    connector = make_connector()
    with pytest.raises(ConnectorError, match='authentication failed'):
        connector._request('/application/listings/active', {}, opener=opener)
    assert attempts['n'] == 1  # credentials errors are never retried


def test_rate_limit_429_is_retried_then_succeeds(monkeypatch):
    monkeypatch.setattr(
        'app.connectors.etsy_connector.time.sleep', lambda seconds: None
    )
    attempts = {'n': 0}

    def opener(request, timeout=None):
        attempts['n'] += 1
        if attempts['n'] == 1:
            raise http_error(429, {'Retry-After': '0'})
        return _PageResponse(api_page([listing()], 1))

    connector = make_connector()
    payload = connector.fetch_page(0, 25, opener=opener)
    assert len(payload['results']) == 1
    assert attempts['n'] == 2


def test_rate_limit_exhaustion_reports_clear_error(monkeypatch):
    monkeypatch.setattr(
        'app.connectors.etsy_connector.time.sleep', lambda seconds: None
    )

    def opener(request, timeout=None):
        raise http_error(429, {'Retry-After': '0'})

    connector = make_connector()
    with pytest.raises(ConnectorError, match='rate limit'):
        connector._request('/application/listings/active', {}, opener=opener)


def test_timeout_maps_to_readable_error(monkeypatch):
    monkeypatch.setattr(
        'app.connectors.etsy_connector.time.sleep', lambda seconds: None
    )

    def slow_opener(request, timeout=None):
        raise urllib.error.URLError(socket.timeout('timed out'))

    connector = make_connector()
    with pytest.raises(ConnectorError, match='timed out'):
        connector._request('/application/listings/active', {}, opener=slow_opener)


def test_invalid_json_response_maps_to_readable_error():
    class BadResponse:
        def read(self):
            return b'<html>not json</html>'

        def __enter__(self):
            return self

        def __exit__(self, *exc):
            return False

    connector = make_connector()
    with pytest.raises(ConnectorError, match='invalid response'):
        connector._request(
            '/application/listings/active',
            {},
            opener=lambda request, timeout=None: BadResponse(),
        )


def test_server_errors_are_bounded_and_reported(monkeypatch):
    monkeypatch.setattr(
        'app.connectors.etsy_connector.time.sleep', lambda seconds: None
    )
    attempts = {'n': 0}

    def opener(request, timeout=None):
        attempts['n'] += 1
        raise http_error(503)

    connector = make_connector()
    with pytest.raises(ConnectorError, match='server error'):
        connector._request('/application/listings/active', {}, opener=opener)
    assert attempts['n'] == MAX_ATTEMPTS


# ---------------------------------------------------------------------------
# Pagination + listing validation
# ---------------------------------------------------------------------------

def test_pagination_fetches_all_pages(monkeypatch):
    monkeypatch.setattr(
        'app.connectors.etsy_connector.get_page_size', lambda: 2
    )
    monkeypatch.setattr(
        'app.connectors.etsy_connector.get_max_pages', lambda: 5
    )
    requested = []

    def opener(request, timeout=None):
        offset = int(request.full_url.split('offset=')[1].split('&')[0])
        requested.append(offset)
        if offset == 0:
            return _PageResponse(api_page([listing('A-1'), listing('A-2')], count=3))
        return _PageResponse(api_page([listing('A-3')], count=3))

    connector = make_connector()
    report = connector.fetch_with_report(opener=opener)
    assert report.records_received == 3
    assert report.valid_count == 3
    assert requested == [0, 2]  # second page starts right after the first


def test_pagination_respects_max_pages_cap(monkeypatch):
    monkeypatch.setattr(
        'app.connectors.etsy_connector.get_page_size', lambda: 1
    )
    monkeypatch.setattr(
        'app.connectors.etsy_connector.get_max_pages', lambda: 2
    )

    def opener(request, timeout=None):
        # Always a full page -> endless source; the cap must stop it.
        return _PageResponse(api_page([listing()], count=9999))

    connector = make_connector()
    report = connector.fetch_with_report(opener=opener)
    assert report.records_received == 2  # max_pages * page_size


def test_empty_results_are_handled_safely():
    def opener(request, timeout=None):
        return _PageResponse(api_page([], count=0))

    connector = make_connector()
    report = connector.fetch_with_report(opener=opener)
    assert report.records_received == 0
    assert report.valid_count == 0
    assert report.invalid_count == 0


def test_missing_or_invalid_fields_are_quarantined():
    connector = make_connector()
    rows = [
        listing(),                                        # valid
        {'listing_id': 'X-2'},                            # missing everything else
        listing('X-3', price=-500),                       # non-positive price
        {**listing('X-4'), 'url': 'http://not-secure.test/x'},
        {**listing('X-5'), 'currency_code': ''},
    ]
    products, invalids = [], []
    for index, row in enumerate(rows):
        product, entry = connector.validate_listing(row, index)
        if product is None:
            invalids.append(entry)
        else:
            products.append(product)

    assert len(products) == 1 and products[0].external_product_id == 'ET-1'
    assert len(invalids) == 4
    errors_by_id = {e['external_product_id']: e['errors'] for e in invalids}
    assert any('title is required' in m for m in errors_by_id['X-2'])
    assert any('positive' in m for m in errors_by_id['X-3'])
    assert any('https' in m for m in errors_by_id['X-4'])
    assert any('currency_code' in m for m in errors_by_id['X-5'])


def test_listing_validation_normalizes_price_divider_and_availability():
    connector = make_connector()
    product, entry = connector.validate_listing(listing(price=4999, quantity=0), 0)
    assert product is not None
    assert entry['errors'] == []
    assert product.price == 49.99          # minor units / divider=100
    assert product.currency == 'USD'
    assert product.availability == 'Out of Stock'
    assert product.product_url.startswith('https://www.etsy.com/listing/')
    assert product.image_url.endswith('_570N.jpg')
    assert product.category == 'Clothing'  # first taxonomy path segment


# ---------------------------------------------------------------------------
# Pipeline integration (import / update / duplicates / failure preservation)
# ---------------------------------------------------------------------------

class StubEtsyConnector:
    """Offline stand-in returning two deterministic listings per fetch."""

    fail_next = False

    def __init__(self, slug, keywords=None):
        self.slug, self.keywords = slug, keywords

    def is_available(self):
        return True

    def fetch_with_report(self):
        from app.connectors.feed_connector import FetchReport

        if StubEtsyConnector.fail_next:
            raise ConnectorError('Etsy API authentication failed (HTTP 401).')
        report = FetchReport(format_detected='json')
        for ext_id, title, price in (
            ('ET-1', 'Handwoven Scarf', 3500),
            ('ET-2', 'Beaded Clutch', 5200),
        ):
            report.products.append(
                ExternalProduct(
                    merchant=self.slug,
                    external_product_id=ext_id,
                    name=title,
                    brand='',
                    category='Bags' if ext_id == 'ET-2' else '',
                    price=price / 100,
                    currency='USD',
                    image_url=f'https://i.etsystatic.com/{ext_id}.jpg',
                    product_url=f'https://www.etsy.com/listing/{ext_id}',
                    availability='In Stock',
                    rating=0.0,
                )
            )
        report.records_received = len(report.products)
        return report


@pytest.fixture()
def etsy_merchant(seeded_db, monkeypatch):
    """The amazon-row merchant switched to the Etsy source with a stub API."""
    monkeypatch.setattr(sync_service, 'EtsyConnector', StubEtsyConnector)
    merchant = get_merchant(seeded_db, 'amazon')
    from app.services.merchant_sync_service import update_sync_config

    update_sync_config(
        seeded_db,
        merchant,
        {'feed_type': 'etsy', 'feed_query': 'linen dress'},
    )
    seeded_db.expire_all()
    return get_merchant(seeded_db, 'amazon')


def test_real_import_creates_products_and_offers(client, etsy_merchant):
    response = client.post(
        f'/api/admin/merchants/{etsy_merchant.id}/feed-sync', headers=ADMIN_HEADER
    )
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'completed'
    stats = body['result_stats']
    assert stats['records_received'] == 2
    assert stats['offers_created'] == 2

    seeded_db = etsy_merchant
    offers = [
        offer for offer in seeded_db.offers if offer.merchant_product_id in ('ET-1', 'ET-2')
    ]
    assert len(offers) == 2
    one = next(o for o in offers if o.merchant_product_id == 'ET-1')
    assert one.price == 35.0                      # divider-normalized real price
    assert one.last_updated is not None           # freshness tracking works


def test_repeat_etsy_sync_updates_offers_without_duplicates(client, etsy_merchant):
    client.post(f'/api/admin/merchants/{etsy_merchant.id}/feed-sync', headers=ADMIN_HEADER)
    offers_before = len(list(etsy_merchant.offers))

    response = client.post(
        f'/api/admin/merchants/{etsy_merchant.id}/feed-sync', headers=ADMIN_HEADER
    )
    stats = response.json()['result_stats']
    assert stats['offers_created'] == 0
    assert stats['offers_updated'] == 2
    seeded_db = etsy_merchant
    etsy_offers = [
        offer for offer in seeded_db.offers if offer.merchant_product_id in ('ET-1', 'ET-2')
    ]
    assert len(etsy_offers) == 2
    assert len(list(seeded_db.offers)) == offers_before


def test_failed_etsy_sync_preserves_catalog(client, etsy_merchant):
    client.post(f'/api/admin/merchants/{etsy_merchant.id}/feed-sync', headers=ADMIN_HEADER)
    offers_before = len(list(etsy_merchant.offers))
    assert offers_before >= 2

    StubEtsyConnector.fail_next = True
    try:
        response = client.post(
            f'/api/admin/merchants/{etsy_merchant.id}/feed-sync', headers=ADMIN_HEADER
        )
        body = response.json()
        assert body['status'] == 'failed'
        assert 'authentication failed' in (body['error_message'] or '')
    finally:
        StubEtsyConnector.fail_next = False

    seeded_db = etsy_merchant
    assert len(list(seeded_db.offers)) == offers_before  # catalog never wiped


# ---------------------------------------------------------------------------
# Admin authorization + configuration of the Etsy source
# ---------------------------------------------------------------------------

def test_etsy_source_configuration_and_authorization(client, seeded_db):
    merchant = get_merchant(seeded_db, 'myntra')
    # Non-admin callers are rejected.
    assert client.patch(
        f'/api/admin/merchants/{merchant.id}/sync-config',
        json={'feed_type': 'etsy'},
    ).status_code == 401
    wrong = {'X-Admin-Key': 'not-the-key'}
    assert client.patch(
        f'/api/admin/merchants/{merchant.id}/sync-config',
        headers=wrong,
        json={'feed_type': 'etsy'},
    ).status_code == 403

    response = client.patch(
        f'/api/admin/merchants/{merchant.id}/sync-config',
        headers=ADMIN_HEADER,
        json={'feed_type': 'etsy', 'feed_query': 'linen dress'},
    )
    assert response.status_code == 200
    body = response.json()
    assert body['feed_type'] == 'etsy'
    assert body['feed_query'] == 'linen dress'
    assert body['has_feed_configured'] is True


def test_test_feed_reports_missing_credentials_readably(client, seeded_db, monkeypatch):
    monkeypatch.delenv('ETSY_API_KEY', raising=False)
    import app.routes.admin as admin_routes

    monkeypatch.setattr(admin_routes, 'EtsyConnector', EtsyConnector)
    merchant = get_merchant(seeded_db, 'flipkart')
    from app.services.merchant_sync_service import update_sync_config

    update_sync_config(seeded_db, merchant, {'feed_type': 'etsy'})
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'flipkart')

    response = client.post(
        f'/api/admin/merchants/{merchant.id}/test-feed', headers=ADMIN_HEADER
    )
    assert response.status_code == 200
    body = response.json()
    assert body['connection'] == 'failed'
    assert 'ETSY_API_KEY' in body['message']


def test_connector_status_reflects_etsy_state(seeded_db):
    merchant = get_merchant(seeded_db, 'ajio')
    from app.services.merchant_sync_service import update_sync_config

    update_sync_config(seeded_db, merchant, {'feed_type': 'etsy'})
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'ajio')

    status = sync_service.get_connector_status(merchant)
    # Without ETSY_API_KEY in the environment the connector reports Not Connected;
    # if a key happens to exist locally it reports Disabled until ETSY_ENABLED.
    assert status in ('not_connected', 'disabled')