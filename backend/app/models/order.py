from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = 'orders'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), nullable=False, index=True)
    total_amount: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default='pending', nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped['User'] = relationship('User', back_populates='orders')
    items: Mapped[list['OrderItem']] = relationship(
        'OrderItem',
        back_populates='order',
        cascade='all, delete-orphan',
    )


class OrderItem(Base):
    __tablename__ = 'order_items'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey('orders.id'), nullable=False, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False, index=True)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    selected_size: Mapped[str] = mapped_column(String(50), nullable=False, default='One Size')
    price_at_purchase: Mapped[str] = mapped_column(String(50), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    order: Mapped['Order'] = relationship('Order', back_populates='items')
    product: Mapped['Product'] = relationship('Product', back_populates='order_items')


from app.models.product import Product  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
