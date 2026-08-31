from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.style_profile import StyleProfileResponse
from app.services.style_profile_service import build_style_profile

router = APIRouter(prefix='/api', tags=['style-profile'])


@router.get(
    '/style-profile',
    response_model=StyleProfileResponse,
    summary='Get the signed-in user\'s style profile',
)
def get_style_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StyleProfileResponse:
    """Return a visual summary of the user's real fashion preferences.

    Every value is derived from the user's actual activity (behavior events,
    wishlist, cart and orders) through the same logic the recommendation
    engine uses. Users with no activity receive empty lists and
    ``profile_strength`` of 0 ('just getting started') instead of fabricated
    preferences.
    """
    return StyleProfileResponse(**build_style_profile(db, current_user.id))