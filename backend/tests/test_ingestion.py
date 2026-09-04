"""Tests for the ingestion pipeline: merchant creation, offer creation,
duplicate prevention, price updates, and cross-merchant deduplication."""
from __future__ import annotations

import json

import pytest

from app.connectors.mock_connector import MockFileConnector
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_offer import ProductOffer
from app.schemas.external_product import ExternalProduct
from app.services.ingestion_service import (
    get_or_create_merchant,
    ingest_external_products,
    run_connector_ingestion,
)


def offer_count(db) -> int:
    return db.query(ProductOffer).count()


def test_merchant_created_on_first_ingestion(seeded_db):
    result = run_connector_ingestion(seeded_db, 'amazon')
    merchant = seeded_db.query(Merchant).filter(Merchant.slug == 'amazon').first()
    assert merchant is not None
    assert merchant.name == 'Amazon'
    assert merchant.is_active is True
    assert result['merchant'] == 'amazon'
    assert result['received'] > 0


def test_get_or_create_merchant_is_idempotent(seeded_db):
    first = get_or_create_merchant(seeded_db, 'myntra', name='Myntra')
    second = get_or_create_merchant(seeded_db, 'myntra', name='Myntra')
    assert first.id == second.id
    assert seeded_db.query(Merchant).filter(Merchant.slug == 'myntra').count() == 1


def test_offers_created_with_preserved_merchant_ids_and_urls(seeded_db):
    run_connector_ingestion(seeded_db, 'amazon')

    offer = (
        seeded_db.query(ProductOffer)
        .join(Merchant, ProductOffer.merchant_id == Merchant.id)
        .filter(
            Merchant.slug == 'amazon',
            ProductOffer.merchant_product_id == 'AMZ-1002',
        )
        .first()
    )
    assert offer is not None
    assert offer.store == 'Amazon'
    assert offer.price == 3499.0
    assert offer.currency == 'INR'
    assert offer.availability == 'In Stock'
    assert offer.product_url == 'https://www.amazon.in/dp/AMZ-1002'
    assert offer.image_url is not None
    assert offer.last_updated is not None


def test_ingested_products_are_normalized(seeded_db):
    run_connector_ingestion(seeded_db, 'amazon')

    product = (
        seeded_db.query(Product)
        .filter(Product.name == 'Aerolight Running Shoes')
        .first()
    )
    assert product is not None
    # "shoes" was normalized to the canonical Sneakers category.
    assert product.category == 'Sneakers'
    assert product.brand == 'Puma'
    assert product.store == 'Amazon'
    assert product.is_active is True
    assert product.embedding is not None  # searchable immediately


def test_duplicate_offer_prevention_on_reingestion(seeded_db):
    # The live database may contain offers committed by earlier real ingestion
    # runs. Remove them inside this rolled-back transaction so the test sees a
    # true "first ingestion" regardless of the environment's history.
    ajio = seeded_db.query(Merchant).filter(Merchant.slug == 'ajio').first()
    if ajio is not None:
        seeded_db.query(ProductOffer).filter(
            ProductOffer.merchant_id == ajio.id
        ).delete(synchronize_session=False)
        seeded_db.commit()

    first_run = run_connector_ingestion(seeded_db, 'ajio')
    count_after_first = offer_count(seeded_db)
    assert first_run['offers_created'] > 0

    second_run = run_connector_ingestion(seeded_db, 'ajio')

    # Every ajio offer already existed after run one - nothing new is inserted.
    assert second_run['offers_created'] == 0
    assert (
        second_run['offers_updated']
        == first_run['offers_created'] + first_run['offers_updated']
    )
    assert offer_count(seeded_db) == count_after_first


