from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.product import ProductResponse
from app.schemas.stylist import StylistRecommendationRequest, StylistRecommendationResponse
from app.services.stylist_service import generate_outfit_recommendations

router = APIRouter(prefix='/api/stylist', tags=['stylist'])


@router.post('/recommend', response_model=StylistRecommendationResponse)
def recommend_outfit(
    payload: StylistRecommendationRequest,
    db: Session = Depends(get_db),
) -> StylistRecommendationResponse:
    recommendation = generate_outfit_recommendations(
        db,
        occasion=payload.occasion,
        style=payload.style,
        color=payload.color,
        budget=payload.budget,
    )

    return StylistRecommendationResponse(
        occasion=payload.occasion,
        style=payload.style,
        color=payload.color,
        budget=payload.budget,
        recommendation=[ProductResponse.model_validate(product) for product in recommendation],
    )
