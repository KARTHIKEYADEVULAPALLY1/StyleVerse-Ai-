from __future__ import annotations

from collections import Counter

from sqlalchemy.orm import Session

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.wishlist import Wishlist, WishlistItem
from app.services.event_service import get_top_interacted_products
from app.services.preference_service import get_user_preferences

#: How strongly behavior-event scores influence the final ranking relative to
#: the classic category/brand/style/price affinity score (which can reach ~8).
#: Capping keeps recommendations from depending entirely on event history.
EVENT_SCORE_INFLUENCE = 0.4
MAX_EVENT_SCORE_CONTRIBUTION = 8.0

ONBOARDING_STYLE_ALIASES = {'minimalist': 'minimal'}
ONBOARDING_OCCASION_CATEGORIES = {
    'casual_day': {'tops', 'hoodies', 'sneakers', 'pants'},
    'office': {'blazers', 'jackets', 'pants', 'accessories'},
    'date_night': {'dresses', 'blazers', 'bags', 'accessories', 'jackets'},
    'party': {'dresses', 'jackets', 'bags', 'sneakers', 'accessories'},
    'wedding': {'dresses', 'bags', 'accessories', 'blazers'},
    'travel': {'outerwear', 'sneakers', 'bags', 'jackets', 'hoodies'},
}
ONBOARDING_PALETTE_ALIASES = {
    'neutrals': {'neutral', 'grey', 'gray', 'silver', 'stone', 'white', 'black'},
    'earth_tones': {'brown', 'tan', 'camel', 'beige', 'earth', 'olive', 'cream'},
    'cool_blues': {'blue', 'navy', 'indigo', 'sky'},
    'bold_bright': {'red', 'orange', 'yellow', 'green', 'pink', 'purple'},
    'monochrome': {'black', 'white', 'gray', 'grey', 'charcoal'},
}

STYLE_KEYWORDS = {
    'formal': {'formal', 'elegant', 'dressy', 'evening', 'party', 'date', 'night', 'blazer', 'satin', 'slip'},
    'casual': {'casual', 'everyday', 'streetwear', 'college', 'simple', 'relaxed', 'daily', 'hoodie', 'tee'},
    'minimal': {'minimal', 'clean', 'plain', 'classic', 'neutral', 'simple', 'structured'},
    'minimalist': {'minimal', 'clean', 'plain', 'classic', 'neutral', 'simple', 'structured'},
    'streetwear': {'streetwear', 'oversized', 'graphic', 'hoodie', 'sneakers', 'sneaker', 'jacket', 'urban'},
    'vintage': {'vintage', 'retro', 'classic', 'leather', 'crossbody', 'thrift'},
    'bohemian': {'bohemian', 'boho', 'slip', 'silk', 'flowy', 'dress', 'cotton'},
    'winter': {'winter', 'cold', 'warm', 'wool', 'coat', 'outerwear', 'layered', 'chilly'},
    'summer': {'summer', 'light', 'bright', 'sunny', 'beach', 'tropical'},
    'athleisure': {'athleisure', 'sporty', 'active', 'workout', 'running', 'training', 'sneakers', 'sneaker', 'pants'},
    'office': {'office', 'work', 'professional', 'tailored', 'smart', 'chinos'},
    'travel': {'travel', 'commute', 'airport', 'weekend', 'lightweight', 'bag'},
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
    styles: list[str] = [s.strip().lower() for s in getattr(product, 'styles', []) or []]
    haystack = ' '.join(
        [
            product.name or '',
            product.category or '',
            product.description or '',
            ' '.join(product.colors or []),
            ' '.join(product.sizes or []),
        ]
    ).lower()
    for style_name, keywords in STYLE_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords) and style_name not in styles:
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

    # Explicit onboarding choices complement, rather than replace, behavior
    # signals. They also make cold-start recommendations immediately useful.
    preferences = get_user_preferences(db, user_id)
    if preferences and not preferences.skipped:
        # Multi-select styles
        for st in preferences.preferred_styles or []:
            norm_st = str(st).lower()
            style_counts[norm_st] += 2.0
            alias = ONBOARDING_STYLE_ALIASES.get(norm_st, norm_st)
            style_counts[alias] += 2.0

        # Multi-select categories
        for cat in preferences.preferred_categories or []:
            category_counts[cat] += 2.0

        # Multi-select brands
        for br in preferences.preferred_brands or []:
            brand_counts[br] += 2.0

        # Price preferences
        if preferences.preferred_price_min is not None and preferences.preferred_price_max is not None:
            price_values.append((preferences.preferred_price_min + preferences.preferred_price_max) / 2.0)
        elif preferences.preferred_price_max is not None:
            price_values.append(float(preferences.preferred_price_max))

        # Legacy fallback
        if preferences.style:
            style = ONBOARDING_STYLE_ALIASES.get(preferences.style.lower(), preferences.style.lower())
            if style:
                style_counts[style] += 1.0
        if preferences.occasion:
            for category in ONBOARDING_OCCASION_CATEGORIES.get(preferences.occasion, set()):
                category_counts[category] += 0.75
        if not price_values and preferences.budget:
            price_values.append(float(preferences.budget))

    # Behavior-event signal (views/wishlists/carts/purchases/merchant clicks),
    # blended in at a lighter weight so it complements - never replaces - the
    # wishlist/order affinity above.
    interacted_products = get_top_interacted_products(db, user_id)
    for product in interacted_products:
        if product.id in purchased_ids:
            continue
        category_counts[product.category] += 0.5
        brand_counts[product.brand] += 0.5
        for style in infer_styles(product):
            style_counts[style] += 0.5

    preferred_categories = {name for name, _ in category_counts.most_common(4)}
    preferred_brands = {name for name, _ in brand_counts.most_common(4)}
    preferred_styles = {name for name, _ in style_counts.most_common(5)}
    avg_price = sum(price_values) / len(price_values) if price_values else 0.0
    return preferred_categories, preferred_brands, preferred_styles, avg_price, purchased_ids


