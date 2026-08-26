"""My Style Profile - a user-facing summary of real fashion preferences.

This service composes the EXISTING recommendation logic with the user's raw
interactions (events, wishlist, cart, orders) to produce an explainable,
deterministic style profile. It deliberately reuses:

* ``recommendation_service.build_signal_profile`` - the exact category/brand/
  style/price affinity logic the recommendation engine relies on, so the
  profile always agrees with what the user is being recommended;
* ``recommendation_service.infer_styles`` and ``parse_currency_value``;
* ``event_service.get_top_interacted_products`` - the behavior-event signals
  (view +1, wishlist +4, cart +5, purchase +8, merchant click +3).

Nothing here trains a model, mutates user data, or fabricates preferences.
A user with zero activity simply receives empty lists and ``profile_strength``
of 0 (a clean onboarding/empty state).
"""
from __future__ import annotations

from collections import Counter

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user_event import UserEvent
from app.models.wishlist import Wishlist, WishlistItem
from app.services.event_service import get_top_interacted_products
from app.services.recommendation_service import (
    build_signal_profile,
    get_user_product_history,
    infer_styles,
    parse_currency_value,
)

# ---------------------------------------------------------------------------
# profile_strength tunables (deterministic & explainable)
# ---------------------------------------------------------------------------
#: How many "preference points" of real activity map to a 100% profile.
PROFILE_STRENGTH_TARGET = 50
#: Public interaction weights (mirrors the event-service scoring table).
VIEW_WEIGHT = 1.0
WISHLIST_WEIGHT = 2.0
CART_WEIGHT = 2.0
PURCHASE_WEIGHT = 3.0
SEARCH_WEIGHT = 1.0

#: Output caps so the UI stays tidy.
MAX_CATEGORIES = 8
MAX_BRANDS = 8
MAX_STYLES = 8
MAX_COLORS = 8
MAX_PARTIAL_CATEGORIES = 6


def _get_cart_products(db: Session, user_id: int) -> list[Product]:
    return (
        db.query(Product)
        .join(CartItem, CartItem.product_id == Product.id)
        .join(Cart, Cart.id == CartItem.cart_id)
        .filter(Cart.user_id == user_id)
        .all()
    )


def _top_categories_from_events(
    db: Session, user_id: int, event_types: tuple[str, ...], limit: int
) -> list[str]:
    """Categories grouped from the user's real behavior events."""
    rows = (
        db.query(Product.category, func.count(UserEvent.id).label('n'))
        .join(Product, UserEvent.product_id == Product.id)
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.product_id.isnot(None),
            UserEvent.event_type.in_(list(event_types)),
        )
        .group_by(Product.category)
        .order_by(func.count(UserEvent.id).desc())
        .limit(limit)
        .all()
    )
    return [category for category, _ in rows]


def compute_profile_strength(db: Session, user_id: int) -> int:
    """A 0-100 score of how much useful preference data the user has generated.

    It sums *weighted real activity*: distinct products viewed, wishlist items,
    cart lines, purchased products and searches. Because it only ever counts
    rows that actually exist for this user, a brand-new user always gets 0.
    """
    distinct_views = (
        db.query(UserEvent.product_id)
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.event_type == 'product_viewed',
            UserEvent.product_id.isnot(None),
        )
        .distinct()
        .count()
    )
    searches = (
        db.query(func.count(UserEvent.id))
        .filter(UserEvent.user_id == user_id, UserEvent.event_type == 'product_searched')
        .scalar()
        or 0
    )
    wishlist_count = (
        db.query(WishlistItem)
        .join(Wishlist, Wishlist.id == WishlistItem.wishlist_id)
        .filter(Wishlist.user_id == user_id)
        .count()
    )
    cart_count = (
        db.query(CartItem)
        .join(Cart, Cart.id == CartItem.cart_id)
        .filter(Cart.user_id == user_id)
        .count()
    )
    purchase_count = (
        db.query(OrderItem)
        .join(Order, Order.id == OrderItem.order_id)
        .filter(Order.user_id == user_id)
        .distinct(OrderItem.product_id)
        .count()
    )

    raw = (
        distinct_views * VIEW_WEIGHT
        + wishlist_count * WISHLIST_WEIGHT
        + cart_count * CART_WEIGHT
        + purchase_count * PURCHASE_WEIGHT
        + searches * SEARCH_WEIGHT
    )
    return int(min(100, round(raw * 100 / PROFILE_STRENGTH_TARGET)))
