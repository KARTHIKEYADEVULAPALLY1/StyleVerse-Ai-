from __future__ import annotations

from typing import List

from sqlalchemy import Boolean, Float, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from pgvector.sqlalchemy import Vector
except ImportError:  # pragma: no cover
    Vector = None

from app.database import Base


class Product(Base):
    __tablename__ = 'products'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    brand: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True, default='')
    price: Mapped[str] = mapped_column(String(50), nullable=False)
    original_price: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rating: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    image: Mapped[str] = mapped_column(String(500), nullable=False)
    store: Mapped[str] = mapped_column(String(100), nullable=False)
    colors: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    sizes: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    embedding: Mapped[List[float] | str | None] = mapped_column(
        Vector(64) if Vector is not None else Text,
        nullable=True,
    )
    # Soft-visibility flag: ingested/legacy products can be hidden without deletion.
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    wishlist_items: Mapped[list['WishlistItem']] = relationship(
        'WishlistItem',
        back_populates='product',
    )
    cart_items: Mapped[list['CartItem']] = relationship(
        'CartItem',
        back_populates='product',
    )
    order_items: Mapped[list['OrderItem']] = relationship(
        'OrderItem',
        back_populates='product',
    )
    offers: Mapped[list['ProductOffer']] = relationship(
        'ProductOffer',
        back_populates='product',
        cascade='all, delete-orphan',
    )


from app.models.order import OrderItem  # noqa: E402,F401
from app.models.product_offer import ProductOffer  # noqa: E402,F401
from app.models.wishlist import WishlistItem  # noqa: E402,F401