def has_similar_price(product: Product, average_price: float, tolerance: float = 0.35) -> bool:
    if average_price <= 0:
        return False
    product_price = parse_currency_value(product.price)
    delta_ratio = abs(product_price - average_price) / average_price
    return delta_ratio <= tolerance


def event_score_map(db: Session, user_id: int) -> dict[int, float]:
    """Behavior-event scores keyed by product id (empty for anonymous/cold users)."""
    from app.services.event_service import get_user_event_scores

    return {product_id: score for product_id, score in get_user_event_scores(db, user_id).items()}


def score_product(
    product: Product,
    preferred_categories: set[str],
    preferred_brands: set[str],
    preferred_styles: set[str],
    average_price: float,
    event_score: float = 0.0,
    preferred_color_palette: str | None = None,
    explicit_styles: set[str] | None = None,
    explicit_categories: set[str] | None = None,
    explicit_brands: set[str] | None = None,
    explicit_colors: set[str] | None = None,
    price_min: float | None = None,
    price_max: float | None = None,
) -> float:
    """Classic affinity score plus explicit preference signals and a bounded behavior-event bonus.

    Scoring additions:
    - Preferred style match: +3
    - Preferred category match: +3
    - Preferred brand match: +2
    - Preferred color match: +2
    - Preferred price range match: +2
    - Plus behavioral event bonus.
    """
    score = 0.0
    product_styles = {s.lower() for s in infer_styles(product)}
    product_colors = {str(color).lower().strip() for color in (product.colors or [])}
    product_price = parse_currency_value(product.price)

    # 1. Explicit Preference Signals (if set)
    if explicit_styles:
        norm_explicit_styles = {s.lower() for s in explicit_styles}
        # Include alias expansions (e.g. minimalist -> minimal)
        for s in list(norm_explicit_styles):
            if s in ONBOARDING_STYLE_ALIASES:
                norm_explicit_styles.add(ONBOARDING_STYLE_ALIASES[s])
        if product_styles & norm_explicit_styles:
            score += 3
    elif product_styles & preferred_styles:
        score += 2

    if explicit_categories:
        norm_explicit_cats = {c.lower() for c in explicit_categories}
        if (product.category or '').lower() in norm_explicit_cats:
            score += 3
    elif product.category in preferred_categories:
        score += 3

    if explicit_brands:
        norm_explicit_brands = {b.lower() for b in explicit_brands}
        if (product.brand or '').lower() in norm_explicit_brands:
            score += 2
    elif product.brand in preferred_brands:
        score += 2

    if explicit_colors:
        norm_explicit_colors = {c.lower() for c in explicit_colors}
        # Expand palette aliases if palette name is passed
        for c in list(norm_explicit_colors):
            if c in ONBOARDING_PALETTE_ALIASES:
                norm_explicit_colors.update(ONBOARDING_PALETTE_ALIASES[c])
        if product_colors & norm_explicit_colors:
            score += 2
    elif preferred_color_palette:
        palette_colors = ONBOARDING_PALETTE_ALIASES.get(preferred_color_palette.lower(), set())
        if palette_colors & product_colors:
            score += 1

    if price_min is not None or price_max is not None:
        p_min = price_min if price_min is not None else 0
        p_max = price_max if price_max is not None else float('inf')
        if p_min <= product_price <= p_max:
            score += 2
    elif has_similar_price(product, average_price):
        score += 1

    event_contribution = min(event_score * EVENT_SCORE_INFLUENCE, MAX_EVENT_SCORE_CONTRIBUTION)
    return score + event_contribution


