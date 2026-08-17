from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProductOffer(Base):
    __tablename__ = 'product_offers'
    __table_args__ = (
        UniqueConstraint('product_id', 'store', name='uq_product_offer_store'),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    product_id: Mapped[int] = mapped_column(ForeignKey('products.id'), nullable=False, index=True)
    store: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default='INR')
    availability: Mapped[str] = mapped_column(String(50), nullable=False, default='In Stock')
    rating: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    product: Mapped['Product'] = relationship('Product', back_populates='offers')


from app.models.product import Product  # noqa: E402,F401
