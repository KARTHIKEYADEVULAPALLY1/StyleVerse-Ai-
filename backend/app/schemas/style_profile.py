from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel
from app.schemas.preferences import UserPreferencesResponse


class PriceRangeResponse(BaseModel):
    """Real, explainable price spread derived from the user's interacted products."""

    #: Lowest engaged price (INR).
    min: float
    #: Highest engaged price (INR).
    max: float
    #: Arithmetic mean of engaged prices (INR).
    average: float


class StyleProfileResponse(BaseModel):
    """A user-facing summary of real fashion preferences.

    Every field is derived from the user's *actual* activity (events, wishlist,
    cart, orders) through the same signals the recommendation engine uses. No
    preference is ever invented: cold/new users simply receive empty lists and
    ``profile_strength = 0``.
    """

    #: Top categories the user actually interacts with (ordered by signal).
    favorite_categories: List[str] = []
    #: Top brands the user actually interacts with (ordered by signal).
    favorite_brands: List[str] = []
    #: Favorite color names from the products the user interacted with.
    favorite_colors: List[str] = []
    #: Inferred style slugs validated against the user's real products.
    preferred_styles: List[str] = []
    #: {min, max, average} price spread, or ``None`` when the user has no products.
    average_price_range: Optional[PriceRangeResponse] = None
    #: Categories grouped from the user's ``product_viewed`` events.
    frequently_viewed_categories: List[str] = []
    #: Categories grouped from the user's wishlist items.
    wishlist_categories: List[str] = []
    #: Categories grouped from the user's completed orders.
    purchase_categories: List[str] = []
    #: 0-100 measure of how much useful preference data the user has generated.
    profile_strength: int = 0
    #: Explicit choices from onboarding, kept separate from behavioral signals.
    onboarding_preferences: Optional[UserPreferencesResponse] = None