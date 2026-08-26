from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem


def parse_currency_value(value: str | int | float | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)

    cleaned = ''.join(ch for ch in str(value) if ch.isdigit() or ch in {'.', '-'})
    if not cleaned:
        return 0.0
    return float(cleaned)


def format_currency(value: float) -> str:
    return f'₹{value:,.2f}'.replace('.00', '')


def get_user_orders(db: Session, user_id: int) -> list[Order]:
    return db.query(Order).filter(Order.user_id == user_id).order_by(Order.created_at.desc()).all()


def get_order_for_user(db: Session, user_id: int, order_id: int) -> Order | None:
    return db.query(Order).filter(Order.id == order_id, Order.user_id == user_id).first()


def create_order_from_cart(db: Session, user_id: int) -> Order:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Cart is empty.',
        )

    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.id).all()
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Cart is empty.',
        )

    total_value = 0.0
    for item in cart_items:
        if not item.product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f'Product with ID {item.product_id} was not found.',
            )
        total_value += parse_currency_value(item.product.price) * item.quantity

    order = Order(
        user_id=user_id,
        total_amount=format_currency(total_value),
        status='pending',
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    for item in cart_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            product_name=item.product.name,
            quantity=item.quantity,
            selected_size=item.selected_size,
            price_at_purchase=item.product.price,
        )
        db.add(order_item)

    db.commit()
    db.refresh(order)

    # Record one purchase signal per ordered product so personalization and
    # analytics reflect real purchases. Bookkeeping failures never fail orders.
    from app.services.event_service import record_user_event

    for item in cart_items:
        try:
            record_user_event(
                db,
                event_type='order_created',
                user_id=user_id,
                product_id=item.product_id,
                event_metadata={'quantity': int(item.quantity)},
            )
        except Exception:
            db.rollback()

    for item in cart_items:
        db.delete(item)
    db.commit()

    return order
