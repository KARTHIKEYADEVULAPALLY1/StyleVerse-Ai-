"""Tests for connector loading (mock connectors + registry)."""
from __future__ import annotations

import json

import pytest

from app.connectors import (
    MOCK_MERCHANT_SLUGS,
    ConnectorError,
    ProductConnector,
    get_connector,
    list_available_connectors,
)
from app.connectors.mock_connector import MockFileConnector
from app.schemas.external_product import ExternalProduct


def test_product_connector_is_abstract():
    with pytest.raises(TypeError):
        ProductConnector()  # type: ignore[abstract]


@pytest.mark.parametrize('slug', MOCK_MERCHANT_SLUGS)
def test_mock_connector_loads_merchant_data(slug):
    connector = get_connector(slug)
    assert isinstance(connector, MockFileConnector)
    assert connector.merchant_slug == slug
    assert connector.is_available()

    products = connector.fetch_products()
    assert len(products) > 0
    for product in products:
        assert isinstance(product, ExternalProduct)
        assert product.merchant == slug
        assert product.external_product_id
        assert product.name
        assert product.price >= 0


def test_fetch_product_details_returns_single_item():
    connector = get_connector('amazon')
    product = connector.fetch_product_details('AMZ-1001')
    assert product is not None
    assert product.name == 'Classic White Sneakers'
    assert product.brand == 'Nike'
    assert product.product_url.endswith('AMZ-1001')


def test_fetch_product_details_unknown_id_returns_none():
    connector = get_connector('amazon')
    assert connector.fetch_product_details('DOES-NOT-EXIST') is None


def test_missing_data_file_raises_connector_error(tmp_path):
    connector = MockFileConnector('nonexistent-merchant', data_dir=tmp_path)
    assert not connector.is_available()
    with pytest.raises(ConnectorError):
        connector.fetch_products()


def test_invalid_json_raises_connector_error(tmp_path):
    bad_file = tmp_path / 'broken.json'
    bad_file.write_text('{ not valid json', encoding='utf-8')
    connector = MockFileConnector('broken', data_dir=tmp_path)
    with pytest.raises(ConnectorError):
        connector.fetch_products()


def test_registry_rejects_unknown_slug():
    with pytest.raises(ConnectorError):
        get_connector('totally-unknown-store')


def test_list_available_connectors_contains_mock_slugs():
    available = list_available_connectors()
    for slug in MOCK_MERCHANT_SLUGS:
        assert slug in available


def test_mock_connector_fills_defaults_for_minimal_records(tmp_path):
    minimal = {
        'merchant': 'mini',
        'products': [
            {'name': 'Bare Product', 'price': 10.0},
            {'name': 'Second Product', 'price': 20.0},
        ],
    }
    (tmp_path / 'mini.json').write_text(json.dumps(minimal), encoding='utf-8')
    connector = MockFileConnector('mini', data_dir=tmp_path)
    products = connector.fetch_products()
    assert [p.external_product_id for p in products] == ['mini-1', 'mini-2']
    assert all(p.merchant == 'mini' for p in products)