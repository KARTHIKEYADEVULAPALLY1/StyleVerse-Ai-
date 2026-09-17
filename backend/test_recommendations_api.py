"""Integration tests for GET /api/recommendations."""

from __future__ import annotations

from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def auth_headers(email: str, password: str) -> dict[str, str]:
    signup = client.post(
        '/api/auth/signup',
        json={'name': 'Rec Tester', 'email': email, 'password': password},
    )
    if signup.status_code == 409:
        login = client.post(
            '/api/auth/login',
            json={'email': email, 'password': password},
        )
        login.raise_for_status()
        token = login.json()['access_token']
    else:
        signup.raise_for_status()
        token = signup.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def test_new_user_gets_popular_fallback() -> None:
    headers = auth_headers('rec_new_user@example.com', 'TestPass123!')
    response = client.get('/api/recommendations', headers=headers)
    response.raise_for_status()
    products = response.json()
    assert isinstance(products, list)
    assert 0 < len(products) <= 6
    print('PASS new user fallback:', [product['name'] for product in products])


def test_purchased_products_are_excluded() -> None:
    headers = auth_headers('rec_history_user@example.com', 'TestPass123!')
    catalog = client.get('/api/products').json()
    assert len(catalog) >= 2

    wishlist_product = catalog[0]
    purchase_product = catalog[1]

    wishlist_response = client.post(
        f'/api/wishlist/{wishlist_product["id"]}',
        headers=headers,
    )
    wishlist_response.raise_for_status()

    cart_response = client.post(
        '/api/cart',
        headers=headers,
        json={
            'product_id': purchase_product['id'],
            'quantity': 1,
            'selected_size': 'M',
        },
    )
    cart_response.raise_for_status()

    order_response = client.post('/api/orders', headers=headers)
    order_response.raise_for_status()

    recommendations = client.get('/api/recommendations', headers=headers)
    recommendations.raise_for_status()
    recommended_ids = {product['id'] for product in recommendations.json()}

    assert purchase_product['id'] not in recommended_ids
    print('PASS purchased product excluded:', purchase_product['name'])
    print('PASS recommendations:', [product['name'] for product in recommendations.json()])


def test_unauthenticated_request_is_rejected() -> None:
    response = client.get('/api/recommendations')
    assert response.status_code == 401
    print('PASS unauthenticated request rejected')


if __name__ == '__main__':
    test_unauthenticated_request_is_rejected()
    test_new_user_gets_popular_fallback()
    test_purchased_products_are_excluded()
    print('All recommendation tests passed.')
