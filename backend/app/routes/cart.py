from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.cart import CartItemCreate, CartItemResponse, CartItemUpdate, CartMessageResponse
from app.schemas.product import ProductResponse
from app.services.cart_service import (
    add_item_to_cart,
    get_cart_items,
    remove_cart_item,
    update_cart_item_quantity,
)

router = APIRouter(prefix='/api/cart', tags=['cart'])


@router.get('', response_model=List[CartItemResponse], summary='Get the signed-in user cart')
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[CartItemResponse]:
    items = get_cart_items(db, current_user.id)
    return [
        CartItemResponse(
            id=item.id,
            cart_id=item.cart_id,
            product_id=item.product_id,
            quantity=item.quantity,
            selected_size=item.selected_size,
            created_at=item.created_at,
            updated_at=item.updated_at,
            product=ProductResponse.model_validate(item.product),
        )
        for item in items
    ]


@router.post('', response_model=CartItemResponse, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    payload: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    item = add_item_to_cart(
        db,
        current_user.id,
        payload.product_id,
        payload.quantity,
        payload.selected_size,
    )
    return CartItemResponse(
        id=item.id,
        cart_id=item.cart_id,
        product_id=item.product_id,
        quantity=item.quantity,
        selected_size=item.selected_size,
        created_at=item.created_at,
        updated_at=item.updated_at,
        product=ProductResponse.model_validate(item.product),
    )


@router.patch('/{product_id}', response_model=CartItemResponse)
def update_cart_product(
    product_id: int,
    payload: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemResponse:
    item = update_cart_item_quantity(
        db,
        current_user.id,
        product_id,
        payload.quantity,
        payload.selected_size,
    )
    return CartItemResponse(
        id=item.id,
        cart_id=item.cart_id,
        product_id=item.product_id,
        quantity=item.quantity,
        selected_size=item.selected_size,
        created_at=item.created_at,
        updated_at=item.updated_at,
        product=ProductResponse.model_validate(item.product),
    )


@router.delete('/{product_id}', response_model=CartMessageResponse)
def remove_cart_product(
    product_id: int,
    payload: dict | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartMessageResponse:
    selected_size = None
    if payload:
        selected_size = payload.get('selected_size')
    remove_cart_item(db, current_user.id, product_id, selected_size)
    return CartMessageResponse(detail='Product removed from cart.')
