"""Privacy-conscious user behavior event tracking.

Stores only meaningful fashion-commerce interactions (product views,
searches, wishlist/cart actions, orders, merchant clicks, AI feature usage)
so StyleVerse can improve personalization over time.

Privacy rules enforced by design:

* authenticated events may be associated with ``user_id``; anonymous browsing
  uses a random, non-identifying session identifier (uuid hex) - never an IP
  address or device fingerprint;
* passwords, payment data and sensitive personal information are NEVER stored
  here - the API rejects/rejects-scrubs such payloads via
  ``event_service.sanitize_event_metadata``;
* uploaded images (e.g. virtual try-on photos) are never referenced or stored
  in analytics metadata;
* ``event_type`` must come from the controlled list in
  ``app.services.event_service.EVENT_TYPES``.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserEvent(Base):
    """One recorded user interaction event."""

    __tablename__ = 'user_events'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    #: Set only for authenticated users; anonymous events stay anonymous.
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey('users.id'),
        nullable=True,
        index=True,
    )
    #: Random per-browser identifier (uuid4 hex) - not tied to any identity.
    session_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    #: Controlled vocabulary - see event_service.EVENT_TYPES.
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    product_id: Mapped[int | None] = mapped_column(
        ForeignKey('products.id'),
        nullable=True,
        index=True,
    )
    merchant_id: Mapped[int | None] = mapped_column(
        ForeignKey('merchants.id'),
        nullable=True,
        index=True,
    )
    #: Small, sanitized, non-sensitive context (e.g. {"occasion": "date_night"}).
    #: The attribute cannot be named ``metadata`` (reserved by SQLAlchemy
    #: Declarative), so it is mapped onto the ``metadata`` column explicitly.
    event_metadata: Mapped[dict | None] = mapped_column('metadata', JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )


from app.models.merchant import Merchant  # noqa: E402,F401
from app.models.product import Product  # noqa: E402,F401
from app.models.user import User  # noqa: E402,F401
