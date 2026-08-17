from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order_id: int
    product_id: int
    product_name: str
    quantity: int
    selected_size: str
    price_at_purchase: str
    created_at: datetime


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    total_amount: str
    status: str
    created_at: datetime
    items: list[OrderItemResponse]
