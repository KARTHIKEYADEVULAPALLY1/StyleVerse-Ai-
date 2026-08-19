from __future__ import annotations

import os
import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.services.image_compositor import compose_try_on
from app.services.product_service import get_product_by_id
from app.services.try_on_service import UPLOADS_DIR

UPLOAD_ID_PATTERN = re.compile(r'^[a-f0-9]{32}$')
SAFE_FILENAME_PATTERN = re.compile(r'^[a-f0-9]{32}\.(jpg|jpeg|png)$', re.IGNORECASE)

BASE_DIR = Path(__file__).resolve().parents[2]
RESULTS_DIR = BASE_DIR / 'results'
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# When set to "stub", the service uses the placeholder processor.
# When unset or set to "composite", the real image-compositing processor is used.
TRYON_PROCESSOR_MODE = os.getenv('TRYON_PROCESSOR_MODE', 'composite').strip().lower()


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
    result_image: str | None = None


class VirtualTryOnProcessor(ABC):
    """Replaceable processor contract for virtual try-on model integrations."""

    @abstractmethod
    async def process(self, payload: TryOnProcessInput) -> TryOnProcessResult:
        raise NotImplementedError


class StubVirtualTryOnProcessor(VirtualTryOnProcessor):
    """Placeholder processor used when TRYON_PROCESSOR_MODE=stub."""

    async def process(self, payload: TryOnProcessInput) -> TryOnProcessResult:
        return TryOnProcessResult(
            status='processing',
            message='Virtual try-on processing has started.',
            product_id=payload.product.id,
        )


class CompositeVirtualTryOnProcessor(VirtualTryOnProcessor):
    """Real processor that composites the selected garment onto the user photo.

    The processor:
      1. Receives the user image path, the selected product, and the product
         image URL from the catalog.
      2. Downloads the product image.
      3. Composites the garment onto the user photo using Pillow.
      4. Saves the generated image under the results directory.
      5. Returns a response containing a secure API path to the result image.
    """

    async def process(self, payload: TryOnProcessInput) -> TryOnProcessResult:
        product = payload.product
        if not product.image:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail='Selected product does not have a catalog image.',
            )

        result_id = uuid.uuid4().hex
        output_filename = f'{result_id}.jpg'
        output_path = RESULTS_DIR / output_filename

        try:
            compose_try_on(
                user_image_path=payload.user_image_path,
                product_image_url=product.image,
                product_name=product.name,
                output_path=output_path,
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f'Virtual try-on generation failed: {exc}',
            ) from exc

        return TryOnProcessResult(
            status='completed',
            message='Virtual try-on generated successfully.',
            product_id=product.id,
            result_image=f'/api/try-on/results/{output_filename}',
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


def _build_processor() -> VirtualTryOnProcessor:
    if TRYON_PROCESSOR_MODE == 'stub':
        return StubVirtualTryOnProcessor()
    return CompositeVirtualTryOnProcessor()


class VirtualTryOnService:
    def __init__(self, processor: VirtualTryOnProcessor | None = None) -> None:
        self.processor = processor or _build_processor()

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