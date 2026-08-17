from __future__ import annotations

import re
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.services.product_service import get_product_by_id
from app.services.try_on_service import UPLOADS_DIR

UPLOAD_ID_PATTERN = re.compile(r'^[a-f0-9]{32}$')
SAFE_FILENAME_PATTERN = re.compile(r'^[a-f0-9]{32}\.(jpg|jpeg|png)$', re.IGNORECASE)


@dataclass(frozen=True)
class TryOnProcessInput:
    user_image_path: Path
    user_image_ref: str
    product: Product


@dataclass(frozen=True)
class TryOnProcessResult:
    status: str
    message: str
    product_id: int


class VirtualTryOnProcessor(ABC):
    """Replaceable processor contract for future virtual try-on model integrations."""

    @abstractmethod
    async def process(self, payload: TryOnProcessInput) -> TryOnProcessResult:
        raise NotImplementedError


class StubVirtualTryOnProcessor(VirtualTryOnProcessor):
    """Placeholder processor until a real virtual try-on model/API is connected."""

    async def process(self, payload: TryOnProcessInput) -> TryOnProcessResult:
        return TryOnProcessResult(
            status='processing',
            message='Virtual try-on processing has started.',
            product_id=payload.product.id,
        )


def resolve_uploaded_image_path(user_image: str) -> Path:
    reference = user_image.strip()
    if not reference:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='user_image is required.',
        )

    if any(separator in reference for separator in ('..', '/', '\\')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid user_image reference.',
        )

    candidate_names: list[str] = []

    if UPLOAD_ID_PATTERN.fullmatch(reference):
        candidate_names.extend([f'{reference}.jpg', f'{reference}.png'])
    elif SAFE_FILENAME_PATTERN.fullmatch(reference):
        normalized = reference.lower()
        candidate_names.append(normalized)
        if normalized.endswith('.jpeg'):
            candidate_names.append(normalized.replace('.jpeg', '.jpg'))
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Invalid user_image reference. Use the upload_id or stored filename from /api/try-on/upload.',
        )

    seen: set[str] = set()
    for name in candidate_names:
        if name in seen:
            continue
        seen.add(name)
        candidate_path = (UPLOADS_DIR / name).resolve()
        if candidate_path.parent != UPLOADS_DIR.resolve():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid user_image reference.',
            )
        if candidate_path.is_file():
            return candidate_path

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail='Uploaded image not found. Upload a photo before starting processing.',
    )


class VirtualTryOnService:
    def __init__(self, processor: VirtualTryOnProcessor | None = None) -> None:
        self.processor = processor or StubVirtualTryOnProcessor()

    async def start_processing(
        self,
        db: Session,
        user_image: str,
        product_id: int,
    ) -> TryOnProcessResult:
        user_image_path = resolve_uploaded_image_path(user_image)

        product = get_product_by_id(db, product_id)
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'Product with ID {product_id} not found.',
            )

        payload = TryOnProcessInput(
            user_image_path=user_image_path,
            user_image_ref=user_image.strip(),
            product=product,
        )
        return await self.processor.process(payload)


virtual_try_on_service = VirtualTryOnService()
