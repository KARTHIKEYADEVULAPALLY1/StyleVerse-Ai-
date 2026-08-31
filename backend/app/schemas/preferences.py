from __future__ import annotations

from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field, computed_field, field_validator, model_validator

# Canonical supported sets
SUPPORTED_STYLES_MAP = {
    'minimalist': 'Minimalist',
    'formal': 'Formal',
    'streetwear': 'Streetwear',
    'vintage': 'Vintage',
    'bohemian': 'Bohemian',
    'athleisure': 'Athleisure',
}

SUPPORTED_CATEGORIES_MAP = {
    'hoodies': 'Hoodies',
    'sneakers': 'Sneakers',
    'jackets': 'Jackets',
    'accessories': 'Accessories',
    'pants': 'Pants',
    'bags': 'Bags',
    'tops': 'Tops',
    'dresses': 'Dresses',
    'outerwear': 'Outerwear',
    'blazers': 'Blazers',
}

SUPPORTED_COLORS_MAP = {
    'black': 'Black',
    'gray': 'Gray',
    'grey': 'Gray',
    'cream': 'Cream',
    'white': 'White',
    'off white': 'Off White',
    'olive': 'Olive',
    'stone': 'Stone',
    'silver': 'Silver',
    'gold': 'Gold',
    'sand': 'Sand',
    'navy': 'Navy',
    'charcoal': 'Charcoal',
    'tan': 'Tan',
    'espresso': 'Espresso',
    'wine': 'Wine',
    'champagne': 'Champagne',
    'camel': 'Camel',
    'red': 'Red',
    'orange': 'Orange',
    'yellow': 'Yellow',
    'green': 'Green',
    'pink': 'Pink',
    'purple': 'Purple',
    'blue': 'Blue',
    'brown': 'Brown',
    'neutral': 'Neutral',
    'neutrals': 'Neutrals',
    'earth tones': 'Earth Tones',
    'earth_tones': 'Earth Tones',
    'cool blues': 'Cool Blues',
    'cool_blues': 'Cool Blues',
    'bold bright': 'Bold & Bright',
    'bold_bright': 'Bold & Bright',
    'bold & bright': 'Bold & Bright',
    'monochrome': 'Monochrome',
}

SUPPORTED_BRANDS_MAP = {
    # Core fashion brands
    'h&m': 'H&M',
    'nike': 'Nike',
    'zara': 'Zara',
    'daniel wellington': 'Daniel Wellington',
    'uniqlo': 'Uniqlo',
    'fossil': 'Fossil',
    'mango': 'Mango',
    'levis': 'Levi\'s',
    'levi\'s': 'Levi\'s',
    'adidas': 'Adidas',
    'gucci': 'Gucci',
    # Extended catalog brands
    'puma': 'Puma',
    'ray-ban': 'Ray-Ban',
    'rayban': 'Ray-Ban',
    'converse': 'Converse',
    'vero moda': 'Vero Moda',
    'veromoda': 'Vero Moda',
    'northpeak': 'Northpeak',
}

# Legacy literals for backward compatibility
StylePreference = Literal['streetwear', 'minimalist', 'formal', 'bohemian', 'athleisure', 'vintage']
OccasionPreference = Literal['casual_day', 'office', 'date_night', 'party', 'wedding', 'travel']
ColorPalettePreference = Literal['neutrals', 'earth_tones', 'cool_blues', 'bold_bright', 'monochrome']


