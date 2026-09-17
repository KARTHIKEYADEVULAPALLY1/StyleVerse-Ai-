"""Integration tests for POST /api/try-on/process."""

from __future__ import annotations

import base64
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

MINIMAL_PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)


def upload_sample_image() -> str:
    response = client.post(
        '/api/try-on/upload',
        files={'file': ('sample.png', MINIMAL_PNG, 'image/png')},
    )
    response.raise_for_status()
    return response.json()['upload_id']


def test_process_with_valid_image_and_product() -> None:
    upload_id = upload_sample_image()
    response = client.post(
        '/api/try-on/process',
        json={'user_image': upload_id, 'product_id': 1},
    )
    response.raise_for_status()
    data = response.json()
    assert data['status'] == 'completed'
    assert data['message'] == 'Virtual try-on generated successfully.'
    assert data['product_id'] == 1
    assert data['result_image'] and data['result_image'].startswith('/api/try-on/results/')
    print('PASS valid process request:', data)


def test_invalid_product_returns_404() -> None:
    upload_id = upload_sample_image()
    response = client.post(
        '/api/try-on/process',
        json={'user_image': upload_id, 'product_id': 99999},
    )
    assert response.status_code == 404
    print('PASS invalid product returns 404')


def test_missing_image_returns_error() -> None:
    response = client.post(
        '/api/try-on/process',
        json={'user_image': 'a' * 32, 'product_id': 1},
    )
    assert response.status_code == 404
    print('PASS missing uploaded image returns 404')


def test_invalid_image_reference_returns_400() -> None:
    response = client.post(
        '/api/try-on/process',
        json={'user_image': '../secrets.png', 'product_id': 1},
    )
    assert response.status_code == 400
    print('PASS invalid image reference returns 400')


if __name__ == '__main__':
    test_invalid_image_reference_returns_400()
    test_missing_image_returns_error()
    test_invalid_product_returns_404()
    test_process_with_valid_image_and_product()
    print('All try-on process tests passed.')
