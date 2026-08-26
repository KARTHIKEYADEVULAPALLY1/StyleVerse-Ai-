"""Response models for the multi-store discovery API."""
from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel


class BestOfferResponse(BaseModel):
    offer_id: Optional[int] = None
    merchant: str
    merchant_name: str
    price: float
    currency: str = 'INR'
    availability: str
    rating: float = 0.0
    product_url: Optional[str] = None
    visit_url: Optional[str] = None


class DiscoveryProductResponse(BaseModel):
    id: int
    name: str
    brand: str
    image: Optional[str] = None
    category: Optional[str] = None
    rating: float = 0.0
    base_price: float = 0.0
    currency: str = 'INR'
    best_offer: Optional[BestOfferResponse] = None
    # Extra context for discovery cards (additive; ignored by legacy consumers).
    offer_count: int = 0
    offers: List[Any] = []


class DiscoveryResponse(BaseModel):
    query: str = ''
    sort: str = 'relevance'
    merchants: List[str] = []
    total: int = 0
    products: List[DiscoveryProductResponse] = []
