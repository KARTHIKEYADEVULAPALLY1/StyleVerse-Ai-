"""Normalized product ingestion schema.

Every future connector (Amazon, Myntra, Ajio, Shopify, merchant feeds, ...)
must produce ``ExternalProduct`` records. This schema is intentionally kept
separate from the SQLAlchemy database models: it is the stable contract
between connectors and the normalization/ingestion layer.
"""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ExternalProduct(BaseModel):
    """A single product as reported by an external merchant source."""

    merchant: str = Field(..., description='Merchant slug this product came from, e.g. "amazon".')
    external_product_id: str = Field(
        ...,
        min_length=1,
        description="The merchant's own unique product identifier (preserved as-is).",
    )
    name: str = Field(..., min_length=1)
    brand: str = ''
    category: str = ''
    description: Optional[str] = None
    price: float = Field(..., ge=0)
    currency: str = 'INR'
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    availability: str = 'in_stock'
    rating: float = 0.0
    colors: List[str] = Field(default_factory=list)
    sizes: List[str] = Field(default_factory=list)


class ExternalProductPage(BaseModel):
    """Optional envelope some connectors may use for paginated sources."""

    merchant: str
    page: int = 0
    has_next: bool = False
    products: List[ExternalProduct] = Field(default_factory=list)