class UserPreferencesUpdate(BaseModel):
    """Update payload for user fashion preferences.

    Accepts multi-select preferences (preferred_styles, preferred_categories,
    preferred_colors, preferred_brands, preferred_price_min, preferred_price_max)
    or a deliberate ``skipped=True``.
    """

    preferred_styles: Optional[List[str]] = None
    preferred_categories: Optional[List[str]] = None
    preferred_colors: Optional[List[str]] = None
    preferred_brands: Optional[List[str]] = None
    preferred_price_min: Optional[float] = Field(default=None, ge=0)
    preferred_price_max: Optional[float] = Field(default=None, ge=0)

    # Legacy fields
    style: Optional[str] = None
    occasion: Optional[str] = None
    color_palette: Optional[str] = None
    budget: Optional[int] = None

    skipped: bool = False

    @field_validator('preferred_styles', mode='before')
    @classmethod
    def validate_styles(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        cleaned = []
        for item in v:
            key = str(item).strip().lower()
            if key not in SUPPORTED_STYLES_MAP:
                raise ValueError(f"Unsupported style '{item}'. Supported styles: {list(SUPPORTED_STYLES_MAP.values())}")
            cleaned.append(SUPPORTED_STYLES_MAP[key])
        return list(dict.fromkeys(cleaned))

    @field_validator('preferred_categories', mode='before')
    @classmethod
    def validate_categories(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        cleaned = []
        for item in v:
            key = str(item).strip().lower()
            if key not in SUPPORTED_CATEGORIES_MAP:
                raise ValueError(f"Unsupported category '{item}'. Supported categories: {list(SUPPORTED_CATEGORIES_MAP.values())}")
            cleaned.append(SUPPORTED_CATEGORIES_MAP[key])
        return list(dict.fromkeys(cleaned))

    @field_validator('preferred_colors', mode='before')
    @classmethod
    def validate_colors(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        cleaned = []
        for item in v:
            key = str(item).strip().lower()
            if key not in SUPPORTED_COLORS_MAP:
                raise ValueError(f"Unsupported color '{item}'. Supported colors: {list(SUPPORTED_COLORS_MAP.values())}")
            cleaned.append(SUPPORTED_COLORS_MAP[key])
        return list(dict.fromkeys(cleaned))

    @field_validator('preferred_brands', mode='before')
    @classmethod
    def validate_brands(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return v
        cleaned = []
        for item in v:
            key = str(item).strip().lower()
            if key not in SUPPORTED_BRANDS_MAP:
                raise ValueError(f"Unsupported brand '{item}'. Supported brands: {list(SUPPORTED_BRANDS_MAP.values())}")
            cleaned.append(SUPPORTED_BRANDS_MAP[key])
        return list(dict.fromkeys(cleaned))

    @model_validator(mode='after')
    def validate_preference_logic(self) -> 'UserPreferencesUpdate':
        # Price range sanity
        if self.preferred_price_min is not None and self.preferred_price_max is not None:
            if self.preferred_price_min > self.preferred_price_max:
                raise ValueError('preferred_price_min cannot be greater than preferred_price_max')

        # Legacy style validation
        if self.style is not None:
            key = str(self.style).strip().lower()
            if key not in SUPPORTED_STYLES_MAP:
                raise ValueError(f"Unsupported style '{self.style}'.")
            if not self.preferred_styles:
                self.preferred_styles = [SUPPORTED_STYLES_MAP[key]]

        # Legacy occasion validation
        if self.occasion is not None:
            valid_occasions = {'casual_day', 'casual day', 'office', 'date_night', 'date night', 'party', 'wedding', 'travel'}
            if self.occasion.strip().lower().replace(' ', '_') not in {'casual_day', 'office', 'date_night', 'party', 'wedding', 'travel'}:
                raise ValueError(f"Unsupported occasion '{self.occasion}'.")

        # Legacy color_palette validation
        if self.color_palette is not None:
            valid_palettes = {'neutrals', 'earth_tones', 'cool_blues', 'bold_bright', 'monochrome'}
            if self.color_palette.strip().lower().replace(' ', '_').replace('&_', '') not in valid_palettes:
                raise ValueError(f"Unsupported color palette '{self.color_palette}'.")

        # Legacy budget validation
        if self.budget is not None:
            if self.budget < 1000 or self.budget > 10000:
                raise ValueError('Budget must be between 1000 and 10000.')
            if self.preferred_price_max is None:
                self.preferred_price_max = float(self.budget)

        if self.skipped:
            has_explicit = any(
                [
                    bool(self.preferred_styles),
                    bool(self.preferred_categories),
                    bool(self.preferred_colors),
                    bool(self.preferred_brands),
                    self.preferred_price_min is not None,
                    self.preferred_price_max is not None,
                    self.style is not None,
                    self.occasion is not None,
                    self.color_palette is not None,
                    self.budget is not None,
                ]
            )
            if has_explicit:
                raise ValueError('Skipped onboarding cannot include preference values.')

        return self


class UserPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    preferred_styles: List[str] = []
    preferred_categories: List[str] = []
    preferred_colors: List[str] = []
    preferred_brands: List[str] = []
    preferred_price_min: Optional[float] = None
    preferred_price_max: Optional[float] = None

    # Legacy fields
    style: Optional[str] = None
    occasion: Optional[str] = None
    color_palette: Optional[str] = None
    budget: Optional[int] = None

    skipped: bool = False

    @computed_field
    @property
    def completed(self) -> bool:
        if self.skipped:
            return False
        # Completed if any multi-select preference list or price range is set
        has_new_preferences = bool(
            self.preferred_styles
            or self.preferred_categories
            or self.preferred_colors
            or self.preferred_brands
            or self.preferred_price_min is not None
            or self.preferred_price_max is not None
        )
        has_legacy_preferences = all(
            value is not None for value in (self.style, self.occasion, self.color_palette, self.budget)
        )
        return has_new_preferences or has_legacy_preferences

