"""Integration tests for GET /api/recommendations."""

from __future__ import annotations

import requests

BASE = 'http://127.0.0.1:8000/api'


def auth_headers(email: str, password: str) -> dict[str, str]:
    signup = requests.post(
        f'{BASE}/auth/signup',
        json={'name': 'Rec Tester', 'email': email, 'password': password},
        timeout=10,
    )
    if signup.status_code == 409:
        login = requests.post(
            f'{BASE}/auth/login',
            json={'email': email, 'password': password},
            timeout=10,
        )
        login.raise_for_status()
        token = login.json()['access_token']
    else:
        signup.raise_for_status()
        token = signup.json()['access_token']
    return {'Authorization': f'Bearer {token}'}


def test_new_user_gets_popular_fallback() -> None:
    headers = auth_headers('rec_new_user@example.com', 'TestPass123!')
    response = requests.get(f'{BASE}/recommendations', headers=headers, timeout=10)
    response.raise_for_status()
    products = response.json()
    assert isinstance(products, list)
    assert 0 < len(products) <= 6
    print('PASS new user fallback:', [product['name'] for product in products])


def test_purchased_products_are_excluded() -> None:
    headers = auth_headers('rec_history_user@example.com', 'TestPass123!')
    catalog = requests.get(f'{BASE}/products', timeout=10).json()
    assert len(catalog) >= 2

    wishlist_product = catalog[0]
    purchase_product = catalog[1]

    wishlist_response = requests.post(
        f'{BASE}/wishlist/{wishlist_product["id"]}',
        headers=headers,
        timeout=10,
    )
    wishlist_response.raise_for_status()

    cart_response = requests.post(
        f'{BASE}/cart',
        headers=headers,
        json={
            'product_id': purchase_product['id'],
            'quantity': 1,
            'selected_size': 'M',
        },
        timeout=10,
    )
    cart_response.raise_for_status()

    order_response = requests.post(f'{BASE}/orders', headers=headers, timeout=10)
    order_response.raise_for_status()

    recommendations = requests.get(f'{BASE}/recommendations', headers=headers, timeout=10)
    recommendations.raise_for_status()
    recommended_ids = {product['id'] for product in recommendations.json()}

    assert purchase_product['id'] not in recommended_ids
    print('PASS purchased product excluded:', purchase_product['name'])
    print('PASS recommendations:', [product['name'] for product in recommendations.json()])


def test_unauthenticated_request_is_rejected() -> None:
    response = requests.get(f'{BASE}/recommendations', timeout=10)
    assert response.status_code == 401
    print('PASS unauthenticated request rejected')


if __name__ == '__main__':
    test_unauthenticated_request_is_rejected()
    test_new_user_gets_popular_fallback()
    test_purchased_products_are_excluded()
    print('All recommendation tests passed.')
