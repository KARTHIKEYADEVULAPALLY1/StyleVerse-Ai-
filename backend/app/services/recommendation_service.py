from __future__ import annotations

from collections import Counter

from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.wishlist import Wishlist, WishlistItem

STYLE_KEYWORDS = {
    'formal': {'formal', 'elegant', 'dressy', 'evening', 'party', 'date', 'night', 'blazer', 'satin', 'slip'},
    'casual': {'casual', 'everyday', 'streetwear', 'college', 'simple', 'relaxed', 'daily', 'hoodie', 'tee'},
    'minimal': {'minimal', 'clean', 'plain', 'classic', 'neutral', 'simple', 'structured'},
    'winter': {'winter', 'cold', 'warm', 'wool', 'coat', 'outerwear', 'layered', 'chilly'},
    'summer': {'summer', 'light', 'bright', 'sunny', 'beach', 'tropical'},
    'athleisure': {'athleisure', 'sporty', 'active', 'workout', 'running', 'training', 'sneaker'},
    'office': {'office', 'work', 'professional', 'tailored', 'smart'},
    'travel': {'travel', 'commute', 'airport', 'weekend', 'lightweight'},
}


def parse_currency_value(value: str | int | float | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = ''.join(ch for ch in str(value) if ch.isdigit() or ch in {'.', '-', ','})
    if not cleaned:
        return 0.0
    return float(cleaned.replace(',', ''))


def infer_styles(product: Product) -> list[str]:
    haystack = ' '.join(
        [
            product.name or '',
            product.category or '',
            product.description or '',
            ' '.join(product.colors or []),
            ' '.join(product.sizes or []),
        ]
    ).lower()
    styles: list[str] = []
    for style_name, keywords in STYLE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            styles.append(style_name)
    return styles or ['casual']


def get_user_product_history(db: Session, user_id: int) -> tuple[list[Product], list[Product]]:
    wishlist_products = (
        db.query(Product)
        .join(WishlistItem, Product.id == WishlistItem.product_id)
        .join(Wishlist, Wishlist.id == WishlistItem.wishlist_id)
        .filter(Wishlist.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )

    ordered_product_ids = (
        db.query(OrderItem.product_id)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.user_id == user_id)
        .distinct()
        .all()
    )
    ordered_product_ids = {product_id for (product_id,) in ordered_product_ids}
    ordered_products = db.query(Product).filter(Product.id.in_(list(ordered_product_ids))).all()
    return wishlist_products, ordered_products


def build_signal_profile(
    db: Session, user_id: int
) -> tuple[set[str], set[str], set[str], float, set[int]]:
    category_counts: Counter[str] = Counter()
    brand_counts: Counter[str] = Counter()
    style_counts: Counter[str] = Counter()
    price_values: list[float] = []
    purchased_ids: set[int] = set()

    wishlist_products, ordered_products = get_user_product_history(db, user_id)
    for product in wishlist_products:
        category_counts[product.category] += 1
        brand_counts[product.brand] += 1
        for style in infer_styles(product):
            style_counts[style] += 1
        price_values.append(parse_currency_value(product.price))

    for product in ordered_products:
        category_counts[product.category] += 1
        brand_counts[product.brand] += 1
        for style in infer_styles(product):
            style_counts[style] += 1
        price_values.append(parse_currency_value(product.price))
        purchased_ids.add(product.id)

    preferred_categories = {name for name, _ in category_counts.most_common(3)}
    preferred_brands = {name for name, _ in brand_counts.most_common(3)}
    preferred_styles = {name for name, _ in style_counts.most_common(4)}
    avg_price = sum(price_values) / len(price_values) if price_values else 0.0
    return preferred_categories, preferred_brands, preferred_styles, avg_price, purchased_ids


def has_similar_price(product: Product, average_price: float, tolerance: float = 0.35) -> bool:
    if average_price <= 0:
        return False
    product_price = parse_currency_value(product.price)
    delta_ratio = abs(product_price - average_price) / average_price
    return delta_ratio <= tolerance


def score_product(
    product: Product,
    preferred_categories: set[str],
    preferred_brands: set[str],
    preferred_styles: set[str],
    average_price: float,
) -> float:
    score = 0.0
    if product.category in preferred_categories:
        score += 3
    if product.brand in preferred_brands:
        score += 2
    product_styles = set(infer_styles(product))
    if product_styles & preferred_styles:
        score += 2
    if has_similar_price(product, average_price):
        score += 1
    return score


def popular_products_fallback(db: Session, purchased_ids: set[int], limit: int) -> list[Product]:
    query = db.query(Product).order_by(Product.rating.desc(), Product.id.asc())
    if purchased_ids:
        query = query.filter(~Product.id.in_(list(purchased_ids)))
    return query.limit(limit).all()


def get_recommendations_for_user(db: Session, user_id: int, limit: int = 6) -> list[Product]:
    preferred_categories, preferred_brands, preferred_styles, average_price, purchased_ids = (
        build_signal_profile(db, user_id)
    )

    if not preferred_categories and not preferred_brands and not preferred_styles:
        return popular_products_fallback(db, purchased_ids, limit)

    query = db.query(Product)
    if purchased_ids:
        query = query.filter(~Product.id.in_(list(purchased_ids)))
    candidates = query.all()

    scored_products: list[tuple[Product, float]] = []
    for product in candidates:
        score = score_product(
            product,
            preferred_categories,
            preferred_brands,
            preferred_styles,
            average_price,
        )
        if score > 0:
            scored_products.append((product, score))

    if not scored_products:
        return popular_products_fallback(db, purchased_ids, limit)

    scored_products.sort(key=lambda item: (item[1], item[0].rating), reverse=True)
    return [product for product, _ in scored_products[:limit]]
