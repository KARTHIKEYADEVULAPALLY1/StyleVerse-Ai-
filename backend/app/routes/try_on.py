from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.try_on import TryOnProcessRequest, TryOnProcessResponse, TryOnUploadResponse
from app.services.try_on_service import save_try_on_upload
from app.services.virtual_try_on_service import virtual_try_on_service
from app.services.media_storage import media_storage

router = APIRouter(prefix='/api/try-on', tags=['try-on'])

RESULT_FILENAME_PATTERN = re.compile(r'^[a-f0-9]{32}\.jpg$')


@router.post('/upload', response_model=TryOnUploadResponse, summary='Upload a try-on photo')
async def upload_try_on_image(
    file: UploadFile = File(..., description='User photo for virtual try-on (JPG or PNG)'),
) -> TryOnUploadResponse:
    """Accept, validate, and store a user image for virtual try-on."""
    result = await save_try_on_upload(file)
    return TryOnUploadResponse.model_validate(result)


@router.post('/process', response_model=TryOnProcessResponse, summary='Start virtual try-on processing')
async def process_try_on(
    payload: TryOnProcessRequest,
    db: Session = Depends(get_db),
) -> TryOnProcessResponse:
    """Validate the uploaded image and product, then start virtual try-on processing."""
    result = await virtual_try_on_service.start_processing(
        db,
        user_image=payload.user_image,
        product_id=payload.product_id,
    )
    return TryOnProcessResponse(
        status=result.status,
        message=result.message,
        product_id=result.product_id,
        result_image=result.result_image,
    )


@router.get('/results/{filename}', summary='Retrieve a generated try-on result image')
async def get_try_on_result(filename: str) -> FileResponse:
    """Serve a generated try-on result image securely by filename."""
    if not RESULT_FILENAME_PATTERN.fullmatch(filename):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid result image filename.',
        )

    try:
        result_path = media_storage.get_path(f'results/{filename}')
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid result image path.')
    if not result_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Generated try-on result not found.',
        )

    return FileResponse(result_path, media_type='image/jpeg')
