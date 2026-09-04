"""Integration tests for GET /api/products/{product_id}/prices."""

from __future__ import annotations

import requests

BASE = 'http://127.0.0.1:8000/api/products'


def test_product_prices_return_offers_with_best_price_and_savings() -> None:
    response = requests.get(f'{BASE}/1/prices', timeout=10)
    response.raise_for_status()
    data = response.json()

    assert data['product_id'] == 1
    assert len(data['offers']) == 1
    assert data['best_price'] is not None
    assert data['highest_price'] is not None
    assert data['savings'] is None
    assert data['currency'] == 'USD'

    in_stock_prices = [
        offer['price']
        for offer in data['offers']
        if offer['availability'].lower() == 'in stock'
    ]
    assert data['best_price'] == min(in_stock_prices)
    assert data['highest_price'] == max(in_stock_prices)
    print('PASS product 1 prices:', data)


def test_out_of_stock_offers_are_excluded_from_best_price() -> None:
    response = requests.get(f'{BASE}/15/prices', timeout=10)
    response.raise_for_status()
    data = response.json()

    in_stock_prices = [
        offer['price']
        for offer in data['offers']
        if offer['availability'].lower() == 'in stock'
    ]
    assert data['best_price'] == min(in_stock_prices)
    assert len(data['offers']) == 1
    assert data['offers'][0]['store'] == 'tentree'
    print('PASS out-of-stock excluded from best price')


def test_missing_product_returns_404() -> None:
    response = requests.get(f'{BASE}/99999/prices', timeout=10)
    assert response.status_code == 404
    print('PASS missing product returns 404')


if __name__ == '__main__':
    test_missing_product_returns_404()
    test_product_prices_return_offers_with_best_price_and_savings()
    test_out_of_stock_offers_are_excluded_from_best_price()
    print('All price comparison tests passed.')
