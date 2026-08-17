from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ProductOfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    store: str
    price: float
    currency: str
    availability: str
    rating: float


class ProductPricesResponse(BaseModel):
    product_id: int
    offers: List[ProductOfferResponse]
    best_price: Optional[float] = None
    highest_price: Optional[float] = None
    savings: Optional[float] = None
    currency: Optional[str] = None
