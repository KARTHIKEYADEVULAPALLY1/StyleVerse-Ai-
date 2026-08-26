"""Normalization helpers for the multi-store ingestion pipeline.

Converts raw values coming from merchant connectors into the canonical
forms used by StyleVerse's normalized ``Product`` / ``ProductOffer`` models.
"""
from __future__ import annotations

import re
from typing import List

# ---------------------------------------------------------------------------
# Category normalization
# ---------------------------------------------------------------------------

# Maps common merchant category spellings to StyleVerse canonical categories.
# The canonical set intentionally includes the categories already used by the
# original seeded catalog so existing data and search keep working.
CATEGORY_ALIASES = {
    'sneakers': 'Sneakers',
    'sneaker': 'Sneakers',
    'shoes': 'Sneakers',
    'shoe': 'Sneakers',
    'footwear': 'Sneakers',
    'trainers': 'Sneakers',
    'hoodies': 'Hoodies',
    'hoodie': 'Hoodies',
    'sweatshirt': 'Hoodies',
    'sweatshirts': 'Hoodies',
    'jackets': 'Jackets',
    'jacket': 'Jackets',
    'outerwear': 'Outerwear',
    'coat': 'Outerwear',
    'coats': 'Outerwear',
    'tops': 'Tops',
    'top': 'Tops',
    't-shirt': 'Tops',
    'tshirt': 'Tops',
    'tee': 'Tops',
    'shirt': 'Tops',
    'shirts': 'Tops',
    'dresses': 'Dresses',
    'dress': 'Dresses',
    'pants': 'Pants',
    'trousers': 'Pants',
    'trouser': 'Pants',
    'chinos': 'Pants',
    'jeans': 'Pants',
    'blazers': 'Blazers',
    'blazer': 'Blazers',
    'bags': 'Bags',
    'bag': 'Bags',
    'handbag': 'Bags',
    'handbags': 'Bags',
    'backpack': 'Bags',
    'accessories': 'Accessories',
    'accessory': 'Accessories',
    'watch': 'Accessories',
    'watches': 'Accessories',
    'sunglasses': 'Accessories',
    'cap': 'Accessories',
    'caps': 'Accessories',
    'hat': 'Accessories',
    'hats': 'Accessories',
}


def normalize_category(raw_category: str | None) -> str:
    """Map a merchant category string onto a canonical StyleVerse category."""
    value = (raw_category or '').strip().lower()
    if not value:
        return 'Uncategorized'
    if value in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[value]
    # Fall back to Title Case of the cleaned value (e.g. "activewear" -> "Activewear").
    return value.title()


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------

def normalize_product_name(raw_name: str | None) -> str:
    """Clean a product name: collapse whitespace, drop noise, keep readable case."""
    value = (raw_name or '').strip()
    # Collapse any run of whitespace into single spaces.
    value = re.sub(r'\s+', ' ', value)
    # Drop trailing/leading separators left over after collapsing.
    return value.strip(' -–—|')


def normalized_name_tokens(name: str | None) -> List[str]:
    """Lowercase alphanumeric tokens of a product name, used for matching."""
    return [token for token in re.split(r'[^a-z0-9]+', (name or '').lower()) if token]


def normalize_brand(raw_brand: str | None) -> str:
    """Canonical brand string: trimmed, single-spaced, comparable casing."""
    value = re.sub(r'\s+', ' ', (raw_brand or '').strip())
    return value


# ---------------------------------------------------------------------------
# Currency normalization
# ---------------------------------------------------------------------------

CURRENCY_SYMBOL_MAP = {
    '₹': 'INR',
    'rs': 'INR',
    'rs.': 'INR',
    'inr': 'INR',
    '$': 'USD',
    'us$': 'USD',
    'usd': 'USD',
    '€': 'EUR',
    'eur': 'EUR',
    '£': 'GBP',
    'gbp': 'GBP',
}

CURRENCY_SYMBOLS = {'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£'}


def normalize_currency(raw_currency: str | None) -> str:
    """Normalize currency symbols/codes to ISO codes (defaults to INR)."""
    value = (raw_currency or '').strip()
    if not value:
        return 'INR'
    return CURRENCY_SYMBOL_MAP.get(value.lower(), value.upper())


def format_display_price(amount: float, currency: str) -> str:
    """Format a numeric price as the display string used on Product rows."""
    code = normalize_currency(currency)
    symbol = CURRENCY_SYMBOLS.get(code, f'{code} ')
    if code == 'INR':
        return f'{symbol}{amount:,.0f}'
    return f'{symbol}{amount:,.2f}'


# ---------------------------------------------------------------------------
# Availability normalization
# ---------------------------------------------------------------------------

IN_STOCK_VALUES = {'in_stock', 'instock', 'in stock', 'available', 'yes', 'true', '1'}
OUT_OF_STOCK_VALUES = {
    'out_of_stock', 'outofstock', 'out of stock', 'oos', 'sold out',
    'unavailable', 'no', 'false', '0',
}


def normalize_availability(raw_availability: str | None) -> str:
    """Normalize merchant availability strings to 'In Stock' / 'Out of Stock'."""
    value = (raw_availability or '').strip().lower()
    if not value:
        return 'In Stock'
    if value in IN_STOCK_VALUES:
        return 'In Stock'
    if value in OUT_OF_STOCK_VALUES:
        return 'Out of Stock'
    # Unknown values: surface them title-cased but treat non-"in stock" as out of stock
    # so price comparison never recommends an unknown-availability offer.
    return value.title() if value.startswith('in') else 'Out of Stock'


def normalize_rating(raw_rating: float | None) -> float:
    """Clamp merchant ratings into the 0..5 range used across StyleVerse."""
    try:
        value = float(raw_rating or 0.0)
    except (TypeError, ValueError):
        return 0.0
    return round(max(0.0, min(5.0, value)), 1)


def normalize_color_list(colors: List[str] | None) -> List[str]:
    """Trim and de-duplicate color names while preserving order."""
    result: List[str] = []
    for color in colors or []:
        cleaned = re.sub(r'\s+', ' ', str(color).strip())
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result


def normalize_size_list(sizes: List[str] | None) -> List[str]:
    """Trim and de-duplicate size labels while preserving order."""
    result: List[str] = []
    for size in sizes or []:
        cleaned = re.sub(r'\s+', ' ', str(size).strip())
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result