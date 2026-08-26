from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field

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
    colors: List[str] = Field(default_factory=list)
    sizes: List[str] = Field(default_factory=list)


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