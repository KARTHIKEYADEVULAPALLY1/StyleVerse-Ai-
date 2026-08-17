from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.product import ProductResponse
from app.schemas.wishlist import WishlistMessageResponse
from app.services.wishlist_service import (
    add_product_to_wishlist,
    get_user_wishlist_products,
    remove_product_from_wishlist,
)

router = APIRouter(prefix='/api/wishlist', tags=['wishlist'])


@router.get('', response_model=List[ProductResponse], summary='Get saved wishlist products')
def get_wishlist(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[ProductResponse]:
    products = get_user_wishlist_products(db, current_user.id)
    return [ProductResponse.model_validate(product) for product in products]


@router.post('/{product_id}', response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def add_to_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductResponse:
    product = add_product_to_wishlist(db, current_user.id, product_id)
    return ProductResponse.model_validate(product)


@router.delete('/{product_id}', response_model=WishlistMessageResponse)
def remove_from_wishlist(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WishlistMessageResponse:
    try:
        remove_product_from_wishlist(db, current_user.id, product_id)
    except HTTPException:
        raise

    return WishlistMessageResponse(detail='Product removed from wishlist.')
