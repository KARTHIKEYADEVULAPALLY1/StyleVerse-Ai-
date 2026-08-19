"""End-to-end test for the real virtual try-on workflow."""
from __future__ import annotations

from pathlib import Path

import requests
from PIL import Image, ImageDraw

BASE = 'http://127.0.0.1:8000/api/try-on'
BACKEND_DIR = Path(__file__).resolve().parent
TEST_PHOTO = BACKEND_DIR / 'test_user_photo.png'
TEST_RESULT = BACKEND_DIR / 'test_result.jpg'


def _ensure_test_photo() -> None:
    """Create a simple test photo if it does not exist yet."""
    if TEST_PHOTO.is_file():
        return
    img = Image.new('RGB', (300, 400), (135, 206, 235))
    draw = ImageDraw.Draw(img)
    for y in range(400):
        draw.line([(0, y), (300, y)], fill=(int(135 - y / 3), int(206 - y / 3), int(235 - y / 3)))
    draw.rectangle([(100, 100), (200, 300)], fill=(80, 60, 50))
    draw.ellipse([(125, 30), (175, 100)], fill=(200, 160, 120))
    draw.rectangle([(110, 300), (145, 380)], fill=(60, 45, 40))
    draw.rectangle([(155, 300), (190, 380)], fill=(60, 45, 40))
    img.save(TEST_PHOTO)


def test_full_workflow() -> None:
    # 0. Ensure the test photo fixture exists
    _ensure_test_photo()

    # 1. Upload a real user photo
    with TEST_PHOTO.open('rb') as f:
        upload_resp = requests.post(
            f'{BASE}/upload',
            files={'file': ('test_user_photo.png', f, 'image/png')},
            timeout=10,
        )
    print('Upload status:', upload_resp.status_code)
    upload_data = upload_resp.json()
    print('Upload response:', upload_data)
    assert upload_resp.status_code == 200, upload_data
    assert upload_data['status'] == 'uploaded'

    # 2. Process try-on with a real product
    process_resp = requests.post(
        f'{BASE}/process',
        json={'user_image': upload_data['upload_id'], 'product_id': 1},
        timeout=60,
    )
    print('Process status:', process_resp.status_code)
    process_data = process_resp.json()
    print('Process response:', process_data)
    assert process_resp.status_code == 200, process_data
    assert process_data['status'] == 'completed', process_data
    assert process_data['message'] == 'Virtual try-on generated successfully.'
    assert process_data['product_id'] == 1
    assert process_data['result_image'], 'Missing result_image'
    assert process_data['result_image'].startswith('/api/try-on/results/')

    # 3. Verify the generated result image is retrievable
    result_path = process_data['result_image']
    result_url = f'http://127.0.0.1:8000{result_path}'
    result_resp = requests.get(result_url, timeout=10)
    print('Result image status:', result_resp.status_code)
    print('Content-Type:', result_resp.headers.get('Content-Type'))
    print('Result image bytes:', len(result_resp.content))
    assert result_resp.status_code == 200
    assert result_resp.headers['Content-Type'] == 'image/jpeg'
    assert len(result_resp.content) > 1000, 'Result image is too small'

    # 4. Save the result for visual inspection
    TEST_RESULT.write_bytes(result_resp.content)
    print('Result image saved to:', TEST_RESULT)
    print()
    print('=== FULL TRY-ON WORKFLOW PASSED ===')


def test_invalid_cases() -> None:
    # Invalid product returns 404
    upload_resp = requests.post(
        f'{BASE}/upload',
        files={'file': ('test.png', TEST_PHOTO.read_bytes(), 'image/png')},
        timeout=10,
    )
    upload_id = upload_resp.json()['upload_id']

    resp = requests.post(
        f'{BASE}/process',
        json={'user_image': upload_id, 'product_id': 99999},
        timeout=10,
    )
    print('Invalid product =>', resp.status_code)
    assert resp.status_code == 404
    assert 'not found' in resp.json()['detail'].lower()

    # Missing image returns 404
    resp = requests.post(
        f'{BASE}/process',
        json={'user_image': 'a' * 32, 'product_id': 1},
        timeout=10,
    )
    print('Missing image =>', resp.status_code)
    assert resp.status_code == 404
    print('PASS invalid cases')


if __name__ == '__main__':
    test_full_workflow()
    test_invalid_cases()
    print('All real try-on workflow tests passed.')