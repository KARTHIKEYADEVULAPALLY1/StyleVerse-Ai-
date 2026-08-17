from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.product_offer import ProductOffer
from app.services.product_service import INITIAL_PRODUCTS, get_product_by_id

STORE_OFFER_TEMPLATES = [
    {'store': 'Ajio', 'multiplier': 0.92, 'rating_offset': -0.1, 'availability': 'In Stock'},
    {'store': 'Myntra', 'multiplier': 0.95, 'rating_offset': -0.05, 'availability': 'In Stock'},
    {'store': 'Amazon', 'multiplier': 1.0, 'rating_offset': 0.0, 'availability': 'In Stock'},
    {'store': 'Flipkart', 'multiplier': 1.05, 'rating_offset': -0.15, 'availability': 'In Stock'},
]


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

    for index, template in enumerate(STORE_OFFER_TEMPLATES):
        availability = template['availability']
        if product['id'] == 10 and template['store'] == 'Flipkart':
            availability = 'Out of Stock'

        rows.append(
            {
                'product_id': product['id'],
                'store': template['store'],
                'price': round_price(base_price * template['multiplier']),
                'currency': 'INR',
                'availability': availability,
                'rating': round(max(3.5, min(5.0, base_rating + template['rating_offset'])), 1),
            }
        )

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
                for field in ['price', 'currency', 'availability', 'rating']:
                    setattr(existing, field, offer_data[field])
            else:
                db.add(ProductOffer(**offer_data))
    db.commit()


def get_in_stock_offers(offers: list[ProductOffer]) -> list[ProductOffer]:
    return [offer for offer in offers if offer.availability.lower() == 'in stock']


def get_product_prices(db: Session, product_id: int) -> dict[str, Any] | None:
    product = get_product_by_id(db, product_id)
    if not product:
        return None

    offers = (
        db.query(ProductOffer)
        .filter(ProductOffer.product_id == product_id)
        .order_by(ProductOffer.price.asc(), ProductOffer.store.asc())
        .all()
    )

    in_stock_offers = get_in_stock_offers(offers)
    currency = offers[0].currency if offers else 'INR'

    best_price = None
    highest_price = None
    savings = None

    if in_stock_offers:
        prices = [offer.price for offer in in_stock_offers]
        best_price = min(prices)
        highest_price = max(prices)
        savings = round_price(highest_price - best_price)

    return {
        'product_id': product_id,
        'offers': offers,
        'best_price': best_price,
        'highest_price': highest_price,
        'savings': savings,
        'currency': currency if offers else None,
    }
