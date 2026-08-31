from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ProductOffer(Base):
    """A specific merchant's version/offer of a normalized StyleVerse Product.

    Legacy rows (seeded price-comparison data) have ``merchant_id = NULL`` and are
    identified only by ``(product_id, store)``. Ingested offers additionally carry
    the merchant FK and the merchant's own product id so re-ingestion can update
    the same offer instead of duplicating it.
    """

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

    # --- Multi-store connector fields (nullable for legacy seeded offers) ---
    merchant_id: Mapped[int | None] = mapped_column(
        ForeignKey('merchants.id'),
        nullable=True,
        index=True,
    )
    merchant_product_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    last_updated: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=True,
        onupdate=func.now(),
    )

    product: Mapped['Product'] = relationship('Product', back_populates='offers')
    merchant: Mapped['Merchant | None'] = relationship('Merchant', back_populates='offers')


from app.models.merchant import Merchant  # noqa: E402,F401
from app.models.product import Product  # noqa: E402,F401