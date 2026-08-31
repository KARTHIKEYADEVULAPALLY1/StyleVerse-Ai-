from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator
from app.services.media_storage import normalize_public_image_url

from app.schemas.product_offer import ProductOfferResponse


class ProductBase(BaseModel):
    name: str
    brand: str
    category: str
    description: Optional[str] = None
    price: str
    original_price: Optional[str] = None
    rating: float = 0.0
    image: str
    store: str
    colors: Optional[List[str]] = Field(default_factory=list)
    sizes: Optional[List[str]] = Field(default_factory=list)
    subcategory: Optional[str] = None
    target_gender: Optional[str] = 'Unisex'
    styles: Optional[List[str]] = Field(default_factory=list)
    occasions: Optional[List[str]] = Field(default_factory=list)
    materials: Optional[List[str]] = Field(default_factory=list)
    seasons: Optional[List[str]] = Field(default_factory=list)
    normalized_colors: Optional[List[str]] = Field(default_factory=list)

    @field_validator('colors', 'sizes', 'styles', 'occasions', 'materials', 'seasons', 'normalized_colors', mode='before')
    @classmethod
    def coerce_none_to_list(cls, v):
        if v is None:
            return []
        return v

    @field_validator('image', mode='before')
    @classmethod
    def normalize_image_url(cls, value):
        return normalize_public_image_url(value) or ''




class ProductCreate(ProductBase):
    pass


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool = True
    # Merchant offers attached to this normalized product (additive field;
    # existing consumers simply ignore it).
    offers: List[ProductOfferResponse] = Field(default_factory=list)

    @computed_field
    @property
    def originalPrice(self) -> Optional[str]:
        return self.original_price


class PaginatedProductResponse(BaseModel):
    items: List[ProductResponse] = Field(default_factory=list)
    page: int = 1
    limit: int = 20
    total: int = 0
    has_next: bool = False