def test_price_updates_flow_into_existing_offers(seeded_db, tmp_path):
    data = {
        'merchant': 'teststore',
        'products': [
            {
                'external_product_id': 'TS-1',
                'name': 'Test Price Tracker Jacket',
                'brand': 'TestBrand',
                'category': 'Jackets',
                'price': 100.0,
                'currency': 'INR',
            }
        ],
    }
    (tmp_path / 'teststore.json').write_text(json.dumps(data), encoding='utf-8')

    from app.services.ingestion_service import ingest_external_products

    connector = MockFileConnector('teststore', data_dir=tmp_path)
    merchant = get_or_create_merchant(seeded_db, 'teststore', name='Test Store')
    ingest_external_products(seeded_db, connector.fetch_products(), merchant)
    offer = (
        seeded_db.query(ProductOffer)
        .filter(ProductOffer.merchant_product_id == 'TS-1')
        .first()
    )
    assert offer is not None
    assert offer.price == 100.0

    # Merchant drops the price; re-ingestion must update the same row.
    data['products'][0]['price'] = 79.99
    (tmp_path / 'teststore.json').write_text(json.dumps(data), encoding='utf-8')
    rerun = ingest_external_products(
        seeded_db, connector.fetch_products(), merchant
    )

    seeded_db.refresh(offer)
    assert offer.price == 79.99
    assert rerun['offers_updated'] == 1
    assert rerun['offers_created'] == 0


def test_cross_merchant_dedup_maps_to_single_product(seeded_db):
    run_connector_ingestion(seeded_db, 'myntra')
    run_connector_ingestion(seeded_db, 'ajio')

    denim_products = (
        seeded_db.query(Product)
        .filter(Product.name == 'Urban Denim Jacket')
        .all()
    )
    assert len(denim_products) == 1
    stores = sorted(offer.store for offer in denim_products[0].offers)
    assert stores == ['Ajio', 'Myntra']


def test_ingested_item_matches_existing_seeded_product(seeded_db):
    # The seeded catalog already contains the verified tentree jacket (id 1).
    existing = seeded_db.get(Product, 1)
    assert existing is not None

    before = offer_count(seeded_db)
    products_before = seeded_db.query(Product).count()
    merchant = get_or_create_merchant(seeded_db, 'matchstore', name='Match Store')
    ingest_external_products(
        seeded_db,
        [
            ExternalProduct(
                merchant='matchstore',
                external_product_id='MATCH-1',
                name='Nimbus Rain Jacket',
                brand='tentree',
                category='Jackets',
                price=218.0,
                currency='USD',
                product_url='https://www.tentree.com/products/mens-rain-jacket',
                availability='in_stock',
            )
        ],
        merchant,
    )

    # No new product was created for it - the offer attached to id 1.
    sneaker_products = (
        seeded_db.query(Product)
        .filter(Product.name == 'Nimbus Rain Jacket')
        .all()
    )
    assert len(sneaker_products) == 1
    assert sneaker_products[0].id == 1

    match_offer = (
        seeded_db.query(ProductOffer)
        .filter(
            ProductOffer.product_id == 1,
            ProductOffer.store == 'Match Store',
        )
        .first()
    )
    assert match_offer is not None
    assert match_offer.merchant_product_id == 'MATCH-1'
    assert match_offer.availability == 'In Stock'
    assert match_offer.price == 218.0
    # The incoming item matched the existing product rather than creating a duplicate.
    assert seeded_db.query(Product).count() == products_before
    assert offer_count(seeded_db) == before + 1


def test_bad_rows_are_skipped_without_killing_batch(seeded_db):
    merchant = get_or_create_merchant(seeded_db, 'brokenbatch', name='Broken Batch')
    good = ExternalProduct(
        merchant='brokenbatch',
        external_product_id='OK-1',
        name='Good Product',
        brand='Brand',
        category='Tops',
        price=10.0,
    )
    bad = ExternalProduct.model_validate(
        {
            'merchant': 'brokenbatch',
            'external_product_id': 'BAD-1',
            'name': 'Bad Product',
            'brand': 'Brand',
            'category': 'Tops',
            'price': 10.0,
        }
    )
    # Force a failure for one row by patching the matcher used by the pipeline.
    import app.services.ingestion_service as ingestion

    def flaky_find(db, external, candidates=None):
        if external.external_product_id == 'BAD-1':
            raise RuntimeError('simulated connector/normalization failure')
        return None

    saved = ingestion.find_matching_product
    ingestion.find_matching_product = flaky_find
    try:
        result = ingest_external_products(seeded_db, [good, bad], merchant)
    finally:
        ingestion.find_matching_product = saved

    assert result['skipped'] == 1
    assert result['errors'][0]['external_product_id'] == 'BAD-1'
    assert result['products_created'] == 1
    assert seeded_db.query(Product).filter(Product.name == 'Good Product').count() == 1


