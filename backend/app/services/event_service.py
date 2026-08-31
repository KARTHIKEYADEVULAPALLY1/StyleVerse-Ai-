"""User behavior event service (write path + read aggregations).

Write path
----------
``record_user_event`` is the ONLY place UserEvent rows are created. It:

* enforces the controlled ``EVENT_TYPES`` vocabulary;
* validates referenced ``product_id`` / ``merchant_id`` against the database
  so clients can never persist arbitrary IDs;
* scrubs metadata through :func:`sanitize_event_metadata` which drops keys
  that look sensitive (passwords, payment data, emails, tokens, images, IPs,
  fingerprints), truncates long strings and caps payload size - only small,
  useful, non-sensitive context such as ``{"occasion": "date_night",
  "style": "minimalist"}`` survives.

Read side
---------
* ``get_user_event_scores`` - per-product affinity scores using the public
  interaction weights (view +1, wishlist +4, cart +5, purchase +8,
  merchant click +3). Consumed by the recommendation service as ONE extra
  signal on top of the existing category/brand/style/price engine.
* ``event_analytics_summary`` - admin dashboard aggregates over a recency
  window. Only operational aggregates leave this module; no user ids or
  session identifiers are included in any analytics payload.
"""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.merchant import Merchant
from app.models.product import Product
from app.models.user_event import UserEvent

ALLOWED_RANGES = (7, 30, 90)
DEFAULT_DAYS = 30

#: Controlled vocabulary of supported event types. Anything else is rejected.
EVENT_TYPES: tuple[str, ...] = (
    'product_viewed',
    'product_searched',
    'wishlist_added',
    'wishlist_removed',
    'cart_added',
    'cart_removed',
    'order_created',
    'merchant_clicked',
    'ai_stylist_used',
    'virtual_try_on_used',
)

#: Public personalization weights per event type (per the product spec).
EVENT_SCORES: dict[str, float] = {
    'product_viewed': 1,
    'wishlist_added': 4,
    'cart_added': 5,
    'order_created': 8,
    'merchant_clicked': 3,
}

#: Event types that require a real product reference.
PRODUCT_EVENT_TYPES = {
    'product_viewed',
    'wishlist_added',
    'wishlist_removed',
    'cart_added',
    'cart_removed',
    'order_created',
    'merchant_clicked',
}

#: Metadata hygiene limits.
MAX_METADATA_KEYS = 12
MAX_METADATA_STRING_LENGTH = 120
MAX_METADATA_TOTAL_LENGTH = 2000

#: Keys that must NEVER reach the events table even if a client sends them.
SENSITIVE_KEY_FRAGMENTS = (
    'password',
    'passwd',
    'secret',
    'token',
    'payment',
    'card',
    'cvv',
    'iban',
    'ssn',
    'email',
    'phone',
    'address',
    'ip',
    'fingerprint',
    'user_agent',
    'useragent',
    'location',
    'image',
    'photo',
    'file',
    'blob',
    'base64',
)


def normalize_days(days: Any) -> int:
    """Clamp the requested window onto a sane range (default 30)."""
    try:
        value = int(days)
    except (TypeError, ValueError):
        return DEFAULT_DAYS
    return max(1, min(365, value))


