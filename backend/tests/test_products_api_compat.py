"""Regression tests: existing Product APIs must keep working unchanged."""
from __future__ import annotations

SEEDED_IDS = set(range(1, 16))


def test_get_all_products_returns_seeded_catalog(client):
    response = client.get('/api/products')
    assert response.status_code == 200
    products = response.json()
    ids = {p['id'] for p in products}
    assert SEEDED_IDS <= ids

    first = next(p for p in products if p['id'] == 1)
    assert first['name'] == 'Nimbus Rain Jacket'
    assert first['brand'] == 'tentree'
    assert first['price'] == '$218.00'
    assert first['original_price'] == '$218.00'
    assert first['originalPrice'] == '$218.00'
    assert first['store'] == 'tentree'
    assert first['colors'] == ['Black']
    assert first['sizes'] == ['S', 'M', 'L', 'XL']


def test_get_single_product(client):
    response = client.get('/api/products/1')
    assert response.status_code == 200
    assert response.json()['id'] == 1


def test_get_missing_product_404(client):
    assert client.get('/api/products/99999').status_code == 404


def test_search_endpoint_still_works(client):
    response = client.get('/api/products/search?q=hoodie')
    assert response.status_code == 200
    results = response.json()
    assert isinstance(results, list)
    assert any('hoodie' in p['name'].lower() for p in results)


def test_empty_search_returns_catalog(client):
    response = client.get('/api/products/search?q=')
    assert response.status_code == 200
    assert len(response.json()) > 0


def test_price_comparison_shape_unchanged(client):
    response = client.get('/api/products/1/prices')
    assert response.status_code == 200
    body = response.json()
    assert body['product_id'] == 1
    assert len(body['offers']) == 1
    for offer in body['offers']:
        # Fields the frontend PriceComparison component depends on.
        assert {'store', 'price', 'currency', 'availability', 'rating'} <= set(offer)
    assert body['best_price'] is not None
    assert body['highest_price'] is not None
    assert body['savings'] is None
    best = min(o['price'] for o in body['offers'] if o['availability'] == 'In Stock')
    assert body['best_price'] == best


def test_prices_missing_product_404(client):
    assert client.get('/api/products/99999/prices').status_code == 404


def test_ingested_offers_flow_into_price_comparison(client):
    """Seeded merchant offers -> ProductOffer -> Price Comparison."""
    run = client.post(
        '/api/admin/ingestion/run',
        json={'merchant_slugs': ['amazon']},
        headers={'X-Admin-Key': 'styleverse-dev-admin-key'},
    )
    assert run.status_code == 200

    response = client.get('/api/products/2/prices')
    assert response.status_code == 200
    stores = {offer['store']: offer for offer in response.json()['offers']}
    assert 'tentree' in stores
    assert stores['tentree']['product_url'].startswith('https://www.tentree.com/products/')


def test_ingested_products_appear_in_catalog_and_search(client):
    catalog = client.get('/api/products').json()
    names = {p['name'] for p in catalog}
    assert {'Nimbus Rain Jacket', 'Juniper Zip Hoodie'} <= names

    search = client.get('/api/products/search?q=hoodie').json()
    assert any(p['name'] == 'Juniper Zip Hoodie' for p in search)

    new_product = next(p for p in catalog if p['name'] == 'Juniper Zip Hoodie')
    detail = client.get(f"/api/products/{new_product['id']}").json()
    assert detail['brand'] == 'tentree'
    assert detail['category'] == 'Hoodies'
    assert any(o['store'] == 'tentree' for o in detail['offers'])