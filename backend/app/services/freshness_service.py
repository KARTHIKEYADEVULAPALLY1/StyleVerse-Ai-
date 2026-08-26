"""Data-freshness policy for ProductOffer rows.

Every offer carries ``last_updated`` (set by the ingestion pipeline whenever
the connector confirms current data). This module turns that timestamp into a
simple, configurable freshness grade the whole product surface shares:

    fresh   - confirmed within FRESH_OFFER_MINUTES      (default 30)
    aging   - within AGING_OFFER_MINUTES                (default 120)
    stale   - older than that
    unknown - no timestamp recorded yet

Thresholds come from the environment so operators can tune them without a
code change; invalid values fall back to the defaults.
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

FRESH = 'fresh'
AGING = 'aging'
STALE = 'stale'
UNKNOWN = 'unknown'

DEFAULT_FRESH_MINUTES = 30
DEFAULT_AGING_MINUTES = 120


def _env_minutes(var_name: str, default: int) -> int:
    raw = os.getenv(var_name, str(default))
    try:
        return max(0, int(raw))
    except (TypeError, ValueError):
        return default


def get_freshness_thresholds() -> tuple[int, int]:
    """Return (fresh_minutes, aging_minutes) from configuration."""
    fresh = _env_minutes('FRESH_OFFER_MINUTES', DEFAULT_FRESH_MINUTES)
    aging = _env_minutes('AGING_OFFER_MINUTES', DEFAULT_AGING_MINUTES)
    # Aging must never be shorter than fresh, otherwise nothing is ever aging.
    if aging < fresh:
        aging = fresh
    return fresh, aging


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _as_aware(value: datetime) -> datetime:
    """Normalize naive datetimes (SQLite/local rows) to UTC-aware."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def freshness_status(
    last_updated: datetime | None,
    now: datetime | None = None,
) -> str:
    """Grade one offer timestamp against the configured freshness policy."""
    if last_updated is None:
        return UNKNOWN
    reference = _as_aware(now) if now is not None else _utc_now()
    age = reference - _as_aware(last_updated)
    if age < timedelta(0):
        # Future timestamps (clock skew) count as maximally fresh.
        return FRESH
    fresh_minutes, aging_minutes = get_freshness_thresholds()
    if age <= timedelta(minutes=fresh_minutes):
        return FRESH
    if age <= timedelta(minutes=aging_minutes):
        return AGING
    return STALE


def freshness_summary(statuses: list[str]) -> dict[str, int]:
    """Count offers per freshness grade for dashboard cards."""
    counts = {FRESH: 0, AGING: 0, STALE: 0, UNKNOWN: 0}
    for status in statuses:
        counts[status] = counts.get(status, 0) + 1
    return counts


__all__ = [
    'FRESH',
    'AGING',
    'STALE',
    'UNKNOWN',
    'get_freshness_thresholds',
    'freshness_status',
    'freshness_summary',
]
