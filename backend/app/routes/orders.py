from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.routes.auth import get_current_user
from app.schemas.order import OrderItemResponse, OrderResponse
from app.services.order_service import create_order_from_cart, get_order_for_user, get_user_orders

router = APIRouter(prefix='/api/orders', tags=['orders'])


def serialize_order(order) -> OrderResponse:
    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at,
        items=[
            OrderItemResponse(
                id=item.id,
                order_id=item.order_id,
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=item.quantity,
                selected_size=item.selected_size,
                price_at_purchase=item.price_at_purchase,
                created_at=item.created_at,
            )
            for item in order.items
        ],
    )


@router.post('', response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
def create_order(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    order = create_order_from_cart(db, current_user.id)
    return serialize_order(order)


@router.get('', response_model=list[OrderResponse])
def list_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrderResponse]:
    orders = get_user_orders(db, current_user.id)
    return [serialize_order(order) for order in orders]


@router.get('/{order_id}', response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderResponse:
    order = get_order_for_user(db, current_user.id, order_id)
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Order not found.',
        )
    return serialize_order(order)
