from __future__ import annotations

from pydantic import BaseModel, Field


class TryOnUploadResponse(BaseModel):
    upload_id: str
    filename: str
    status: str


class TryOnProcessRequest(BaseModel):
    user_image: str = Field(..., min_length=1, description='Upload ID or stored filename from /api/try-on/upload')
    product_id: int = Field(..., gt=0, description='Existing product ID from the catalog')


class TryOnProcessResponse(BaseModel):
    status: str
    message: str
    product_id: int
