from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, JSON, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserPreference(Base):
    """The explicit, user-provided style choices collected during onboarding."""

    __tablename__ = 'user_preferences'
    __table_args__ = (UniqueConstraint('user_id', name='uq_user_preferences_user_id'),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)

    # Multi-select preference fields
    preferred_styles: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    preferred_categories: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    preferred_colors: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    preferred_brands: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    preferred_price_min: Mapped[float | None] = mapped_column(Float, nullable=True)
    preferred_price_max: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Legacy fields kept for backward compatibility
    style: Mapped[str | None] = mapped_column(String(30), nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(30), nullable=True)
    color_palette: Mapped[str | None] = mapped_column(String(30), nullable=True)
    budget: Mapped[int | None] = mapped_column(Integer, nullable=True)

    skipped: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

