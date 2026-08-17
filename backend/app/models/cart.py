from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Cart(Base):
    __tablename__ = 'carts'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped['User'] = relationship('User', back_populates='cart')
    items: Mapped[list['CartItem']] = relationship(
        'CartItem',
        back_populates='cart',
        cascade='all, delete-orphan',
    )


class CartItem(Base):
    __tablename__ = 'cart_items'
    __table_args__ = (
        UniqueConstraint('cart_id', 'product_id', 'selected_size', name='uq_cart_product_size'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cart_id: Mapped[int] = mapped_column(ForeignKey('carts.id'), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False, index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    selected_size: Mapped[str] = mapped_column(String(50), nullable=False, default='One Size')
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    cart: Mapped['Cart'] = relationship('Cart', back_populates='items')
    product: Mapped['Product'] = relationship('Product', back_populates='cart_items')


from app.models.product import Product  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
