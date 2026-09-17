"""Verification test script for StyleVerse AI Products API."""
from __future__ import annotations

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

client = TestClient(app)


def test_docs():
    print('Testing GET /docs...')
    res = client.get('/docs')
    assert res.status_code == 200
    print('  -> /docs HTTP 200 OK')


def test_openapi():
    print('Testing GET /openapi.json...')
    res = client.get('/openapi.json')
    assert res.status_code == 200
    data = res.json()
    paths = data.get('paths', {})
    assert '/api/products' in paths, 'Missing /api/products'
    assert '/api/products/{product_id}' in paths, 'Missing /api/products/{product_id}'
    print('  -> OpenAPI schemas contains /api/products and /api/products/{product_id}')


def test_get_all_products():
    print('Testing GET /api/products...')
    res = client.get('/api/products')
    assert res.status_code == 200
    products = res.json()
    assert isinstance(products, list)
    # Expect a non-empty catalog (database may grow over time)
    assert len(products) > 0, 'Product catalog should not be empty'

    # Verify all curated products are present in the response.
    seeded_product_ids = set(range(1, 16))
    returned_ids = {p['id'] for p in products}
    missing = sorted(seeded_product_ids - returned_ids)
    assert not missing, f'Missing seeded products: {missing}'

    print(f'  -> Returned {len(products)} products (expected seed IDs {sorted(seeded_product_ids)} present):')
    for p in products:
        print(f"     [{p['id']}] {p['brand']} {p['name']} | Category: {p['category']} | Price: {p['price']} | Rating: {p['rating']}")


def test_get_single_product():
    print('Testing GET /api/products/1...')
    res = client.get('/api/products/1')
    assert res.status_code == 200
    product = res.json()
    assert product['id'] == 1
    assert product['name'] == 'Nimbus Rain Jacket'
    assert product['brand'] == 'tentree'
    assert product['price'] == '$218.00'
    assert product['original_price'] == '$218.00'
    assert product['originalPrice'] == '$218.00'
    assert product['sizes'] == ['S', 'M', 'L', 'XL']
    assert product['colors'] == ['Black']
    print(f'  -> Successfully retrieved Product 1: {product["name"]}')


def test_get_nonexistent_product():
    print('Testing GET /api/products/999 (expecting 404)...')
    res = client.get('/api/products/999')
    assert res.status_code == 404
    payload = res.json()
    assert 'detail' in payload
    print(f'  -> Received 404 with detail: "{payload["detail"]}"')


def main():
    print('=' * 60)
    print('StyleVerse AI - Product API Verification Test Suite')
    print('=' * 60)
    test_docs()
    test_openapi()
    test_get_all_products()
    test_get_single_product()
    test_get_nonexistent_product()
    print('=' * 60)
    print('ALL PRODUCT API TESTS COMPLETED SUCCESSFULLY!')
    print('=' * 60)


if __name__ == '__main__':
    main()