def build_style_profile(db: Session, user_id: int) -> dict:
    """Assemble the full style profile from the user's real activity."""
    # The same affinity signal the recommendation engine uses.
    _, _, _, _, purchased_ids = build_signal_profile(db, user_id)

    wishlist_products, ordered_products = get_user_product_history(db, user_id)
    interacted_products = get_top_interacted_products(db, user_id)
    cart_products = _get_cart_products(db, user_id)

    # Keep a single weighted view across the different sources (matching the
    # recommendation service: wishlist/orders count fully, behavior events are
    # a lighter, complementary signal).
    category_counts: Counter[str] = Counter()
    brand_counts: Counter[str] = Counter()
    style_counts: Counter[str] = Counter()

    for product in wishlist_products:
        category_counts[product.category] += 1
        brand_counts[product.brand] += 1
        for style in infer_styles(product):
            style_counts[style] += 1

    for product in ordered_products:
        category_counts[product.category] += 1
        brand_counts[product.brand] += 1
        for style in infer_styles(product):
            style_counts[style] += 1

    for product in cart_products:
        category_counts[product.category] += 1
        brand_counts[product.brand] += 1
        for style in infer_styles(product):
            style_counts[style] += 1

    for product in interacted_products:
        if product.id in purchased_ids:
            continue
        category_counts[product.category] += 0.5
        brand_counts[product.brand] += 0.5
        for style in infer_styles(product):
            style_counts[style] += 0.5

    favorite_categories = [name for name, _ in category_counts.most_common(MAX_CATEGORIES)]
    favorite_brands = [name for name, _ in brand_counts.most_common(MAX_BRANDS)]
    preferred_styles = [name for name, _ in style_counts.most_common(MAX_STYLES)]

    # Favorite colors then price spread both read from every product the user
    # actually touched across wishlist / orders / cart / viewed events.
    all_favorite_products = _deduplicated(
        [*wishlist_products, *ordered_products, *cart_products, *interacted_products]
    )

    color_counts: Counter[str] = Counter()
    prices: list[float] = []
    for product in all_favorite_products:
        for color in product.colors or []:
            color_counts[color.strip()] += 1
        price = parse_currency_value(product.price)
        if price > 0:
            prices.append(price)

    favorite_colors = [name for name, _ in color_counts.most_common(MAX_COLORS)]

    average_price_range = None
    if prices:
        average_price_range = {
            'min': min(prices),
            'max': max(prices),
            'average': round(sum(prices) / len(prices), 2),
        }

    return {
        'favorite_categories': favorite_categories,
        'favorite_brands': favorite_brands,
        'favorite_colors': favorite_colors,
        'preferred_styles': preferred_styles,
        'average_price_range': average_price_range,
        'frequently_viewed_categories': _top_categories_from_events(
            db, user_id, ('product_viewed',), MAX_PARTIAL_CATEGORIES
        ),
        'wishlist_categories': [
            name
            for name, _ in Counter(p.category for p in wishlist_products).most_common(
                MAX_PARTIAL_CATEGORIES
            )
        ],
        'purchase_categories': [
            name
            for name, _ in Counter(p.category for p in ordered_products).most_common(
                MAX_PARTIAL_CATEGORIES
            )
        ],
        'profile_strength': compute_profile_strength(db, user_id),
    }


def _deduplicated(products: list[Product]) -> list[Product]:
    """Remove duplicate Product rows while preserving insertion order."""
    seen: set[int] = set()
    unique: list[Product] = []
    for product in products:
        if product.id in seen:
            continue
        seen.add(product.id)
        unique.append(product)
    return unique