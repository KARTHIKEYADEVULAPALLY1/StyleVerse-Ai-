"""Merchant (store) registry helpers.

Merchants are configuration records only at this stage - no live merchant
APIs are connected. The initial records below are seeded into PostgreSQL so
connectors and offers can reference them.
"""
from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.merchant import Merchant

INITIAL_MERCHANTS: List[dict] = [
    {
        'name': 'Amazon',
        'slug': 'amazon',
        'website_url': 'https://www.amazon.in',
        'logo_url': '',
    },
    {
        'name': 'Myntra',
        'slug': 'myntra',
        'website_url': 'https://www.myntra.com',
        'logo_url': '',
    },
    {
        'name': 'Ajio',
        'slug': 'ajio',
        'website_url': 'https://www.ajio.com',
        'logo_url': '',
    },
    {
        'name': 'Flipkart',
        'slug': 'flipkart',
        'website_url': 'https://www.flipkart.com',
        'logo_url': '',
    },
]


def get_merchant_by_slug(db: Session, slug: str) -> Optional[Merchant]:
    return db.query(Merchant).filter(Merchant.slug == slug.strip().lower()).first()


def list_active_merchants(db: Session) -> List[Merchant]:
    return db.query(Merchant).filter(Merchant.is_active.is_(True)).order_by(Merchant.id.asc()).all()


def seed_initial_merchants(db: Session) -> int:
    """Idempotently seed the initial merchant records. Returns created count."""
    created = 0
    for data in INITIAL_MERCHANTS:
        existing = get_merchant_by_slug(db, data['slug'])
        if existing is None:
            db.add(Merchant(**data))
            created += 1
        else:
            # Keep core fields in sync without touching anything else.
            if existing.name != data['name']:
                existing.name = data['name']
            if not existing.website_url and data['website_url']:
                existing.website_url = data['website_url']
    db.commit()
    return created