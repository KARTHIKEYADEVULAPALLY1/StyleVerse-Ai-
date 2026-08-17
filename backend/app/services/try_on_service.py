from __future__ import annotations

import os
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOADS_DIR = BASE_DIR / 'uploads'

MAX_UPLOAD_SIZE_BYTES = int(os.getenv('TRYON_MAX_UPLOAD_SIZE_BYTES', str(5 * 1024 * 1024)))
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png'}
ALLOWED_MIME_TYPES = {'image/jpeg', 'image/png'}

IMAGE_SIGNATURES = {
    'jpeg': (b'\xff\xd8\xff', '.jpg'),
    'png': (b'\x89PNG\r\n\x1a\n', '.png'),
}


def ensure_uploads_directory() -> Path:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return UPLOADS_DIR


def normalize_mime_type(content_type: str | None) -> str:
    if not content_type:
        return ''
    return content_type.split(';', 1)[0].strip().lower()


def detect_image_type(file_header: bytes) -> str | None:
    for _, (signature, extension) in IMAGE_SIGNATURES.items():
        if file_header.startswith(signature):
            return extension
    return None


def validate_declared_type(content_type: str | None, extension: str) -> None:
    normalized_type = normalize_mime_type(content_type)
    if normalized_type and normalized_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Unsupported image format. Only JPG and PNG files are allowed.',
        )
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Unsupported image format. Only JPG and PNG files are allowed.',
        )


async def save_try_on_upload(file: UploadFile) -> dict[str, str]:
    if file is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='An image file is required.',
        )

    chunks: list[bytes] = []
    total_size = 0

    while True:
        chunk = await file.read(1024 * 1024)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_UPLOAD_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f'File is too large. Maximum upload size is {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB.',
            )
        chunks.append(chunk)

    if total_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Uploaded file is empty.',
        )

    file_bytes = b''.join(chunks)
    detected_extension = detect_image_type(file_bytes[:16])
    if not detected_extension:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Unsupported image format. Only JPG and PNG files are allowed.',
        )

    validate_declared_type(file.content_type, detected_extension)

    upload_id = uuid.uuid4().hex
    filename = f'{upload_id}{detected_extension}'
    uploads_dir = ensure_uploads_directory()
    destination = uploads_dir / filename

    with destination.open('wb') as output_file:
        output_file.write(file_bytes)

    return {
        'upload_id': upload_id,
        'filename': filename,
        'status': 'uploaded',
    }