def _since(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def is_valid_session_id(value: Any) -> bool:
    """True for opaque, non-identifying session identifiers we accept.

    Only short alphanumeric/dash strings (uuid-style) are accepted; anything
    that could carry personal data (emails, long free text) is rejected and
    replaced by a fresh random id server-side.
    """
    if not value or not isinstance(value, str):
        return False
    cleaned = value.strip()
    if not cleaned or len(cleaned) > 64:
        return False
    return all(ch.isalnum() or ch == '-' for ch in cleaned)


def sanitize_event_metadata(metadata: Any) -> dict | None:
    """Return a small, non-sensitive metadata document, or None.

    Drops non-primitive values, sensitive-looking keys and oversized content.
    Uploaded images / binary payloads can never pass through this filter.
    """
    if not isinstance(metadata, dict) or not metadata:
        return None

    sanitized: dict = {}
    total_length = 0
    for raw_key, raw_value in list(metadata.items())[:MAX_METADATA_KEYS]:
        key = str(raw_key)[:60].strip().lower().replace('-', '_')
        if not key:
            continue
        if any(fragment in key for fragment in SENSITIVE_KEY_FRAGMENTS):
            continue

        # Only simple scalars are meaningful context; everything else is dropped
        # so images/blobs/nested objects can never be stored in analytics.
        if isinstance(raw_value, bool):
            value: Any = raw_value
        elif isinstance(raw_value, int):
            value = raw_value
        elif isinstance(raw_value, float):
            value = round(raw_value, 4)
        elif isinstance(raw_value, str):
            value = raw_value.strip()[:MAX_METADATA_STRING_LENGTH]
            if not value:
                continue
        else:
            continue

        total_length += len(str(value)) + len(key)
        if total_length > MAX_METADATA_TOTAL_LENGTH:
            break
        sanitized[key] = value

    return sanitized or None


def record_user_event(
    db: Session,
    *,
    event_type: str,
    user_id: int | None = None,
    session_id: str | None = None,
    product_id: int | None = None,
    merchant_id: int | None = None,
    event_metadata: Any = None,
) -> UserEvent:
    """Validate and persist one privacy-conscious user event.

    Raises ``ValueError`` when the event type is unknown, a required reference
    is missing, or a referenced product/merchant does not exist.
    """
    if event_type not in EVENT_TYPES:
        allowed = ', '.join(EVENT_TYPES)
        raise ValueError(f'Unknown event_type {event_type!r}. Supported: {allowed}.')

    if product_id is not None:
        if db.query(Product.id).filter(Product.id == product_id).first() is None:
            raise ValueError(f'Product with ID {product_id} was not found.')
    elif event_type in PRODUCT_EVENT_TYPES:
        raise ValueError(f'event_type {event_type!r} requires a product_id.')

    if merchant_id is not None:
        if db.query(Merchant.id).filter(Merchant.id == merchant_id).first() is None:
            raise ValueError(f'Merchant with ID {merchant_id} was not found.')

    event = UserEvent(
        user_id=user_id,
        session_id=(session_id[:64] if is_valid_session_id(session_id) else None),
        event_type=event_type,
        product_id=product_id,
        merchant_id=merchant_id,
        event_metadata=sanitize_event_metadata(event_metadata),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def get_user_event_scores(db: Session, user_id: int) -> Counter[int]:
    """Per-product affinity scores derived from this user's real activity.

    Weights follow the public scoring table: view +1, wishlist +4, cart +5,
    purchase +8, merchant click +3. Returns a Counter keyed by product_id.
    """
    rows = (
        db.query(UserEvent.product_id, UserEvent.event_type)
        .filter(
            UserEvent.user_id == user_id,
            UserEvent.product_id.isnot(None),
            UserEvent.event_type.in_(list(EVENT_SCORES.keys())),
        )
        .all()
    )
    scores: Counter[int] = Counter()
    for product_id, event_type in rows:
        scores[int(product_id)] += EVENT_SCORES.get(event_type, 0)
    return scores


def get_top_interacted_products(
    db: Session,
    user_id: int,
    limit: int = 20,
) -> list[Product]:
    """Products with the strongest recent interaction signal for one user."""
    scores = get_user_event_scores(db, user_id)
    if not scores:
        return []
    ranked_ids = [pid for pid, _ in scores.most_common(limit)]
    products = db.query(Product).filter(Product.id.in_(ranked_ids)).all()
    products.sort(key=lambda product: ranked_ids.index(product.id))
    return products


# ---------------------------------------------------------------------------
# Admin analytics aggregation
# ---------------------------------------------------------------------------

def _count_events(db: Session, days: int, *event_types: str) -> int:
    return (
        db.query(func.count(UserEvent.id))
        .filter(UserEvent.created_at >= _since(days), UserEvent.event_type.in_(event_types))
        .scalar()
        or 0
    )


def _top_products_by_event(
    db: Session,
    days: int,
    event_types: tuple[str, ...],
    limit: int = 10,
) -> list[dict[str, Any]]:
    rows = (
        db.query(
            Product.id.label('product_id'),
            Product.name.label('name'),
            func.count(UserEvent.id).label('count'),
        )
        .join(Product, UserEvent.product_id == Product.id)
        .filter(UserEvent.created_at >= _since(days), UserEvent.event_type.in_(event_types))
        .group_by(Product.id, Product.name)
        .order_by(func.count(UserEvent.id).desc(), Product.id.asc())
        .limit(limit)
        .all()
    )
    return [
        {'product_id': row.product_id, 'product': row.name, 'count': int(row.count)}
        for row in rows
    ]


def _top_search_terms(db: Session, days: int, limit: int = 10) -> list[dict[str, Any]]:
    """Aggregate search terms from sanitized search-event metadata.

    Done in Python over a bounded window so it stays portable across
    SQLite/PostgreSQL without JSON-path operators.
    """
    rows = (
        db.query(UserEvent.event_metadata)
        .filter(
            UserEvent.created_at >= _since(days),
            UserEvent.event_type == 'product_searched',
        )
        .limit(5000)
        .all()
    )
    term_counts: Counter[str] = Counter()
    for (metadata,) in rows:
        query = ''
        if isinstance(metadata, dict):
            candidate = metadata.get('query') or metadata.get('term')
            if isinstance(candidate, str):
                query = candidate.strip().lower()
        if query:
            term_counts[query] += 1
    return [
        {'term': term, 'count': count}
        for term, count in term_counts.most_common(limit)
    ]


def event_analytics_summary(db: Session, days: int = DEFAULT_DAYS) -> dict[str, Any]:
    """Headline behavior metrics + chart series for the admin dashboard."""
    days = normalize_days(days)

    date_expr = func.date(UserEvent.created_at)
    by_date_rows = (
        db.query(date_expr.label('day'), func.count(UserEvent.id).label('events'))
        .filter(UserEvent.created_at >= _since(days))
        .group_by(date_expr)
        .order_by(date_expr.asc())
        .all()
    )

    return {
        'days': days,
        'total_events': _count_events(db, days, *EVENT_TYPES),
        'total_product_views': _count_events(db, days, 'product_viewed'),
        'total_searches': _count_events(db, days, 'product_searched'),
        'wishlist_actions': _count_events(db, days, 'wishlist_added', 'wishlist_removed'),
        'wishlist_added': _count_events(db, days, 'wishlist_added'),
        'wishlist_removed': _count_events(db, days, 'wishlist_removed'),
        'cart_actions': _count_events(db, days, 'cart_added', 'cart_removed'),
        'cart_added': _count_events(db, days, 'cart_added'),
        'cart_removed': _count_events(db, days, 'cart_removed'),
        'orders_created': _count_events(db, days, 'order_created'),
        'merchant_clicks': _count_events(db, days, 'merchant_clicked'),
        'ai_stylist_sessions': _count_events(db, days, 'ai_stylist_used'),
        'try_on_sessions': _count_events(db, days, 'virtual_try_on_used'),
        'events_by_date': [
            {'date': str(row.day), 'events': int(row.events)} for row in by_date_rows
        ],
        'top_viewed_products': _top_products_by_event(db, days, ('product_viewed',)),
        'top_wishlisted_products': _top_products_by_event(db, days, ('wishlist_added',)),
        'top_carted_products': _top_products_by_event(db, days, ('cart_added',)),
        'top_search_terms': _top_search_terms(db, days),
    }
