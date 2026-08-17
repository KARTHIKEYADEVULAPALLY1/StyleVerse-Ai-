from __future__ import annotations

import re

from sqlalchemy.orm import Session

from app.models.product import Product

STYLE_CATEGORY_MAP = {
    'streetwear': {'hoodies', 'jackets', 'sneakers', 'bags', 'tops', 'outerwear', 'pants'},
    'minimalist': {'accessories', 'bags', 'pants', 'jackets', 'tops', 'outerwear'},
    'formal': {'blazers', 'jackets', 'pants', 'accessories', 'dresses'},
    'bohemian': {'dresses', 'bags', 'accessories', 'tops', 'jackets'},
    'athleisure': {'sneakers', 'tops', 'pants', 'hoodies', 'jackets'},
    'vintage': {'jackets', 'bags', 'accessories', 'sneakers', 'dresses'},
}

OCCASION_CATEGORY_MAP = {
    'casual day': {'tops', 'hoodies', 'sneakers', 'pants'},
    'office': {'blazers', 'jackets', 'pants', 'accessories'},
    'date night': {'dresses', 'blazers', 'bags', 'accessories', 'jackets'},
    'party': {'dresses', 'jackets', 'bags', 'sneakers', 'accessories'},
    'wedding': {'dresses', 'bags', 'accessories', 'blazers'},
    'travel': {'outerwear', 'sneakers', 'bags', 'jackets', 'hoodies'},
}

COLOR_ALIASES = {
    'black': {'black', 'charcoal', 'onyx', 'midnight'},
    'white': {'white', 'cream', 'ivory', 'neutral'},
    'blue': {'blue', 'navy', 'indigo', 'sky'},
    'red': {'red', 'crimson', 'wine', 'berry'},
    'brown': {'brown', 'tan', 'camel', 'beige', 'earth'},
    'neutral': {'neutral', 'grey', 'gray', 'silver', 'stone'},
}


def normalize_keyword(value: str) -> str:
    return ' '.join(re.split(r'[^a-z0-9]+', (value or '').lower())).strip()


def parse_price(product: Product) -> float:
    if product.price is None:
        return 0.0
    cleaned = ''.join(ch for ch in str(product.price) if ch.isdigit() or ch in {'.', '-'})
    return float(cleaned or 0)


def color_matches_product(product: Product, color: str) -> bool:
    if not color:
        return True

    normalized_color = normalize_keyword(color)
    matching_tokens = COLOR_ALIASES.get(normalized_color, {normalized_color})
    searchable_text = ' '.join(
        [
            product.name or '',
            product.category or '',
            product.description or '',
            *(product.colors or []),
        ]
    ).lower()
    return any(token in searchable_text for token in matching_tokens)


def generate_outfit_recommendations(
    db: Session,
    occasion: str,
    style: str,
    color: str,
    budget: float,
) -> list[Product]:
    style_key = normalize_keyword(style)
    occasion_key = normalize_keyword(occasion)
    color_key = normalize_keyword(color)

    style_categories = STYLE_CATEGORY_MAP.get(style_key, set())
    occasion_categories = OCCASION_CATEGORY_MAP.get(occasion_key, set())
    preferred_categories = style_categories | occasion_categories

    ranked_products: list[tuple[Product, int, bool]] = []

    for product in db.query(Product).order_by(Product.id.asc()).all():
        if parse_price(product) > budget:
            continue

        category_name = normalize_keyword(product.category)
        score = 0
        if category_name in style_categories:
            score += 3
        if category_name in occasion_categories:
            score += 2
        if category_name in preferred_categories:
            score += 1

        if 'dress' in normalize_keyword(product.name) and 'date night' in occasion_key:
            score += 2
        if 'sneaker' in normalize_keyword(product.name) and 'travel' in occasion_key:
            score += 1

        color_match = color_matches_product(product, color_key)
        if color_key and color_match:
            score += 2

        if score <= 0:
            continue

        ranked_products.append((product, score, color_match))

    if not ranked_products:
        return []

    ranked_products.sort(key=lambda item: (item[2], item[1]), reverse=True)
    return [product for product, _, _ in ranked_products[:3]]
