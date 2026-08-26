from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Merchant(Base):
    """A fashion store / marketplace that can supply products and offers to StyleVerse.

    Merchants are configuration records only at this stage - no live merchant
    integrations exist yet. Future connectors are linked to a Merchant row by slug.
    """

    __tablename__ = 'merchants'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    website_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # --- Automated sync configuration (admin-managed only) ---
    #: Master switch for automated background syncing of this merchant.
    sync_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    #: Minutes between automated sync runs. Validated by the admin API
    #: (SYNC_INTERVAL_MIN / MAX) - never trusted from arbitrary clients.
    sync_interval_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    #: Timestamp of the most recent sync that completed successfully.
    last_successful_sync: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    #: When the background scheduler should next run this merchant's connector.
    next_scheduled_sync: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # --- Real merchant feed configuration (admin-managed only) ---
    #: Where product data comes from: 'mock' (bundled sample data, the
    #: historical default) or 'url' (a real remote CSV/JSON merchant feed).
    feed_type: Mapped[str] = mapped_column(String(20), nullable=False, default='mock')
    #: Remote feed URL. Only http(s), validated against SSRF targets.
    feed_url: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    #: Wire format of the feed: 'csv' or 'json'.
    feed_format: Mapped[str | None] = mapped_column(String(10), nullable=True)
    #: NAME of an environment variable holding the feed auth token. The secret
    #: itself never touches the database and is never logged.
    feed_auth_env_var: Mapped[str | None] = mapped_column(String(100), nullable=True)
    #: Search keywords / query used by API-based sources (e.g. the Etsy
    #: connector's ``keywords`` parameter). Empty = source default.
    feed_query: Mapped[str | None] = mapped_column(String(200), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    offers: Mapped[list['ProductOffer']] = relationship(
        'ProductOffer',
        back_populates='merchant',
    )
    syncs: Mapped[list['MerchantSync']] = relationship(
        'MerchantSync',
        back_populates='merchant',
        cascade='all, delete-orphan',
    )