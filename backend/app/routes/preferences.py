from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.preferences import UserPreferencesResponse, UserPreferencesUpdate
from app.services.preference_service import (
    get_catalog_preference_options,
    get_user_preferences,
    save_user_preferences,
)

router = APIRouter(prefix='/api/preferences', tags=['preferences'])


@router.get('/options', response_model=Dict[str, Any], summary='Get supported options for style onboarding')
def get_options(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Retrieve actual catalog brands, categories, colors, and styles."""
    return get_catalog_preference_options(db)


@router.get('', response_model=UserPreferencesResponse)
def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreferencesResponse:
    preferences = get_user_preferences(db, current_user.id)
    if preferences is None:
        return UserPreferencesResponse()
    return UserPreferencesResponse.model_validate(preferences)


@router.put('', response_model=UserPreferencesResponse)
def update_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreferencesResponse:
    saved = save_user_preferences(db, current_user.id, payload)
    return UserPreferencesResponse.model_validate(saved)


@router.post('', response_model=UserPreferencesResponse, status_code=status.HTTP_201_CREATED)
def create_preferences(
    payload: UserPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserPreferencesResponse:
    # POST is kept as a friendly alias for clients that model onboarding as creation.
    saved = save_user_preferences(db, current_user.id, payload)
    return UserPreferencesResponse.model_validate(saved)

