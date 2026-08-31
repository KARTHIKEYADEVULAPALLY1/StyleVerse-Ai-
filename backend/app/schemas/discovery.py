"""Response models for the multi-store discovery API."""
from __future__ import annotations

from typing import Any, List, Optional

from pydantic import BaseModel, field_validator
from app.services.media_storage import normalize_public_image_url


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
    subcategory: Optional[str] = None
    target_gender: Optional[str] = 'Unisex'
    styles: List[str] = []
    occasions: List[str] = []
    materials: List[str] = []
    seasons: List[str] = []
    normalized_colors: List[str] = []
    rating: float = 0.0
    base_price: float = 0.0
    currency: str = 'INR'
    best_offer: Optional[BestOfferResponse] = None
    # Extra context for discovery cards (additive; ignored by legacy consumers).
    offer_count: int = 0
    offers: List[Any] = []

    @field_validator('image', mode='before')
    @classmethod
    def normalize_image_url(cls, value):
        return normalize_public_image_url(value)


class DiscoveryResponse(BaseModel):
    query: str = ''
    sort: str = 'relevance'
    page: int = 1
    limit: int = 20
    total: int = 0
    has_next: bool = False
    items: List[DiscoveryProductResponse] = []
    products: List[DiscoveryProductResponse] = []
    merchants: List[str] = []
    available_filters: Optional[dict[str, List[str]]] = None