def popular_products_fallback(db: Session, purchased_ids: set[int], limit: int) -> list[Product]:
    query = db.query(Product).order_by(Product.rating.desc(), Product.id.asc())
    if purchased_ids:
        query = query.filter(~Product.id.in_(list(purchased_ids)))
    return query.limit(limit).all()


def get_recommendations_for_user(db: Session, user_id: int, limit: int = 6) -> list[Product]:
    preferred_categories, preferred_brands, preferred_styles, average_price, purchased_ids = (
        build_signal_profile(db, user_id)
    )

    query = db.query(Product)
    if purchased_ids:
        query = query.filter(~Product.id.in_(list(purchased_ids)))
    candidates = query.all()

    # Real interaction scores
    event_scores = event_score_map(db, user_id)
    preferences = get_user_preferences(db, user_id)

    explicit_styles = None
    explicit_categories = None
    explicit_brands = None
    explicit_colors = None
    price_min = None
    price_max = None
    preferred_color_palette = None

    if preferences and not preferences.skipped:
        if preferences.preferred_styles:
            explicit_styles = set(preferences.preferred_styles)
        elif preferences.style:
            explicit_styles = {preferences.style}

        if preferences.preferred_categories:
            explicit_categories = set(preferences.preferred_categories)

        if preferences.preferred_brands:
            explicit_brands = set(preferences.preferred_brands)

        if preferences.preferred_colors:
            explicit_colors = set(preferences.preferred_colors)
        elif preferences.color_palette:
            preferred_color_palette = preferences.color_palette

        price_min = preferences.preferred_price_min
        price_max = preferences.preferred_price_max or (float(preferences.budget) if preferences.budget else None)

    has_any_signal = (
        bool(preferred_categories)
        or bool(preferred_brands)
        or bool(preferred_styles)
        or bool(explicit_styles)
        or bool(explicit_categories)
        or bool(explicit_brands)
        or bool(explicit_colors)
        or (price_max is not None)
    )

    if not has_any_signal:
        return popular_products_fallback(db, purchased_ids, limit)

    scored_products: list[tuple[Product, float]] = []
    for product in candidates:
        score = score_product(
            product,
            preferred_categories,
            preferred_brands,
            preferred_styles,
            average_price,
            event_scores.get(product.id, 0.0),
            preferred_color_palette,
            explicit_styles=explicit_styles,
            explicit_categories=explicit_categories,
            explicit_brands=explicit_brands,
            explicit_colors=explicit_colors,
            price_min=price_min,
            price_max=price_max,
        )
        if score > 0:
            scored_products.append((product, score))

    if not scored_products:
        return popular_products_fallback(db, purchased_ids, limit)

    scored_products.sort(key=lambda item: (item[1], item[0].rating), reverse=True)
    return [product for product, _ in scored_products[:limit]]

