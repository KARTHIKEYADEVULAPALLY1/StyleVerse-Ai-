from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.try_on import TryOnProcessRequest, TryOnProcessResponse, TryOnUploadResponse
from app.services.try_on_service import save_try_on_upload
from app.services.virtual_try_on_service import virtual_try_on_service

router = APIRouter(prefix='/api/try-on', tags=['try-on'])


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
    )