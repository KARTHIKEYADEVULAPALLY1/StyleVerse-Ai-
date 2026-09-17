"""Integration tests for POST /api/try-on/upload."""

from __future__ import annotations

import base64
from pathlib import Path
import sys

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app

UPLOADS_DIR = BACKEND_DIR / 'uploads'

client = TestClient(app)

MINIMAL_PNG = base64.b64decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
)
MINIMAL_JPEG = base64.b64decode(
    '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a'
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy'
    'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEB'
    'AxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGH'
    '/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEB'
    'PxA//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPxA//9k='
)


def test_valid_png_upload() -> None:
    response = client.post(
        '/api/try-on/upload',
        files={'file': ('ignored-name.png', MINIMAL_PNG, 'image/png')},
    )
    response.raise_for_status()
    data = response.json()
    assert data['status'] == 'uploaded'
    assert data['upload_id']
    assert data['filename'].endswith('.png')
    assert (UPLOADS_DIR / data['filename']).is_file()
    print('PASS valid PNG upload:', data)


def test_valid_jpeg_upload() -> None:
    response = client.post(
        '/api/try-on/upload',
        files={'file': ('photo.jpg', MINIMAL_JPEG, 'image/jpeg')},
    )
    response.raise_for_status()
    data = response.json()
    assert data['status'] == 'uploaded'
    assert data['filename'].endswith('.jpg')
    print('PASS valid JPEG upload:', data)


def test_invalid_file_is_rejected() -> None:
    response = client.post(
        '/api/try-on/upload',
        files={'file': ('notes.txt', b'not-an-image', 'text/plain')},
    )
    assert response.status_code == 400
    print('PASS invalid file rejected')


def test_oversized_file_is_rejected() -> None:
    oversized = MINIMAL_JPEG + (b'0' * (6 * 1024 * 1024))
    response = client.post(
        '/api/try-on/upload',
        files={'file': ('large.jpg', oversized, 'image/jpeg')},
    )
    assert response.status_code == 413
    print('PASS oversized file rejected')


if __name__ == '__main__':
    test_invalid_file_is_rejected()
    test_oversized_file_is_rejected()
    test_valid_png_upload()
    test_valid_jpeg_upload()
    print('All try-on upload tests passed.')
