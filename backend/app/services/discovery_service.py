"""Multi-store discovery service.

Powers ``GET /api/discovery`` - one place to search the normalized StyleVerse
catalog and see each product's best currently-available merchant offer.

Reuses the existing architecture:
  * ``search_products``      - semantic search with keyword fallback
  * ``ProductOffer``         - the single offer system (no duplication)
  * ``merchant_redirect_service`` - outbound URL resolution

An unavailable offer is never selected as the best offer.
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.product_offer import ProductOffer
from app.services.merchant_redirect_service import build_visit_path, resolve_outbound_url
from app.services.price_service import parse_currency_value
from app.services.product_service import search_products

# Canonical sort keys plus friendly aliases accepted from the frontend.
SORT_ALIASES = {
    'relevance': 'relevance',
    'price_asc': 'price_asc',
    'lowest_price': 'price_asc',
    'price_low': 'price_asc',
    'price_desc': 'price_desc',
    'highest_price': 'price_desc',
    'price_high': 'price_desc',
    'rating_desc': 'rating_desc',
    'highest_rating': 'rating_desc',
    'rating': 'rating_desc',
    'newest': 'newest',
}



def normalize_sort(sort: str | None) -> str:
    return SORT_ALIASES.get((sort or '').strip().lower(), 'relevance')


def _is_in_stock(offer: ProductOffer) -> bool:
    return bool(offer.availability) and offer.availability.lower() == 'in stock'


def _best_offer_dict(offer: ProductOffer, product_name: str) -> dict[str, Any]:
    return {
        'offer_id': offer.id,
        'merchant': offer.store,
        'merchant_name': offer.store,
        'price': offer.price,
        'currency': offer.currency,
        'availability': offer.availability,
        'rating': offer.rating,
        'product_url': resolve_outbound_url(offer, product_name),
        'visit_url': build_visit_path(offer.product_id, offer.id),
    }


def _effective_price(product: Any, offers: list[ProductOffer]) -> float:
    """Best available offer price, falling back to the catalog base price."""
    in_stock = [o for o in offers if _is_in_stock(o)]
    source = in_stock[0] if in_stock else (offers[0] if offers else None)
    return float(source.price) if source else parse_currency_value(product.price)


def discover_products(
    db: Session,
    q: str = '',
    category: str | None = None,
    brand: str | None = None,
    style: str | None = None,
    occasion: str | None = None,
    color: str | None = None,
    subcategory: str | None = None,
    season: str | None = None,
    gender: str | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    merchant: str | None = None,
    sort: str | None = 'relevance',
    page: int = 1,
    limit: int = 20,
) -> dict[str, Any]:
    """Search + aggregate multi-store discovery results with pagination and normalized metadata filters."""
    products = search_products(db, q)

    category_filter = (category or '').strip().lower()
    brand_filter = (brand or '').strip().lower()
    style_filter = (style or '').strip().lower()
    occasion_filter = (occasion or '').strip().lower()
    color_filter = (color or '').strip().lower()
    subcategory_filter = (subcategory or '').strip().lower()
    season_filter = (season or '').strip().lower()
    gender_filter = (gender or '').strip().lower()

    # Collect available filter values from all matching search products
    all_categories: set[str] = set()
    all_brands: set[str] = set()
    all_styles: set[str] = set()
    all_occasions: set[str] = set()
    all_colors: set[str] = set()
    all_seasons: set[str] = set()
    all_subcategories: set[str] = set()

    for p in products:
        if p.category:
            all_categories.add(p.category)
        if p.brand:
            all_brands.add(p.brand)
        if p.subcategory:
            all_subcategories.add(p.subcategory)
        for st in getattr(p, 'styles', []) or []:
            all_styles.add(st)
        for occ in getattr(p, 'occasions', []) or []:
            all_occasions.add(occ)
        for col in getattr(p, 'normalized_colors', []) or getattr(p, 'colors', []) or []:
            all_colors.add(col)
        for sea in getattr(p, 'seasons', []) or []:
            all_seasons.add(sea)

    filtered: list[Any] = []
    for product in products:
        if category_filter and (product.category or '').strip().lower() != category_filter:
            continue
        if brand_filter and (product.brand or '').strip().lower() != brand_filter:
            continue
        if subcategory_filter and (product.subcategory or '').strip().lower() != subcategory_filter:
            continue
        if gender_filter and (product.target_gender or '').strip().lower() != gender_filter:
            continue

        if style_filter:
            prod_styles = [s.strip().lower() for s in getattr(product, 'styles', []) or []]
            if style_filter not in prod_styles:
                continue

        if occasion_filter:
            prod_occasions = [o.strip().lower() for o in getattr(product, 'occasions', []) or []]
            if occasion_filter not in prod_occasions:
                continue

        if color_filter:
            prod_colors = [c.strip().lower() for c in (getattr(product, 'normalized_colors', []) or getattr(product, 'colors', []) or [])]
            if color_filter not in prod_colors:
                continue

        if season_filter:
            prod_seasons = [s.strip().lower() for s in getattr(product, 'seasons', []) or []]
            if season_filter not in prod_seasons and 'all season' not in prod_seasons:
                continue

        filtered.append(product)

    # Batch-load offers for every matched product in one query (ordered by
    # ascending price so the first in-stock offer is automatically the best).
    offers_by_product: dict[int, list[ProductOffer]] = {}
    product_ids = [p.id for p in filtered]
    if product_ids:
        offers = (
            db.query(ProductOffer)
            .filter(ProductOffer.product_id.in_(product_ids))
            .order_by(ProductOffer.price.asc(), ProductOffer.store.asc())
            .all()
        )
        for offer in offers:
            offers_by_product.setdefault(offer.product_id, []).append(offer)

    merchant_filter = (merchant or '').strip().lower()

    entries: list[dict[str, Any]] = []
    merchants_present: set[str] = set()

    for product in filtered:
        all_offers = offers_by_product.get(product.id, [])
        for offer in all_offers:
            if offer.store:
                merchants_present.add(offer.store)

        scoped = [
            o
            for o in all_offers
            if not merchant_filter or (o.store or '').strip().lower() == merchant_filter
        ]
        in_stock = [o for o in scoped if _is_in_stock(o)]
        best = in_stock[0] if in_stock else None  # never an unavailable offer

        effective_price = _effective_price(product, scoped)

        if min_price is not None and effective_price < min_price:
            continue
        if max_price is not None and effective_price > max_price:
            continue

        entries.append(
            {
                'id': product.id,
                'name': product.name,
                'brand': product.brand,
                'image': product.image,
                'category': product.category,
                'subcategory': getattr(product, 'subcategory', None),
                'target_gender': getattr(product, 'target_gender', 'Unisex'),
                'styles': getattr(product, 'styles', []) or [],
                'occasions': getattr(product, 'occasions', []) or [],
                'materials': getattr(product, 'materials', []) or [],
                'seasons': getattr(product, 'seasons', []) or [],
                'normalized_colors': getattr(product, 'normalized_colors', []) or getattr(product, 'colors', []) or [],
                'rating': float(product.rating or 0.0),
                'base_price': parse_currency_value(product.price),
                'currency': (best.currency if best else (scoped[0].currency if scoped else 'INR')),
                'best_offer': _best_offer_dict(best, product.name) if best else None,
                # Only count offers users can actually buy.
                'offer_count': len(in_stock),
                '_sort_price': effective_price,
            }
        )

    sort_key = normalize_sort(sort)
    if sort_key == 'price_asc':
        entries.sort(key=lambda e: (e['best_offer'] is None, e['_sort_price'], e['id']))
    elif sort_key == 'price_desc':
        entries.sort(key=lambda e: (e['best_offer'] is None, -e['_sort_price'], e['id']))
    elif sort_key == 'rating_desc':
        entries.sort(key=lambda e: (-e['rating'], e['id']))
    elif sort_key == 'newest':
        entries.sort(key=lambda e: (-e['id'],))
    # 'relevance' keeps the semantic-search ordering untouched.

    # Total results before pagination
    total_count = len(entries)
    safe_page = max(1, page)
    safe_limit = max(1, min(100, limit))
    start_index = (safe_page - 1) * safe_limit
    end_index = start_index + safe_limit
    paginated_entries = entries[start_index:end_index]
    has_next = end_index < total_count

    # Drop internal sort helpers before serialization.
    for entry in paginated_entries:
        entry.pop('_sort_price', None)

    return {
        'query': q or '',
        'sort': sort_key,
        'page': safe_page,
        'limit': safe_limit,
        'total': total_count,
        'has_next': has_next,
        'items': paginated_entries,
        'products': paginated_entries,
        'merchants': sorted(merchants_present),
        'available_filters': {
            'categories': sorted(all_categories),
            'brands': sorted(all_brands),
            'styles': sorted(all_styles),
            'occasions': sorted(all_occasions),
            'colors': sorted(all_colors),
            'seasons': sorted(all_seasons),
            'subcategories': sorted(all_subcategories),
        },
    }


