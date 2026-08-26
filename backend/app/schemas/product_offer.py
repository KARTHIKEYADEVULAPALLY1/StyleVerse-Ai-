from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class ProductOfferResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Legacy fields (unchanged - price comparison UI depends on these).
    store: str
    price: float
    currency: str
    availability: str
    rating: float

    # Multi-store connector fields (additive, nullable for legacy offers).
    offer_id: Optional[int] = None
    merchant_id: Optional[int] = None
    merchant_name: Optional[str] = None
    merchant_logo: Optional[str] = None
    merchant_product_id: Optional[str] = None
    product_url: Optional[str] = None
    image_url: Optional[str] = None
    last_updated: Optional[datetime] = None
    # Derived freshness grade of this offer: fresh | aging | stale | unknown.
    freshness_status: Optional[str] = None
    # Backend redirect endpoint that forwards the user to the merchant page
    # (single place to add click tracking later without touching the UI).
    visit_url: Optional[str] = None


class ProductPricesResponse(BaseModel):
    product_id: int
    offers: List[ProductOfferResponse]
    best_price: Optional[float] = None
    highest_price: Optional[float] = None
    savings: Optional[float] = None
    currency: Optional[str] = None
    # True when the highlighted best price comes from fresh/aging offers;
    # false means the UI should ask the customer to verify availability.
    best_price_verified: bool = True