"""Admin catalog data-quality endpoints (protected).

All routes require the same admin authorization as the rest of the admin API
(``X-Admin-Key`` service key or a JWT from a user with ``is_admin=True``).
Read-only: nothing here mutates catalog data.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_db
from app.routes.admin import require_admin_access
from app.services.catalog_service import (
    catalog_categories,
    catalog_merchants,
    catalog_summary,
    get_catalog_product,
    list_catalog_products,
)

router = APIRouter(prefix='/api/admin/catalog', tags=['admin-catalog'])


class CatalogSummaryResponse(BaseModel):
    total_products: int
    products_with_offers: int
    products_without_offers: int
    products_with_missing_images: int
    products_with_missing_prices: int
    stale_offers: int
    potential_duplicates: int
    freshness_days: int
    healthy: int
    warnings: int
    critical: int


class CatalogProductItem(BaseModel):
    id: int
    name: str
    brand: str
    category: Optional[str] = None
    image: Optional[str] = None
    price: Optional[str] = None
    rating: float = 0.0
    has_image: bool
    has_price: bool
    has_category: bool
    offer_count: int
    active_offer_count: int
    stale_offer_count: int
    missing_url_count: int
    best_price: Optional[float] = None
    best_merchant: Optional[str] = None
    currency: str = 'INR'
    last_updated: Optional[datetime] = None
    status: str
    issues: List[str] = []
    warnings: List[str] = []
    duplicate_of: List[int] = []


class CatalogProductDetailResponse(CatalogProductItem):
    description: Optional[str] = None
    offers: List[dict] = []


class CatalogListResponse(BaseModel):
    items: List[CatalogProductItem]
    total: int
    page: int
    page_size: int
    freshness_days: int


@router.get(
    '/summary',
    response_model=CatalogSummaryResponse,
    summary='Real catalog data-quality totals (admin only)',
)
def get_catalog_summary(db: Session = Depends(get_db), _: None = Depends(require_admin_access)) -> dict:
    return catalog_summary(db)


@router.get(
    '/products',
    response_model=CatalogListResponse,
    summary='Filtered catalog listing with quality status (admin only)',
)
def get_catalog_products(
    status: Optional[str] = Query(default=None),
    merchant: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    has_image: Optional[bool] = Query(default=None),
    has_offer: Optional[bool] = Query(default=None),
    stale: Optional[bool] = Query(default=None),
    duplicate: Optional[bool] = Query(default=None),
    missing_data: Optional[bool] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> dict:
    return list_catalog_products(
        db,
        status=status,
        merchant=merchant,
        category=category,
        has_image=has_image,
        has_offer=has_offer,
        stale=stale,
        duplicate=duplicate,
        missing_data=missing_data,
        search=search,
        page=page,
        page_size=page_size,
    )


@router.get(
    '/products/{product_id}',
    response_model=CatalogProductDetailResponse,
    summary='Inspect one product: details, offers, quality warnings (admin only)',
)
def inspect_catalog_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> Any:
    item = get_catalog_product(db, product_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} not found.',
        )
    return item


@router.get(
    '/filters',
    response_model=dict,
    summary='Distinct categories and merchants for filter dropdowns (admin only)',
)
def get_catalog_filter_options(db: Session = Depends(get_db), _: None = Depends(require_admin_access)) -> dict:
    return {
        'categories': catalog_categories(db),
        'merchants': catalog_merchants(db),
    }
