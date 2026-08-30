from __future__ import annotations

from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.user_preference import UserPreference
from app.schemas.preferences import (
    SUPPORTED_BRANDS_MAP,
    SUPPORTED_CATEGORIES_MAP,
    SUPPORTED_COLORS_MAP,
    SUPPORTED_STYLES_MAP,
    UserPreferencesUpdate,
)


def get_user_preferences(db: Session, user_id: int) -> UserPreference | None:
    return db.query(UserPreference).filter(UserPreference.user_id == user_id).first()


def save_user_preferences(db: Session, user_id: int, payload: UserPreferencesUpdate) -> UserPreference:
    preferences = get_user_preferences(db, user_id)
    if preferences is None:
        preferences = UserPreference(user_id=user_id)
        db.add(preferences)

    # Multi-select fields
    preferences.preferred_styles = payload.preferred_styles or []
    preferences.preferred_categories = payload.preferred_categories or []
    preferences.preferred_colors = payload.preferred_colors or []
    preferences.preferred_brands = payload.preferred_brands or []
    preferences.preferred_price_min = payload.preferred_price_min
    preferences.preferred_price_max = payload.preferred_price_max

    # Legacy fields
    preferences.style = payload.style or (preferences.preferred_styles[0].lower() if preferences.preferred_styles else None)
    preferences.occasion = payload.occasion
    preferences.color_palette = payload.color_palette or (preferences.preferred_colors[0].lower() if preferences.preferred_colors else None)
    preferences.budget = payload.budget or (int(payload.preferred_price_max) if payload.preferred_price_max else None)

    preferences.skipped = payload.skipped
    db.commit()
    db.refresh(preferences)
    return preferences


def preference_response_values(preferences: UserPreference | None) -> dict:
    if preferences is None:
        return {
            'preferred_styles': [],
            'preferred_categories': [],
            'preferred_colors': [],
            'preferred_brands': [],
            'preferred_price_min': None,
            'preferred_price_max': None,
            'style': None,
            'occasion': None,
            'color_palette': None,
            'budget': None,
            'skipped': False,
        }
    return {
        'preferred_styles': preferences.preferred_styles or ([] if not preferences.style else [preferences.style.capitalize()]),
        'preferred_categories': preferences.preferred_categories or [],
        'preferred_colors': preferences.preferred_colors or [],
        'preferred_brands': preferences.preferred_brands or [],
        'preferred_price_min': preferences.preferred_price_min,
        'preferred_price_max': preferences.preferred_price_max or (float(preferences.budget) if preferences.budget else None),
        'style': preferences.style,
        'occasion': preferences.occasion,
        'color_palette': preferences.color_palette,
        'budget': preferences.budget,
        'skipped': preferences.skipped,
    }


def get_catalog_preference_options(db: Session) -> Dict[str, Any]:
    """Return verified real catalog options available for onboarding."""
    db_categories = {p.category for p in db.query(Product.category).distinct().all() if p.category}
    db_brands = {p.brand for p in db.query(Product.brand).distinct().all() if p.brand}

    # Extract distinct colors from products
    raw_colors = db.query(Product.colors).filter(Product.colors.isnot(None)).all()
    db_colors: set[str] = set()
    for (colors_list,) in raw_colors:
        if isinstance(colors_list, list):
            for c in colors_list:
                if c:
                    db_colors.add(c.strip())

    # Fallback to catalog defaults if DB is cold
    categories = sorted(list(db_categories or SUPPORTED_CATEGORIES_MAP.values()))
    brands = sorted(list(db_brands or SUPPORTED_BRANDS_MAP.values()))
    colors = sorted(list(db_colors or ['Black', 'White', 'Navy', 'Cream', 'Olive', 'Red', 'Gray', 'Tan']))
    styles = list(SUPPORTED_STYLES_MAP.values())

    return {
        'styles': styles,
        'categories': categories,
        'brands': brands,
        'colors': colors,
        'budget_min': 500,
        'budget_max': 15000,
    }

