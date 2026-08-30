"""Multi-store ingestion pipeline.

Flow::

    Merchant source (connector)
        -> ExternalProduct (normalized ingestion schema)
        -> normalization
        -> deduplication / matching
        -> Product + ProductOffer (PostgreSQL)

The pipeline never deletes products and never duplicates offers: re-ingesting
the same merchant product id updates the existing offer in place.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from pgvector.sqlalchemy import Vector
except ImportError:  # pragma: no cover
    Vector = None

from sqlalchemy.orm import Session

from app.connectors import get_connector, list_available_connectors
from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_offer import ProductOffer
from app.schemas.external_product import ExternalProduct
from app.services.media_storage import sanitize_image_url
from app.services.normalization_service import (
    format_display_price,
    normalize_availability,
    normalize_brand,
    normalize_category,
    normalize_color_list,
    normalize_currency,
    normalize_product_name,
    normalize_rating,
    normalize_size_list,
)
from app.services.product_matcher import find_matching_product
from app.services.product_service import build_semantic_vector

# Fallback image used when a merchant record has no image URL.
PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&q=80'


def slugify(value: str) -> str:
    """Lowercase alphanumeric-hyphen slug used for merchant identity."""
    return ''.join(ch if ch.isalnum() else '-' for ch in value.strip().lower()).strip('-')


def get_or_create_merchant(
    db: Session,
    slug: str,
    name: Optional[str] = None,
    website_url: Optional[str] = None,
    logo_url: Optional[str] = None,
) -> Merchant:
    """Fetch a merchant by slug, creating the record on first sight."""
    normalized_slug = slugify(slug)
    merchant = db.query(Merchant).filter(Merchant.slug == normalized_slug).first()
    if merchant is None:
        merchant = Merchant(
            name=(name or normalized_slug.replace('-', ' ').title()).strip(),
            slug=normalized_slug,
            website_url=website_url,
            logo_url=logo_url,
            is_active=True,
        )
        db.add(merchant)
        db.flush()
    return merchant


def _find_offer(
    db: Session,
    product_id: int,
    merchant: Merchant,
    external: ExternalProduct,
) -> Optional[ProductOffer]:
    """Locate an existing offer for this merchant/product pair.

    1. Prefer the exact (merchant_id, merchant_product_id) identity.
    2. Fall back to the legacy (product_id, store) unique key so ingested
       offers merge with pre-existing seeded offers of the same store.
    """
    offer = (
        db.query(ProductOffer)
        .filter(
            ProductOffer.merchant_id == merchant.id,
            ProductOffer.merchant_product_id == external.external_product_id,
        )
        .first()
    )
    if offer is not None:
        return offer
    return (
        db.query(ProductOffer)
        .filter(
            ProductOffer.product_id == product_id,
            ProductOffer.store == merchant.name,
        )
        .first()
    )


def _resolve_image_url(external: ExternalProduct) -> str:
    """Pick a safe image URL from an external product.

    - Accepts http(s) URLs and root-relative paths.
    - Falls back to :data:`PLACEHOLDER_IMAGE` for missing or unsafe values
      so we never persist ``javascript:`` / ``data:text/html`` / ``file://``
      payloads into the catalog.
    """
    sanitized = sanitize_image_url(external.image_url)
    if sanitized:
        return sanitized
    return PLACEHOLDER_IMAGE


def _has_explicit_unsafe_image(external: ExternalProduct) -> bool:
    """Return True when the merchant supplied a clearly unsafe image URL.

    A product with no image is fine - it will pick up
    :data:`PLACEHOLDER_IMAGE` via :func:`_resolve_image_url`. A product that
    *did* send a value but that value failed sanitization is a stronger
    signal: it tells the ingestion pipeline to bump the ``rejected_images``
    counter and emit an error row so the operator can investigate the
    connector.
    """
    if not external.image_url or not isinstance(external.image_url, str):
        return False
    return not sanitize_image_url(external.image_url)


def _upsert_offer(
    db: Session,
    product: Product,
    merchant: Merchant,
    external: ExternalProduct,
    stats: Dict[str, int],
) -> None:
    currency = normalize_currency(external.currency)
    availability = normalize_availability(external.availability)
    rating = normalize_rating(external.rating)
    now = datetime.now(timezone.utc)
    safe_image = _resolve_image_url(external)

    offer = _find_offer(db, product.id, merchant, external)
    if offer is None:
        offer = ProductOffer(
            product_id=product.id,
            store=merchant.name,
            price=float(external.price),
            currency=currency,
            availability=availability,
            rating=rating,
            merchant_id=merchant.id,
            merchant_product_id=external.external_product_id,
            product_url=external.product_url,
            image_url=safe_image,
            last_updated=now,
        )
        db.add(offer)
        stats['offers_created'] += 1
    else:
        offer.price = float(external.price)
        offer.currency = currency
        offer.availability = availability
        offer.rating = rating
        offer.merchant_id = merchant.id
        offer.merchant_product_id = external.external_product_id
        offer.product_url = external.product_url or offer.product_url
        # Only overwrite an existing image with a safe value; an unsafe or
        # missing merchant image must not clobber a known-good one.
        if sanitize_image_url(external.image_url) is not None:
            offer.image_url = safe_image
        offer.last_updated = now
        stats['offers_updated'] += 1


def _create_product(db: Session, merchant: Merchant, external: ExternalProduct) -> Product:
    name = normalize_product_name(external.name)
    category = normalize_category(external.category)
    brand = normalize_brand(external.brand) or 'Unknown'
    currency = normalize_currency(external.currency)
    colors = normalize_color_list(external.colors)
    sizes = normalize_size_list(external.sizes)

    product = Product(
        name=name,
        brand=brand,
        category=category,
        description=(external.description or '').strip()[:500],
        price=format_display_price(float(external.price), currency),
        original_price=None,
        rating=normalize_rating(external.rating),
        image=_resolve_image_url(external),
        store=merchant.name,
        colors=colors,
        sizes=sizes,
        is_active=True,
    )
    # Give new products an embedding immediately so semantic search finds them.
    embedding = build_semantic_vector(
        ' '.join([name, brand, category, product.description or '', *colors, *sizes])
    )
    if db.bind.dialect.name == 'postgresql' and Vector is not None:
        product.embedding = embedding
    else:
        product.embedding = json.dumps(embedding)
    db.add(product)
    db.flush()  # assign product.id before offers reference it
    return product


def ingest_external_products(
    db: Session,
    external_products: List[ExternalProduct],
    merchant: Merchant,
) -> Dict[str, Any]:
    """Normalize + deduplicate + persist a batch of external products."""
    stats: Dict[str, int] = {
        'received': len(external_products),
        'products_created': 0,
        'products_matched': 0,
        'offers_created': 0,
        'offers_updated': 0,
        'rejected_images': 0,
        'skipped': 0,
    }
    errors: List[Dict[str, str]] = []

    for external in external_products:
        try:
            if _has_explicit_unsafe_image(external):
                stats['rejected_images'] += 1
                errors.append(
                    {
                        'external_product_id': external.external_product_id,
                        'error': f'unsafe image URL: {external.image_url!r}',
                    }
                )
                continue

            match = find_matching_product(db, external)
            if match is None:
                product = _create_product(db, merchant, external)
                stats['products_created'] += 1
            else:
                product = match
                stats['products_matched'] += 1
                # Enrich an existing product only where it has no data yet.
                if not (product.description or '').strip() and external.description:
                    product.description = external.description.strip()[:500]

            _upsert_offer(db, product, merchant, external, stats)
        except Exception as exc:  # noqa: BLE001 - one bad row must not kill the batch
            errors.append(
                {
                    'external_product_id': external.external_product_id,
                    'error': str(exc),
                }
            )
            stats['skipped'] += 1

    db.commit()
    return {'merchant': merchant.slug, **stats, 'errors': errors}


def run_connector_ingestion(
    db: Session,
    merchant_slug: str,
    data_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Run one merchant's connector end-to-end through the pipeline."""
    connector = get_connector(merchant_slug, data_dir)
    external_products = connector.fetch_products()

    merchant = get_or_create_merchant(
        db,
        slug=connector.merchant_slug or merchant_slug,
        name=merchant_slug.replace('-', ' ').title(),
    )

    result = ingest_external_products(db, external_products, merchant)
    result['connector'] = type(connector).__name__
    return result


def run_mock_ingestion(
    db: Session,
    merchant_slugs: Optional[List[str]] = None,
    data_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Run the mock ingestion process for all (or selected) mock merchants."""
    slugs = merchant_slugs or list_available_connectors()
    results = [run_connector_ingestion(db, slug, data_dir) for slug in slugs]

    totals = {
        'merchants_processed': len(results),
        'received': sum(r['received'] for r in results),
        'products_created': sum(r['products_created'] for r in results),
        'products_matched': sum(r['products_matched'] for r in results),
        'offers_created': sum(r['offers_created'] for r in results),
        'offers_updated': sum(r['offers_updated'] for r in results),
        'rejected_images': sum(r['rejected_images'] for r in results),
        'skipped': sum(r['skipped'] for r in results),
    }
    return {
        'status': 'completed',
        'totals': totals,
        'merchants': results,
    }