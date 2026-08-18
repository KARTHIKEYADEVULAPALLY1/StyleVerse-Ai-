"""Verification test script for StyleVerse AI Products API."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass


def test_docs():
    print('Testing GET /docs...')
    req = urllib.request.Request('http://127.0.0.1:8000/docs')
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        print('  -> /docs HTTP 200 OK')


def test_openapi():
    print('Testing GET /openapi.json...')
    req = urllib.request.Request('http://127.0.0.1:8000/openapi.json')
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        paths = data.get('paths', {})
        assert '/api/products' in paths, 'Missing /api/products'
        assert '/api/products/{product_id}' in paths, 'Missing /api/products/{product_id}'
        print('  -> OpenAPI schemas contains /api/products and /api/products/{product_id}')


def test_get_all_products():
    print('Testing GET /api/products...')
    req = urllib.request.Request('http://127.0.0.1:8000/api/products')
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        products = json.loads(res.read().decode('utf-8'))
        assert isinstance(products, list)
        # Expect a non-empty catalog (database may grow over time)
        assert len(products) > 0, 'Product catalog should not be empty'

        # Verify all originally seeded products are present in the response.
        seeded_product_ids = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
        returned_ids = {p['id'] for p in products}
        missing = sorted(seeded_product_ids - returned_ids)
        assert not missing, f'Missing seeded products: {missing}'

        print(f'  -> Returned {len(products)} products (expected seed IDs {sorted(seeded_product_ids)} present):')
        for p in products:
            print(f"     [{p['id']}] {p['brand']} {p['name']} | Category: {p['category']} | Price: {p['price']} | Rating: {p['rating']}")
        return products


def test_get_single_product():
    print('Testing GET /api/products/1...')
    req = urllib.request.Request('http://127.0.0.1:8000/api/products/1')
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        product = json.loads(res.read().decode('utf-8'))
        assert product['id'] == 1
        assert product['name'] == 'Oversized Graphic Hoodie'
        assert product['brand'] == 'H&M'
        assert product['price'] == '₹1,299'
        assert product['original_price'] == '₹2,499'
        assert product['originalPrice'] == '₹2,499'
        assert product['sizes'] == ['S', 'M', 'L', 'XL']
        assert product['colors'] == ['Black', 'Gray', 'Cream']
        print(f'  -> Successfully retrieved Product 1: {product["name"]}')


def test_get_nonexistent_product():
    print('Testing GET /api/products/999 (expecting 404)...')
    try:
        req = urllib.request.Request('http://127.0.0.1:8000/api/products/999')
        urllib.request.urlopen(req)
        raise AssertionError('Expected HTTP 404, but request succeeded')
    except urllib.error.HTTPError as e:
        assert e.code == 404, f'Expected 404, got {e.code}'
        payload = json.loads(e.read().decode('utf-8'))
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
