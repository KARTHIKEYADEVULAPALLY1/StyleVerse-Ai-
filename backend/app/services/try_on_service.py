from __future__ import annotations

import os
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from app.services.media_processing import optimize_image
from app.services.media_storage import media_storage, safe_filename

BASE_DIR = Path(__file__).resolve().parents[2]
# Kept for processor compatibility. Local storage continues to use backend/uploads.
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
    expected_type = 'image/png' if extension == '.png' else 'image/jpeg'
    if normalized_type and normalized_type != expected_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Image MIME type does not match its file signature.',
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

    try:
        file_bytes, detected_extension = optimize_image(file_bytes, detected_extension)
    except ValueError:
        # Signature and declared MIME have already been verified above. Some
        # legitimate lightweight clients emit JPEGs that Pillow cannot fully
        # decode; retain the validated original rather than breaking existing
        # Try-On compatibility. Decodable uploads are still optimized.
        pass
    filename = safe_filename(detected_extension)
    upload_id = filename.rsplit('.', 1)[0]
    try:
        media_storage.save(filename, file_bytes)
    except (ValueError, OSError) as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Unable to store uploaded image.') from exc


    return {
        'upload_id': upload_id,
        'filename': filename,
        'status': 'uploaded',
    }
