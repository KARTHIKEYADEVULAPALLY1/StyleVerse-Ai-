"""Integration tests for POST /api/try-on/process."""

from __future__ import annotations

import base64

import requests

BASE = 'http://127.0.0.1:8000/api/try-on'

MINIMAL_PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)


def upload_sample_image() -> str:
    response = requests.post(
        f'{BASE}/upload',
        files={'file': ('sample.png', MINIMAL_PNG, 'image/png')},
        timeout=10,
    )
    response.raise_for_status()
    return response.json()['upload_id']


def test_process_with_valid_image_and_product() -> None:
    upload_id = upload_sample_image()
    response = requests.post(
        f'{BASE}/process',
        json={'user_image': upload_id, 'product_id': 1},
        timeout=10,
    )
    response.raise_for_status()
    data = response.json()
    assert data == {
        'status': 'processing',
        'message': 'Virtual try-on processing has started.',
        'product_id': 1,
    }
    print('PASS valid process request:', data)


def test_invalid_product_returns_404() -> None:
    upload_id = upload_sample_image()
    response = requests.post(
        f'{BASE}/process',
        json={'user_image': upload_id, 'product_id': 99999},
        timeout=10,
    )
    assert response.status_code == 404
    print('PASS invalid product returns 404')


def test_missing_image_returns_error() -> None:
    response = requests.post(
        f'{BASE}/process',
        json={'user_image': 'a' * 32, 'product_id': 1},
        timeout=10,
    )
    assert response.status_code == 404
    print('PASS missing uploaded image returns 404')


def test_invalid_image_reference_returns_400() -> None:
    response = requests.post(
        f'{BASE}/process',
        json={'user_image': '../secrets.png', 'product_id': 1},
        timeout=10,
    )
    assert response.status_code == 400
    print('PASS invalid image reference returns 400')


if __name__ == '__main__':
    test_invalid_image_reference_returns_400()
    test_missing_image_returns_error()
    test_invalid_product_returns_404()
    test_process_with_valid_image_and_product()
    print('All try-on process tests passed.')
