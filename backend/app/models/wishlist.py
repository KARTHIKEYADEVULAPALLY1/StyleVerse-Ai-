from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Wishlist(Base):
    __tablename__ = 'wishlists'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped['User'] = relationship('User', back_populates='wishlist')
    items: Mapped[list['WishlistItem']] = relationship(
        'WishlistItem',
        back_populates='wishlist',
        cascade='all, delete-orphan',
    )


class WishlistItem(Base):
    __tablename__ = 'wishlist_items'
    __table_args__ = (
        UniqueConstraint('wishlist_id', 'product_id', name='uq_wishlist_product'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    wishlist_id: Mapped[int] = mapped_column(ForeignKey('wishlists.id'), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    wishlist: Mapped['Wishlist'] = relationship('Wishlist', back_populates='items')
    product: Mapped['Product'] = relationship('Product', back_populates='wishlist_items')


from app.models.product import Product  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
