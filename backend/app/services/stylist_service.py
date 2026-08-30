from __future__ import annotations

import re
from typing import List, Set

from sqlalchemy.orm import Session

from app.models.product import Product
from app.services.normalization_service import (
    normalize_color_name,
    normalize_occasion_name,
    normalize_style_name,
)

STYLE_CATEGORY_MAP = {
    'streetwear': {'hoodies', 'jackets', 'sneakers', 'bags', 'tops', 'outerwear', 'pants'},
    'minimalist': {'accessories', 'bags', 'pants', 'jackets', 'tops', 'outerwear', 'blazers'},
    'formal': {'blazers', 'jackets', 'pants', 'accessories', 'dresses', 'outerwear'},
    'bohemian': {'dresses', 'bags', 'accessories', 'tops', 'jackets'},
    'athleisure': {'sneakers', 'tops', 'pants', 'hoodies', 'jackets'},
    'vintage': {'jackets', 'bags', 'accessories', 'sneakers', 'dresses'},
}

OCCASION_CATEGORY_MAP = {
    'casual day': {'tops', 'hoodies', 'sneakers', 'pants', 'jackets', 'bags'},
    'office': {'blazers', 'jackets', 'pants', 'accessories', 'outerwear'},
    'date night': {'dresses', 'blazers', 'bags', 'accessories', 'jackets'},
    'party': {'dresses', 'jackets', 'bags', 'sneakers', 'accessories', 'blazers'},
    'wedding': {'dresses', 'bags', 'accessories', 'blazers'},
    'travel': {'outerwear', 'sneakers', 'bags', 'jackets', 'hoodies', 'pants'},
}

COLOR_ALIASES = {
    'black': {'black', 'charcoal', 'onyx', 'midnight', 'dark charcoal'},
    'white': {'white', 'cream', 'ivory', 'neutral', 'off white'},
    'blue': {'blue', 'navy', 'indigo', 'sky', 'midnight blue'},
    'red': {'red', 'crimson', 'wine', 'berry', 'ruby'},
    'brown': {'brown', 'tan', 'camel', 'beige', 'earth', 'espresso'},
    'neutral': {'neutral', 'grey', 'gray', 'silver', 'stone', 'cream', 'tan', 'charcoal', 'white', 'black'},
}

ROLE_CATEGORIES = {
    'top': {'tops', 'hoodies', 'shirts', 'blouses', 'outerwear', 'jackets', 'blazers', 'dresses'},
    'bottom': {'pants', 'trousers', 'jeans', 'skirts', 'shorts'},
    'shoes': {'shoes', 'footwear', 'sneakers', 'boots', 'sandals', 'heels'},
    'accessory': {'accessories', 'bags', 'jewelry', 'watches'},
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
    
    # Check normalized colors array first
    prod_norm_colors = [c.lower() for c in (getattr(product, 'normalized_colors', []) or getattr(product, 'colors', []) or [])]
    for token in matching_tokens:
        if token in prod_norm_colors or any(token in c for c in prod_norm_colors):
            return True

    searchable_text = ' '.join(
        [
            product.name or '',
            product.category or '',
            product.description or '',
            *(product.colors or []),
        ]
    ).lower()
    return any(token in searchable_text for token in matching_tokens)


def _score_product_for_stylist(
    product: Product,
    style_key: str,
    occasion_key: str,
    color_key: str,
    style_categories: Set[str],
    occasion_categories: Set[str],
) -> tuple[int, bool]:
    """Score a product with rich normalized metadata and semantic categories."""
    score = 0
    
    # 1. Direct match on normalized styles
    canonical_style = normalize_style_name(style_key)
    prod_styles = [s.strip().lower() for s in getattr(product, 'styles', []) or []]
    if style_key in prod_styles or (canonical_style and canonical_style.lower() in prod_styles):
        score += 5

    # 2. Direct match on normalized occasions
    canonical_occasion = normalize_occasion_name(occasion_key)
    prod_occasions = [o.strip().lower() for o in getattr(product, 'occasions', []) or []]
    if occasion_key in prod_occasions or (canonical_occasion and canonical_occasion.lower() in prod_occasions):
        score += 5

    # 3. Category match
    category_name = normalize_keyword(product.category)
    if category_name in style_categories:
        score += 3
    if category_name in occasion_categories:
        score += 3

    # 4. Color match
    color_match = color_matches_product(product, color_key)
    if color_key and color_match:
        score += 4

    # 5. Semantic keyword bonus
    name_lower = (product.name or '').lower()
    if 'dress' in name_lower and 'date night' in occasion_key:
        score += 2
    if 'blazer' in name_lower and ('office' in occasion_key or 'formal' in style_key):
        score += 3
    if 'sneaker' in name_lower and ('travel' in occasion_key or 'athleisure' in style_key):
        score += 2

    return score, color_match


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

    ranked_products: list[tuple[Product, int, bool]] = []

    for product in db.query(Product).filter(Product.is_active.is_(True)).order_by(Product.id.asc()).all():
        if parse_price(product) > budget:
            continue

        score, color_match = _score_product_for_stylist(
            product,
            style_key,
            occasion_key,
            color_key,
            style_categories,
            occasion_categories,
        )

        if score <= 0:
            continue

        ranked_products.append((product, score, color_match))

    if not ranked_products:
        return []

    ranked_products.sort(key=lambda item: (item[2], item[1], -parse_price(item[0])), reverse=True)
    return [product for product, _, _ in ranked_products[:3]]


def generate_outfit(
    db: Session,
    occasion: str,
    style: str,
    color: str,
    budget: float,
) -> list[tuple[str, Product]]:
    """Choose at most one catalog product for each outfit role within the total budget."""
    style_key = normalize_keyword(style)
    occasion_key = normalize_keyword(occasion)
    color_key = normalize_keyword(color)
    style_categories = STYLE_CATEGORY_MAP.get(style_key, set())
    occasion_categories = OCCASION_CATEGORY_MAP.get(occasion_key, set())
    
    candidates: dict[str, list[tuple[Product, int]]] = {role: [] for role in ROLE_CATEGORIES}
    
    for product in db.query(Product).filter(Product.is_active.is_(True)).order_by(Product.id.asc()).all():
        price = parse_price(product)
        if price > budget:
            continue
        category = normalize_keyword(product.category)
        roles = [role for role, categories in ROLE_CATEGORIES.items() if category in categories]
        if not roles:
            continue
        
        score, _ = _score_product_for_stylist(
            product,
            style_key,
            occasion_key,
            color_key,
            style_categories,
            occasion_categories,
        )
        
        for role in roles:
            candidates[role].append((product, score))
            
    for values in candidates.values():
        values.sort(key=lambda item: (item[1], -parse_price(item[0])), reverse=True)

    best: list[tuple[str, Product]] = []
    roles = list(ROLE_CATEGORIES)
    def search(index: int, total: float, chosen: list[tuple[str, Product]]) -> None:
        nonlocal best
        if len(chosen) > len(best) or (
            len(chosen) == len(best)
            and total < sum(parse_price(product) for _, product in best)
        ):
            best = chosen.copy()
        if index == len(roles):
            return
        role = roles[index]
        search(index + 1, total, chosen)
        for product, _ in candidates[role]:
            price = parse_price(product)
            if total + price <= budget and all(existing.id != product.id for _, existing in chosen):
                search(index + 1, total + price, chosen + [(role, product)])
    search(0, 0, [])
    return best

