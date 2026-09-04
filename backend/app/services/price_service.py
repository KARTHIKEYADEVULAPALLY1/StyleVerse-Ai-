from __future__ import annotations

from typing import Any
from sqlalchemy.orm import Session

from app.models.merchant import Merchant
from app.models.product import Product
from app.models.product_offer import ProductOffer
from app.services.freshness_service import FRESH, AGING, freshness_status
from app.services.merchant_redirect_service import build_visit_path, resolve_outbound_url
from app.services.product_service import INITIAL_PRODUCTS, get_product_by_id

def parse_currency_value(value: str | int | float | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    cleaned = ''.join(ch for ch in str(value) if ch.isdigit() or ch in {'.', '-', ','})
    if not cleaned:
        return 0.0
    return float(cleaned.replace(',', ''))


def round_price(value: float) -> float:
    return round(value, 2)


def build_offer_rows(product: dict[str, Any]) -> list[dict[str, Any]]:
    base_price = parse_currency_value(product['price'])
    base_rating = float(product.get('rating', 4.0))
    rows: list[dict[str, Any]] = []

    rows.append({
        'product_id': product['id'],
        'store': product['store'],
        'price': round_price(base_price),
        'currency': 'USD',
        'availability': 'In Stock',
        'rating': base_rating,
        'product_url': product['product_url'],
    })

    return rows


def seed_product_offers(db: Session) -> None:
    for product_data in INITIAL_PRODUCTS:
        for offer_data in build_offer_rows(product_data):
            existing = (
                db.query(ProductOffer)
                .filter(
                    ProductOffer.product_id == offer_data['product_id'],
                    ProductOffer.store == offer_data['store'],
                )
                .first()
            )
            if existing:
                for field in ['price', 'currency', 'availability', 'rating', 'product_url']:
                    setattr(existing, field, offer_data[field])
            else:
                db.add(ProductOffer(**offer_data))
    db.commit()


def get_in_stock_offers(offers: list[ProductOffer]) -> list[ProductOffer]:
    return [offer for offer in offers if offer.availability.lower() == 'in stock']


def serialize_offers(
    db: Session,
    offers: list[ProductOffer],
    product_id: int,
    product_name: str | None = None,
) -> list[dict[str, Any]]:
    """Serialize ProductOffer rows for API responses.

    Enriches each offer with merchant identity (name / logo when linked to a
    Merchant row) and a ``visit_url`` pointing at the backend redirect route,
    so the frontend can always send users to the merchant page.
    """
    curated_stores = {item['id']: item['store'] for item in INITIAL_PRODUCTS}
    if product_id in curated_stores:
        offers = [offer for offer in offers if offer.store == curated_stores[product_id]]

    merchant_ids = {offer.merchant_id for offer in offers if offer.merchant_id is not None}
    merchants_by_id: dict[int, Merchant] = {}
    if merchant_ids:
        merchants_by_id = {
            m.id: m for m in db.query(Merchant).filter(Merchant.id.in_(merchant_ids)).all()
        }

    serialized: list[dict[str, Any]] = []
    for offer in offers:
        merchant = merchants_by_id.get(offer.merchant_id) if offer.merchant_id else None
        serialized.append(
            {
                'offer_id': offer.id,
                'store': offer.store,
                'price': offer.price,
                'currency': offer.currency,
                'availability': offer.availability,
                'rating': offer.rating,
                'merchant_id': offer.merchant_id,
                'merchant_name': merchant.name if merchant else (offer.store or None),
                'merchant_logo': (merchant.logo_url or None) if merchant else None,
                'merchant_product_id': offer.merchant_product_id,
                'product_url': offer.product_url,
                'image_url': offer.image_url,
                'last_updated': offer.last_updated,
                # Freshness grade derived from last_updated (fresh/aging/stale/
                # unknown) so the UI can always communicate how current an
                # offer is instead of implying live certainty.
                'freshness_status': freshness_status(offer.last_updated),
                'visit_url': build_visit_path(product_id, offer.id)
                if resolve_outbound_url(offer, product_name)
                else None,
            }
        )
    return serialized


def get_product_prices(db: Session, product_id: int) -> dict[str, Any] | None:
    product = get_product_by_id(db, product_id)
    if not product:
        return None

    offers_query = (
        db.query(ProductOffer)
        .filter(ProductOffer.product_id == product_id)
        .order_by(ProductOffer.price.asc(), ProductOffer.store.asc())
    )
    curated_stores = {item['id']: item['store'] for item in INITIAL_PRODUCTS}
    if product_id in curated_stores:
        offers_query = offers_query.filter(ProductOffer.store == curated_stores[product_id])
    offers = offers_query.all()

    in_stock_offers = get_in_stock_offers(offers)
    # Legacy behavior preserved exactly: best/high/savings come from all
    # currently in-stock offers. Freshness is surfaced separately through
    # per-offer ``freshness_status`` and ``best_price_verified`` so the UI can
    # ask for verification when the highlighted deal relies on stale data.
    best_price = None
    highest_price = None
    savings = None
    best_price_verified = True

    if in_stock_offers:
        prices = [offer.price for offer in in_stock_offers]
        best_price = min(prices)
        highest_price = max(prices)
        # Only report savings when there is an actual price difference.
        savings = round_price(highest_price - best_price) if highest_price > best_price else None
        cheapest_fresh = [
            offer
            for offer in in_stock_offers
            if offer.price == best_price
            and freshness_status(offer.last_updated) in (FRESH, AGING)
        ]
        best_price_verified = bool(cheapest_fresh)

    return {
        'product_id': product_id,
        'product_name': product.name,
        'offers': serialize_offers(db, offers, product_id, product.name),
        'best_price': best_price,
        'highest_price': highest_price,
        'savings': savings,
        'currency': offers[0].currency if offers else None,
        # False when the highlighted best price relies on stale data - the UI
        # must then tell the customer it may need verification.
        'best_price_verified': best_price_verified,
    }
