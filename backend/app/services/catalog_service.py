"""Product catalog data-quality analysis.

Read-only inspection layer over the existing Product / Merchant / ProductOffer
architecture. It never mutates catalog data - administrators use it to detect
duplicates, missing data, unavailable offers, stale offers, and incomplete
records before deciding on manual action.

Quality rules
-------------
Per product:
  * ``missing_image``         - no image URL stored
  * ``missing_price``         - base price missing/unparsable
  * ``missing_category``      - no category recorded
  * ``no_active_offers``      - zero currently-available (in stock) offers
  * ``stale_offers``          - one or more offers older than the configured
                                freshness threshold (``OFFER_FRESHNESS_DAYS``
                                env var, default 7 days)
  * ``missing_merchant_url``  - one or more offers without a product URL
  * ``potential_duplicate``   - same normalized brand + name + category

Severity: healthy < warning < critical. Missing data and catalog-integrity
issues are critical; presentation-level gaps (image) and freshness are
warnings. Nothing is ever deleted or merged automatically.
"""
from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.merchant_sync import MerchantSync  # noqa: F401 - keeps metadata complete
from app.models.product import Product
from app.models.product_offer import ProductOffer
from app.services.price_service import parse_currency_value

# Configurable offer freshness threshold (days). Not hardcoded arbitrarily:
# operators can tune it per environment via OFFER_FRESHNESS_DAYS.
DEFAULT_FRESHNESS_DAYS = 7


def get_freshness_days() -> int:
    raw = os.getenv('OFFER_FRESHNESS_DAYS', str(DEFAULT_FRESHNESS_DAYS))
    try:
        value = int(raw)
    except ValueError:
        return DEFAULT_FRESHNESS_DAYS
    # 0 is allowed deliberately: every offer older than "now" counts as
    # stale, which is handy for testing/verifying the freshness rules.
    return max(0, value)


def _normalize_text(value: Optional[str]) -> str:
    return re.sub(r'[^a-z0-9]+', ' ', (value or '').lower()).strip()


def _is_available(offer: ProductOffer) -> bool:
    return bool(offer.availability) and offer.availability.lower() == 'in stock'


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _offer_analysis(offer: ProductOffer, now: datetime, freshness_days: int) -> dict[str, Any]:
    """Quality facts for a single merchant offer."""
    warnings: list[str] = []
    is_stale = False
    if offer.last_updated is not None:
        age = now - offer.last_updated
        if age > timedelta(days=freshness_days):
            is_stale = True
            warnings.append(
                f'Stale: last updated {age.days} day(s) ago (freshness threshold {freshness_days}d).'
            )
    has_url = bool(offer.product_url)
    if not has_url:
        warnings.append('Missing merchant product URL.')

    return {
        'offer_id': offer.id,
        'merchant_id': offer.merchant_id,
        'merchant_name': offer.store,
        'price': offer.price,
        'currency': offer.currency,
        'availability': offer.availability,
        'rating': offer.rating,
        'product_url': offer.product_url,
        'image_url': offer.image_url,
        'last_updated': offer.last_updated,
        'is_stale': is_stale,
        'is_available': _is_available(offer),
        'has_url': has_url,
        'warnings': warnings,
    }


