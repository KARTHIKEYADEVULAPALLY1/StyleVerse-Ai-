from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductResponse


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)
    selected_size: str = Field(default='One Size', min_length=1, max_length=50)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., gt=0)
    selected_size: str | None = Field(default=None, min_length=1, max_length=50)


class CartItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cart_id: int
    product_id: int
    quantity: int
    selected_size: str
    created_at: datetime
    updated_at: datetime
    product: ProductResponse


class CartMessageResponse(BaseModel):
    detail: str
