from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.wishlist import Wishlist, WishlistItem


def get_or_create_wishlist(db: Session, user_id: int) -> Wishlist:
    wishlist = db.query(Wishlist).filter(Wishlist.user_id == user_id).first()
    if wishlist:
        return wishlist

    wishlist = Wishlist(user_id=user_id)
    db.add(wishlist)
    db.commit()
    db.refresh(wishlist)
    return wishlist


def get_user_wishlist_products(db: Session, user_id: int) -> list[Product]:
    return (
        db.query(Product)
        .join(WishlistItem, Product.id == WishlistItem.product_id)
        .join(Wishlist, Wishlist.id == WishlistItem.wishlist_id)
        .filter(Wishlist.user_id == user_id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )


def add_product_to_wishlist(db: Session, user_id: int, product_id: int) -> Product:
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} not found.',
        )

    wishlist = get_or_create_wishlist(db, user_id)
    existing_item = (
        db.query(WishlistItem)
        .filter(WishlistItem.wishlist_id == wishlist.id, WishlistItem.product_id == product_id)
        .first()
    )
    if existing_item:
        return product

    item = WishlistItem(wishlist_id=wishlist.id, product_id=product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return product


def remove_product_from_wishlist(db: Session, user_id: int, product_id: int) -> None:
    item = (
        db.query(WishlistItem)
        .join(Wishlist, Wishlist.id == WishlistItem.wishlist_id)
        .filter(Wishlist.user_id == user_id, WishlistItem.product_id == product_id)
        .first()
    )

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Product with ID {product_id} is not saved in your wishlist.',
        )

    db.delete(item)
    db.commit()
