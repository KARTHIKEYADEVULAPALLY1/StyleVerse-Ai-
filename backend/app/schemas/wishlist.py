from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class WishlistItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    wishlist_id: int
    product_id: int
    created_at: datetime


class WishlistMessageResponse(BaseModel):
    detail: str
