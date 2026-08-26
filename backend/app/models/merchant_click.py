"""Merchant click tracking.

Records one row per outbound "View on Merchant" click so administrators can
see which merchants and products drive traffic. Privacy-conscious by design:

* only non-sensitive operational fields are stored (which offer/product/
  merchant was clicked, when, and a coarse referrer/user-agent snippet);
* unauthenticated visitors are tracked through a random, non-identifying
  session identifier (``sv_sid`` cookie) - never an IP address or fingerprint;
* authenticated users may optionally be associated via their user id;
* no passwords, payment data, addresses, or other personal information ever
  reaches this table.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class MerchantClick(Base):
    """One recorded click on a merchant offer ("View on Merchant")."""

    __tablename__ = 'merchant_clicks'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    offer_id: Mapped[int] = mapped_column(
        ForeignKey('product_offers.id'),
        nullable=False,
        index=True,
    )
    #: Nullable for legacy offers that are identified only by (product, store).
    merchant_id: Mapped[int | None] = mapped_column(
        ForeignKey('merchants.id'),
        nullable=True,
        index=True,
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey('products.id'),
        nullable=False,
        index=True,
    )
    #: Set only for authenticated users; anonymous clicks stay anonymous.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey('users.id'),
        nullable=True,
        index=True,
    )
    #: Random per-browser identifier (uuid4 hex) - not tied to any identity.
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    clicked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    #: Coarse first-party referrer path/host, truncated. No full URL params.
    referrer: Mapped[str | None] = mapped_column(String(500), nullable=True)
    #: Truncated user-agent snippet (browser family level usefulness only).
    user_agent: Mapped[str | None] = mapped_column(String(300), nullable=True)


from app.models.merchant import Merchant  # noqa: E402,F401
from app.models.product import Product  # noqa: E402,F401
from app.models.product_offer import ProductOffer  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401