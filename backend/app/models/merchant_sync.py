from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MerchantSync(Base):
    """One execution of a merchant connector sync (manual or scheduled).

    Recorded for every run so the admin dashboard can show real operational
    history: counts processed, duration, and the last failure reason.
    """

    __tablename__ = 'merchant_syncs'

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    merchant_id: Mapped[int] = mapped_column(
        ForeignKey('merchants.id'),
        nullable=False,
        index=True,
    )
    # pending -> running -> completed | failed
    status: Mapped[str] = mapped_column(String(20), nullable=False, default='pending')
    #: What started this run: 'manual' (admin button/API) or 'scheduled'.
    trigger_type: Mapped[str] = mapped_column(String(20), nullable=False, default='manual')
    products_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    offers_processed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    #: JSON document with detailed ingestion statistics (records received /
    #: valid / invalid, products & offers created vs updated, duplicates,
    #: row-level errors). Parsed and exposed through the admin API.
    result_stats: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    merchant: Mapped['Merchant'] = relationship('Merchant', back_populates='syncs')


from app.models.merchant import Merchant  # noqa: E402,F401
