from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # Admin role flag - additive; existing users default to False.
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    wishlist: Mapped['Wishlist | None'] = relationship(
        'Wishlist',
        back_populates='user',
        uselist=False,
        cascade='all, delete-orphan',
    )
    cart: Mapped['Cart | None'] = relationship(
        'Cart',
        back_populates='user',
        uselist=False,
        cascade='all, delete-orphan',
    )
    orders: Mapped[list['Order']] = relationship(
        'Order',
        back_populates='user',
        cascade='all, delete-orphan',
    )


from app.models.cart import Cart  # noqa: E402,F401
from app.models.order import Order  # noqa: E402,F401
from app.models.wishlist import Wishlist  # noqa: E402,F401