def analyze_product(
    product: Product,
    offers: list[ProductOffer],
    now: datetime,
    freshness_days: int,
    duplicate_of: Optional[list[int]] = None,
) -> dict[str, Any]:
    """Run every quality rule for one product and compute its status."""
    issues: set[str] = set()
    warnings: list[str] = []

    has_image = bool(product.image)
    base_price = parse_currency_value(product.price)
    category = (product.category or '').strip()

    offer_rows = [_offer_analysis(offer, now, freshness_days) for offer in offers]
    active_offers = [row for row in offer_rows if row['is_available']]
    stale_count = sum(1 for row in offer_rows if row['is_stale'])
    missing_url_count = sum(1 for row in offer_rows if not row['has_url'])
    last_updated = max((row['last_updated'] for row in offer_rows if row['last_updated']), default=None)

    if not has_image:
        issues.add('missing_image')
        warnings.append('Missing image.')
    if base_price <= 0:
        issues.add('missing_price')
        warnings.append('Missing price.')
    if not category:
        issues.add('missing_category')
        warnings.append('Missing category.')
    if not offers:
        issues.add('no_active_offers')
        warnings.append('No merchant offers imported yet.')
    elif not active_offers:
        issues.add('no_active_offers')
        warnings.append('All merchant offers are currently unavailable.')
    if stale_count:
        issues.add('stale_offers')
        warnings.append(f'{stale_count} offer(s) older than the {freshness_days}-day freshness threshold.')
    if missing_url_count:
        issues.add('missing_merchant_url')
        warnings.append(f'{missing_url_count} offer(s) missing the merchant product URL.')
    if duplicate_of:
        issues.add('potential_duplicate')
        warnings.append(
            'Potential duplicate of product ID(s): '
            + ', '.join(str(pid) for pid in duplicate_of)
            + '. Review manually - nothing is merged automatically.'
        )

    # Metadata completeness checks
    prod_colors = getattr(product, 'normalized_colors', []) or getattr(product, 'colors', []) or []
    prod_styles = getattr(product, 'styles', []) or []
    prod_occasions = getattr(product, 'occasions', []) or []

    if not prod_colors:
        issues.add('missing_color')
        warnings.append('Missing color.')
    if not prod_styles:
        issues.add('missing_style')
        warnings.append('Missing style.')
    if not prod_occasions:
        issues.add('missing_occasion')
        warnings.append('Missing occasion.')

    critical_keys = {'missing_price', 'missing_category', 'no_active_offers', 'potential_duplicate'}
    if issues & critical_keys:
        catalog_status = 'critical'
    elif issues:
        catalog_status = 'warning'
    else:
        catalog_status = 'healthy'

    in_stock_prices = [float(row['price']) for row in active_offers]
    best_row = min(active_offers, key=lambda r: float(r['price'])) if active_offers else None

    return {
        'id': product.id,
        'name': product.name,
        'brand': product.brand,
        'category': product.category,
        'subcategory': getattr(product, 'subcategory', None),
        'target_gender': getattr(product, 'target_gender', 'Unisex'),
        'styles': getattr(product, 'styles', []) or [],
        'occasions': getattr(product, 'occasions', []) or [],
        'materials': getattr(product, 'materials', []) or [],
        'seasons': getattr(product, 'seasons', []) or [],
        'normalized_colors': prod_colors,
        'description': product.description,
        'image': product.image,
        'price': product.price,
        'rating': float(product.rating or 0.0),
        'has_image': has_image,
        'has_price': base_price > 0,
        'has_category': bool(category),
        'base_price_value': base_price,
        'offer_count': len(offers),
        'active_offer_count': len(active_offers),
        'stale_offer_count': stale_count,
        'missing_url_count': missing_url_count,
        'best_price': best_row['price'] if best_row else None,
        'best_merchant': best_row['merchant_name'] if best_row else None,
        'currency': offers[0].currency if offers else 'INR',
        'last_updated': last_updated,
        'status': catalog_status,
        'issues': sorted(issues),
        'warnings': warnings,
        'duplicate_of': duplicate_of or [],
        'offers': sorted(offer_rows, key=lambda r: float(r['price'])),
    }


def _load_catalog(db: Session) -> tuple[list[dict[str, Any]], dict[int, list[int]]]:
    """Analyze every product once. Returns (analyzed products, duplicate map)."""
    now = _utc_now()
    freshness_days = get_freshness_days()

    products = db.query(Product).order_by(Product.id.asc()).all()
    offers = db.query(ProductOffer).all()
    offers_by_product: dict[int, list[ProductOffer]] = {}
    for offer in offers:
        offers_by_product.setdefault(offer.product_id, []).append(offer)

    # Deterministic duplicate detection on normalized brand + name + category.
    groups: dict[tuple[str, str, str], list[int]] = {}
    for product in products:
        key = (
            _normalize_text(product.brand),
            _normalize_text(product.name),
            _normalize_text(product.category),
        )
        if key[0] and key[1]:  # need at least brand + name to compare
            groups.setdefault(key, []).append(product.id)
    duplicates: dict[int, list[int]] = {}
    for member_ids in groups.values():
        if len(member_ids) > 1:
            for pid in member_ids:
                duplicates[pid] = [other for other in member_ids if other != pid]

    analyzed = [
        analyze_product(
            product,
            offers_by_product.get(product.id, []),
            now,
            freshness_days,
            duplicate_of=duplicates.get(product.id),
        )
        for product in products
    ]
    return analyzed, duplicates


