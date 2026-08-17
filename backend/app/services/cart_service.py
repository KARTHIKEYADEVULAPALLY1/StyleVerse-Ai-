from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cart import Cart, CartItem
from app.models.product import Product


def get_or_create_cart(db: Session, user_id: int) -> Cart:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if cart:
        return cart

    cart = Cart(user_id=user_id)
    db.add(cart)
    db.commit()
    db.refresh(cart)
    return cart


def get_cart_items(db: Session, user_id: int) -> list[CartItem]:
    return (
        db.query(CartItem)
        .join(Cart, Cart.id == CartItem.cart_id)
        .filter(Cart.user_id == user_id)
        .order_by(CartItem.updated_at.desc())
        .all()
    )


def find_cart_item(db: Session, user_id: int, product_id: int, selected_size: str | None = None) -> CartItem | None:
    cart = db.query(Cart).filter(Cart.user_id == user_id).first()
    if not cart:
        return None

    query = db.query(CartItem).filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id)
    if selected_size is not None:
        query = query.filter(CartItem.selected_size == selected_size)
    return query.first()


def add_item_to_cart(db: Session, user_id: int, product_id: int, quantity: int, selected_size: str) -> CartItem:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} not found.',
        )

    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Quantity must be greater than zero.',
        )

    cart = get_or_create_cart(db, user_id)
    item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.id, CartItem.product_id == product_id, CartItem.selected_size == selected_size)
        .first()
    )

    if item:
        item.quantity += quantity
        db.commit()
        db.refresh(item)
        return item

    item = CartItem(
        cart_id=cart.id,
        product_id=product_id,
        quantity=quantity,
        selected_size=selected_size,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_cart_item_quantity(
    db: Session,
    user_id: int,
    product_id: int,
    quantity: int,
    selected_size: str | None = None,
) -> CartItem:
    item = find_cart_item(db, user_id, product_id, selected_size)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} is not in your cart.',
        )

    if quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Quantity must be greater than zero.',
        )

    item.quantity = quantity
    db.commit()
    db.refresh(item)
    return item


def remove_cart_item(db: Session, user_id: int, product_id: int, selected_size: str | None = None) -> None:
    item = find_cart_item(db, user_id, product_id, selected_size)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} is not in your cart.',
        )

    db.delete(item)
    db.commit()
