"""Admin click analytics over the MerchantClick table.

All queries are read-only aggregations with an optional recency window
(``days`` - typically 7 / 30 / 90). Metrics exposed:

* total merchant clicks and unique products clicked;
* clicks grouped by calendar date (clicks-over-time chart);
* clicks grouped by merchant (with top-merchant detection);
* per-product performance (clicks, distinct merchants, best price,
  freshest offer timestamp) sortable by clicks.

Only operational aggregates leave this module - no session identifiers,
user agents, or user ids are included in any analytics payload.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.merchant import Merchant
from app.models.merchant_click import MerchantClick
from app.models.product import Product
from app.models.product_offer import ProductOffer

ALLOWED_RANGES = (7, 30, 90)
DEFAULT_DAYS = 30


def normalize_days(days: Any) -> int:
    """Clamp the requested window onto a supported range (default 30)."""
    try:
        value = int(days)
    except (TypeError, ValueError):
        return DEFAULT_DAYS
    return max(1, min(365, value))


def _since(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _base_query(db: Session, days: int):
    return db.query(MerchantClick).filter(MerchantClick.clicked_at >= _since(days))


def merchant_click_summary(db: Session, days: int = DEFAULT_DAYS) -> dict[str, Any]:
    """Headline numbers + chart series for the analytics dashboard."""
    base = _base_query(db, days)

    total_clicks = base.count()
    unique_products = (
        base.with_entities(func.count(func.distinct(MerchantClick.product_id))).scalar() or 0
    )
    active_merchants = (
        base.with_entities(func.count(func.distinct(MerchantClick.merchant_id))).scalar() or 0
    )

    # Clicks per calendar date (UTC) for the clicks-over-time chart.
    date_expr = func.date(MerchantClick.clicked_at)
    by_date_rows = (
        db.query(date_expr.label('day'), func.count(MerchantClick.id).label('clicks'))
        .filter(MerchantClick.clicked_at >= _since(days))
        .group_by(date_expr)
        .order_by(date_expr.asc())
        .all()
    )

    # Clicks per merchant name for the by-merchant chart.
    by_merchant_rows = (
        db.query(
            Merchant.name.label('merchant'),
            func.count(MerchantClick.id).label('clicks'),
        )
        .join(Merchant, MerchantClick.merchant_id == Merchant.id)
        .filter(MerchantClick.clicked_at >= _since(days))
        .group_by(Merchant.name)
        .order_by(func.count(MerchantClick.id).desc())
        .limit(10)
        .all()
    )

    # Top clicked product for the headline card.
    top_product_row = (
        db.query(Product.name.label('name'), func.count(MerchantClick.id).label('clicks'))
        .join(Product, MerchantClick.product_id == Product.id)
        .filter(MerchantClick.clicked_at >= _since(days))
        .group_by(Product.name)
        .order_by(func.count(MerchantClick.id).desc())
        .first()
    )

    return {
        'days': days,
        'total_clicks': total_clicks,
        'unique_products': unique_products,
        'active_merchants': active_merchants,
        'top_merchant': by_merchant_rows[0].merchant if by_merchant_rows else None,
        'top_product': top_product_row.name if top_product_row else None,
        'top_product_clicks': top_product_row.clicks if top_product_row else 0,
        'clicks_by_date': [
            {'date': str(row.day), 'clicks': row.clicks} for row in by_date_rows
        ],
        'clicks_by_merchant': [
            {'merchant': row.merchant, 'clicks': row.clicks} for row in by_merchant_rows
        ],
    }


def merchant_analytics(db: Session, days: int = DEFAULT_DAYS) -> list[dict[str, Any]]:
    """Per-merchant click metrics, busiest first."""
    rows = (
        db.query(
            Merchant.id.label('merchant_id'),
            Merchant.name.label('merchant'),
            func.count(MerchantClick.id).label('clicks'),
            func.count(func.distinct(MerchantClick.product_id)).label('unique_products'),
            func.max(MerchantClick.clicked_at).label('last_click_at'),
        )
        .join(Merchant, MerchantClick.merchant_id == Merchant.id)
        .filter(MerchantClick.clicked_at >= _since(days))
        .group_by(Merchant.id, Merchant.name)
        .order_by(func.count(MerchantClick.id).desc())
        .all()
    )
    return [
        {
            'merchant_id': row.merchant_id,
            'merchant': row.merchant,
            'clicks': row.clicks,
            'unique_products': row.unique_products,
            'last_click_at': row.last_click_at,
        }
        for row in rows
    ]


def product_analytics(db: Session, days: int = DEFAULT_DAYS) -> list[dict[str, Any]]:
    """Per-product click performance with best price + offer freshness.

    Click aggregation and offer aggregation run as separate grouped queries
    (joining both tables in one query would multiply click counts by each
    product's number of offers), then merge keyed on product id.
    """
    click_rows = (
        db.query(
            MerchantClick.product_id.label('product_id'),
            func.count(MerchantClick.id).label('clicks'),
            func.count(func.distinct(MerchantClick.merchant_id)).label('merchants'),
        )
        .filter(MerchantClick.clicked_at >= _since(days))
        .group_by(MerchantClick.product_id)
        .all()
    )

    offer_rows = (
        db.query(
            ProductOffer.product_id.label('product_id'),
            func.max(ProductOffer.last_updated).label('last_updated'),
            func.min(ProductOffer.price).label('best_price'),
        )
        .group_by(ProductOffer.product_id)
        .all()
    )
    offers_by_product = {row.product_id: row for row in offer_rows}

    products = {
        row.id: row
        for row in db.query(Product.id, Product.name).filter(
            Product.id.in_([row.product_id for row in click_rows])
        ).all()
    }

    results = []
    for row in click_rows:
        product = products.get(row.product_id)
        if product is None:
            continue
        offer_row = offers_by_product.get(row.product_id)
        results.append(
            {
                'product_id': row.product_id,
                'product': product.name,
                'merchants': row.merchants,
                'clicks': row.clicks,
                'best_price': (
                    round(float(offer_row.best_price), 2)
                    if offer_row and offer_row.best_price is not None
                    else None
                ),
                'last_updated': offer_row.last_updated if offer_row else None,
            }
        )

    results.sort(key=lambda item: item['clicks'], reverse=True)
    return results