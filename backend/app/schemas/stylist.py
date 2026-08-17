from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.product import ProductResponse


class StylistRecommendationRequest(BaseModel):
    occasion: str = Field(..., min_length=2, max_length=60)
    style: str = Field(..., min_length=2, max_length=60)
    color: str = Field(..., min_length=2, max_length=30)
    budget: float = Field(..., gt=0)


class StylistRecommendationResponse(BaseModel):
    occasion: str
    style: str
    color: str
    budget: float
    recommendation: list[ProductResponse] = Field(default_factory=list)