def catalog_summary(db: Session) -> dict[str, Any]:
    """Real counts for the dashboard summary cards."""
    analyzed, duplicates = _load_catalog(db)
    stale_offers = sum(item['stale_offer_count'] for item in analyzed)
    return {
        'total_products': len(analyzed),
        'products_with_offers': sum(1 for item in analyzed if item['offer_count'] > 0),
        'products_without_offers': sum(1 for item in analyzed if item['offer_count'] == 0),
        'products_with_missing_images': sum(1 for item in analyzed if not item['has_image']),
        'products_with_missing_prices': sum(1 for item in analyzed if not item['has_price']),
        'stale_offers': stale_offers,
        'potential_duplicates': len(duplicates),
        'freshness_days': get_freshness_days(),
        'healthy': sum(1 for item in analyzed if item['status'] == 'healthy'),
        'warnings': sum(1 for item in analyzed if item['status'] == 'warning'),
        'critical': sum(1 for item in analyzed if item['status'] == 'critical'),
    }


def _matches_filters(item: dict[str, Any], filters: dict[str, Any]) -> bool:
    status = (filters.get('status') or '').strip().lower()
    if status and item['status'] != status:
        return False

    merchant = (filters.get('merchant') or '').strip().lower()
    if merchant:
        names = {str(row['merchant_name'] or '').lower() for row in item['offers']}
        if merchant not in names:
            return False

    category = (filters.get('category') or '').strip().lower()
    if category and (item['category'] or '').strip().lower() != category:
        return False

    has_image = filters.get('has_image')
    if has_image is not None and item['has_image'] != has_image:
        return False

    has_offer = filters.get('has_offer')
    if has_offer is not None:
        if has_offer and item['offer_count'] == 0:
            return False
        if has_offer is False and item['offer_count'] > 0:
            return False

    stale = filters.get('stale')
    if stale is not None:
        if stale and item['stale_offer_count'] == 0:
            return False
        if stale is False and item['stale_offer_count'] > 0:
            return False

    duplicate = filters.get('duplicate')
    if duplicate is not None:
        if duplicate and not item['duplicate_of']:
            return False
        if duplicate is False and item['duplicate_of']:
            return False

    missing_data = filters.get('missing_data')
    if missing_data:
        data_issues = {'missing_image', 'missing_price', 'missing_category'}
        if not (set(item['issues']) & data_issues):
            return False

    search = (filters.get('search') or '').strip().lower()
    if search:
        haystack = ' '.join(
            filter(None, [item['name'], item['brand'], item['category'], item['description']])
        ).lower()
        if search not in haystack:
            return False
    return True


def list_catalog_products(db: Session, **filters: Any) -> dict[str, Any]:
    """Filtered + paginated catalog listing with quality facts per product."""
    analyzed, _ = _load_catalog(db)

    truthy = {'true', '1', 'yes'}
    falsy = {'false', '0', 'no'}
    normalized: dict[str, Any] = {}
    for key in ('has_image', 'has_offer', 'stale', 'duplicate', 'missing_data'):
        raw = filters.get(key)
        if isinstance(raw, str):
            lowered = raw.strip().lower()
            if lowered in truthy:
                normalized[key] = True
            elif lowered in falsy:
                normalized[key] = False
        elif raw is not None:
            normalized[key] = bool(raw)
    filters = {**filters, **normalized}

    matching = [item for item in analyzed if _matches_filters(item, filters)]
    total = len(matching)

    try:
        page = max(1, int(filters.get('page', 1)))
    except (TypeError, ValueError):
        page = 1
    try:
        page_size = min(100, max(1, int(filters.get('page_size', 25))))
    except (TypeError, ValueError):
        page_size = 25

    start = (page - 1) * page_size
    items = matching[start:start + page_size]
    # Strip the heavy offer rows from list payloads; the detail endpoint serves them.
    for item in items:
        item.pop('offers', None)

    return {
        'items': items,
        'total': total,
        'page': page,
        'page_size': page_size,
        'freshness_days': get_freshness_days(),
    }


def get_catalog_product(db: Session, product_id: int) -> Optional[dict[str, Any]]:
    """Full inspection payload for one product (includes offer-level quality)."""
    analyzed, _ = _load_catalog(db)
    for item in analyzed:
        if item['id'] == product_id:
            return item
    return None


def catalog_categories(db: Session) -> list[str]:
    products = db.query(Product.category).distinct().all()
    return sorted({(row[0] or '').strip() for row in products if row[0] and row[0].strip()})


def catalog_merchants(db: Session) -> list[str]:
    offers = db.query(ProductOffer.store).distinct().all()
    return sorted({(row[0] or '').strip() for row in offers if row[0] and row[0].strip()})