def test_mock_connector_behaves_like_real_connector(seeded_db):
    """The mock connector drives the exact same pipeline a live connector will."""
    connector = MockFileConnector('amazon')
    externals = connector.fetch_products()
    merchant = get_or_create_merchant(seeded_db, 'amazon', name='Amazon')
    result = ingest_external_products(seeded_db, externals, merchant)
    assert result['received'] == len(externals)
    assert result['offers_created'] + result['offers_updated'] == len(externals)


# --- Image URL validation -----------------------------------------------------


def _make_product(
    external_product_id: str,
    image_url: str | None,
    name: str = "Test Product",
) -> ExternalProduct:
    return ExternalProduct.model_validate({
        "merchant": "testimg",
        "external_product_id": external_product_id,
        "name": name,
        "brand": "TestBrand",
        "category": "Tops",
        "price": 9.99,
        "image_url": image_url,
    })


@pytest.mark.parametrize(
    "url",
    [
        "https://cdn.example.com/product.jpg",
        "http://cdn.example.com/product.jpg",
        "/media/uploads/shoe.png",
        None,  # no image at all
        "",  # empty string
    ],
)
def test_safe_image_urls_accepted_and_stored(seeded_db, url):
    merchant = get_or_create_merchant(seeded_db, "testimg", name="TestImg")
    product = _make_product("SAFE-1", url)
    result = ingest_external_products(seeded_db, [product], merchant)
    assert result["rejected_images"] == 0
    assert result["skipped"] == 0
    assert result["offers_created"] == 1

    offer = (
        seeded_db.query(ProductOffer)
        .filter(ProductOffer.merchant_product_id == "SAFE-1")
        .first()
    )
    assert offer is not None
    if url and (url.startswith("http") or url.startswith("/")):
        # Absolute http(s) URLs and root-relative paths are stored verbatim.
        assert offer.image_url == url
    else:
        # Missing/empty images fall back to the placeholder.
        from app.services.ingestion_service import PLACEHOLDER_IMAGE

        assert offer.image_url == PLACEHOLDER_IMAGE


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        "vbscript:msgbox(1)",
        "ftp://evil.com/img.jpg",
    ],
)
def test_unsafe_image_urls_rejected_and_counted(seeded_db, url):
    merchant = get_or_create_merchant(seeded_db, "testimg", name="TestImg")
    product = _make_product("UNSAFE-1", url)
    result = ingest_external_products(seeded_db, [product], merchant)
    assert result["rejected_images"] == 1
    assert result["skipped"] == 0
    assert result["offers_created"] == 0
    assert result["errors"][0]["external_product_id"] == "UNSAFE-1"
    assert "unsafe image URL" in result["errors"][0]["error"]


def test_batch_with_mixed_images_processes_safe_ones(seeded_db):
    merchant = get_or_create_merchant(seeded_db, "testimg", name="TestImg")
    products = [
        _make_product("SAFE-1", "https://cdn.example.com/safe.jpg", name="Safe Product A"),
        _make_product("UNSAFE-1", "javascript:alert(1)", name="Bad Product"),
        _make_product("SAFE-2", None, name="Safe Product B"),
    ]
    result = ingest_external_products(seeded_db, products, merchant)
    assert result["received"] == 3
    assert result["rejected_images"] == 1
    assert result["offers_created"] == 2
    assert result["errors"][0]["external_product_id"] == "UNSAFE-1"


def test_no_network_calls_during_validation(seeded_db, monkeypatch):
    """Sanity check that image validation is a pure string operation."""
    import socket

    calls: list = []

    def _track(*args, **kwargs):
        calls.append((args, kwargs))
        raise AssertionError("No network I/O during validation")

    monkeypatch.setattr(socket, "gethostbyname", _track, raising=True)
    monkeypatch.setattr(socket, "create_connection", _track, raising=True)
    merchant = get_or_create_merchant(seeded_db, "testimg", name="TestImg")
    product = _make_product("SAFE-1", "https://cdn.example.com/safe.jpg")
    result = ingest_external_products(seeded_db, [product], merchant)
    assert result["rejected_images"] == 0
    assert calls == []