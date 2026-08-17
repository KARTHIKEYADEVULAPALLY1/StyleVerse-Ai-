from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.product import ProductResponse
from app.services.recommendation_service import get_recommendations_for_user

router = APIRouter(prefix='/api', tags=['recommendations'])


@router.get('/recommendations', response_model=List[ProductResponse], summary='Get personalized product recommendations')
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ProductResponse]:
    """Return product suggestions based on the current user’s wishlist and past purchases."""
    products = get_recommendations_for_user(db, current_user.id)
    return [ProductResponse.model_validate(product) for product in products]
