from __future__ import annotations

from typing import Any, List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.product import Product
from app.models.product_offer import ProductOffer
from app.schemas.product import PaginatedProductResponse, ProductResponse
from app.schemas.product_offer import ProductOfferResponse, ProductPricesResponse
from app.services.price_service import get_product_prices, serialize_offers
from app.services.product_service import get_all_products, get_product_by_id, search_products

router = APIRouter(prefix='/api/products', tags=['products'])



@router.get('', response_model=Union[PaginatedProductResponse, List[ProductResponse]], summary='Get products with optional pagination')
@router.get('/', response_model=Union[PaginatedProductResponse, List[ProductResponse]], include_in_schema=False)
def list_products(
    page: Optional[int] = Query(default=None, ge=1),
    limit: Optional[int] = Query(default=None, ge=1, le=100),
    sort: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    db: Session = Depends(get_db),
) -> Any:
    """Retrieve available StyleVerse products, with optional pagination and filtering."""
    query = db.query(Product).filter(Product.is_active.is_(True))
    if category:
        query = query.filter(Product.category.ilike(f'%{category.strip()}%'))
    if brand:
        query = query.filter(Product.brand.ilike(f'%{brand.strip()}%'))

    if sort == 'rating':
        query = query.order_by(Product.rating.desc(), Product.id.asc())
    elif sort == 'newest':
        query = query.order_by(Product.id.desc())
    else:
        query = query.order_by(Product.id.asc())

    if page is not None or limit is not None:
        safe_page = page or 1
        safe_limit = limit or 20
        total = query.count()
        offset = (safe_page - 1) * safe_limit
        products = query.offset(offset).limit(safe_limit).all()
        has_next = (offset + safe_limit) < total
        return PaginatedProductResponse(
            items=[ProductResponse.model_validate(p) for p in products],
            page=safe_page,
            limit=safe_limit,
            total=total,
            has_next=has_next,
        )

    products = query.all()
    return [ProductResponse.model_validate(p) for p in products]


@router.get('/search', response_model=List[ProductResponse], summary='Search products by keyword')
def search_product_catalog(q: str = '', db: Session = Depends(get_db)) -> List[ProductResponse]:
    """Find products matching keyword text in their name, description, or category."""
    products = search_products(db, q)
    return [ProductResponse.model_validate(p) for p in products]



@router.get(
    '/{product_id}/prices',
    response_model=ProductPricesResponse,
    summary='Get store-specific pricing for a product',
)
def get_product_price_comparison(product_id: int, db: Session = Depends(get_db)) -> ProductPricesResponse:
    """Return multi-store offers, best price, and savings for a product."""
    price_data = get_product_prices(db, product_id)
    if price_data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} not found.',
        )

    return ProductPricesResponse(
        product_id=price_data['product_id'],
        offers=[ProductOfferResponse.model_validate(offer) for offer in price_data['offers']],
        best_price=price_data['best_price'],
        highest_price=price_data['highest_price'],
        savings=price_data['savings'],
        currency=price_data['currency'],
        best_price_verified=price_data.get('best_price_verified', True),
    )


@router.get('/{product_id}', response_model=ProductResponse, summary='Get product by ID')
def get_product(product_id: int, db: Session = Depends(get_db)) -> ProductResponse:
    """Retrieve a single product by its unique integer identifier."""
    product = get_product_by_id(db, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} not found.',
        )
    response = ProductResponse.model_validate(product)
    # Enrich the additive `offers` field with merchant identity + visit URLs so
    # the product detail payload is self-sufficient. Legacy consumers ignore it.
    response.offers = [
        ProductOfferResponse.model_validate(offer)
        for offer in serialize_offers(db, list(product.offers), product_id, product.name)
    ]
    return response
