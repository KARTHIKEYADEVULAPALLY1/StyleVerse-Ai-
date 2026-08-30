"""Multi-store discovery endpoint.

``GET /api/discovery`` - search the normalized catalog and surface each
product's best currently-available merchant offer in one response.

This is additive: the existing ``/api/products`` APIs are untouched.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.discovery import (
    BestOfferResponse,
    DiscoveryProductResponse,
    DiscoveryResponse,
)
from app.services.discovery_service import discover_products, normalize_sort

router = APIRouter(prefix='/api', tags=['discovery'])


@router.get('/discovery', response_model=DiscoveryResponse, summary='Multi-store product discovery')
def discover(
    q: str = '',
    category: str | None = None,
    brand: str | None = None,
    style: str | None = None,
    occasion: str | None = None,
    color: str | None = None,
    subcategory: str | None = None,
    season: str | None = None,
    gender: str | None = None,
    min_price: float | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    merchant: str | None = None,
    sort: str = 'relevance',
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
) -> DiscoveryResponse:
    """Search across stores: products + best available offer per product with rich metadata filters and pagination."""
    result = discover_products(
        db,
        q=q,
        category=category,
        brand=brand,
        style=style,
        occasion=occasion,
        color=color,
        subcategory=subcategory,
        season=season,
        gender=gender,
        min_price=min_price,
        max_price=max_price,
        merchant=merchant,
        sort=sort,
        page=page,
        limit=limit,
    )

    items = [
        DiscoveryProductResponse(
            id=item['id'],
            name=item['name'],
            brand=item['brand'],
            image=item['image'],
            category=item['category'],
            subcategory=item.get('subcategory'),
            target_gender=item.get('target_gender', 'Unisex'),
            styles=item.get('styles', []),
            occasions=item.get('occasions', []),
            materials=item.get('materials', []),
            seasons=item.get('seasons', []),
            normalized_colors=item.get('normalized_colors', []),
            rating=item['rating'],
            base_price=item['base_price'],
            currency=item['currency'],
            best_offer=BestOfferResponse(**item['best_offer']) if item['best_offer'] else None,
            offer_count=item['offer_count'],
            offers=[],
        )
        for item in result['products']
    ]

    return DiscoveryResponse(
        query=result['query'],
        sort=result['sort'],
        page=result['page'],
        limit=result['limit'],
        total=result['total'],
        has_next=result['has_next'],
        items=items,
        products=items,
        merchants=result['merchants'],
        available_filters=result.get('available_filters'),
    )


