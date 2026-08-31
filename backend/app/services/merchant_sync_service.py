"""Merchant connector sync orchestration.

Runs one merchant's existing connector through the established ingestion
pipeline (fetch -> normalize -> dedupe -> upsert) and records every execution
in ``MerchantSync`` so the admin dashboard shows real operational data.

Safety properties:
  * duplicate-proof: the ingestion pipeline upserts by
    ``(merchant_id, merchant_product_id)`` and never duplicates offers;
  * failure-safe: exceptions are recorded on the sync row and rolled back -
    previously imported products/offers are never deleted;
  * serialized per merchant: a second sync cannot start while one is
    pending/running for the same merchant.
"""
from __future__ import annotations

import json
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.connectors import get_connector
from app.connectors.etsy_connector import EtsyConnector
from app.connectors.feed_connector import MerchantFeedConnector
from app.models.merchant import Merchant
from app.models.merchant_sync import MerchantSync
from app.services.freshness_service import freshness_status, freshness_summary
from app.services.ingestion_service import (
    get_or_create_merchant,
    ingest_external_products,
    run_connector_ingestion,
)

# Bounds for the per-merchant sync interval. Deliberately generous on the low
# end so automated syncing can never hammer a merchant source every few
# seconds, even if an admin API caller asks for it.
DEFAULT_SYNC_INTERVAL_MINUTES = 60
MAX_SYNC_INTERVAL_MINUTES = 7 * 24 * 60  # one week


def _min_interval() -> int:
    raw = os.getenv('SYNC_INTERVAL_MIN_MINUTES', '5')
    try:
        return int(raw)
    except (TypeError, ValueError):
        return 5


MIN_SYNC_INTERVAL_MINUTES = max(1, _min_interval())




class SyncAlreadyRunningError(RuntimeError):
    """Raised when a sync is requested while another one is in flight."""


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_connector_status(merchant: Merchant) -> str:
    """Report whether a registered connector can currently serve this merchant."""
    source = get_merchant_source(merchant)
    if source == 'etsy':
        connector = EtsyConnector(merchant.slug)
        if not connector.is_configured():
            return 'not_connected'
        return 'connected' if connector.is_available() else 'disabled'
    try:
        connector = get_connector(merchant.slug)
    except Exception:  # noqa: BLE001 - no connector registered for slug
        return 'not_registered'
    try:
        return 'available' if connector.is_available() else 'unavailable'
    except Exception:  # noqa: BLE001 - availability probe must never crash the API
        return 'unavailable'


def get_merchant_overview(db: Session, merchant: Merchant) -> dict[str, Any]:
    """Aggregate real database facts for one merchant's dashboard card."""
    offers = list(merchant.offers or [])
    product_ids = {offer.product_id for offer in offers}

    latest_sync = (
        db.query(MerchantSync)
        .filter(MerchantSync.merchant_id == merchant.id)
        .order_by(MerchantSync.id.desc())
        .first()
    )
    last_success = (
        db.query(MerchantSync)
        .filter(MerchantSync.merchant_id == merchant.id, MerchantSync.status == 'completed')
        .order_by(MerchantSync.id.desc())
        .first()
    )

    reference = last_success or latest_sync
    return {
        'product_count': len(product_ids),
        'offer_count': len(offers),
        'connector_status': get_connector_status(merchant) if merchant.is_active else 'inactive',
        # Prefer the most recent successful sync for "last successful sync";
        # fall back to the newest run so failures stay visible.
        'last_sync_at': reference.completed_at if reference else None,
        'last_sync_status': reference.status if reference else None,
        'last_sync_duration_ms': reference.duration_ms if reference else None,
        'last_sync_error': latest_sync.error_message if latest_sync else None,
        # Automated-sync configuration + freshness breakdown for the dashboard.
        'sync_enabled': bool(merchant.sync_enabled),
        'sync_interval_minutes': merchant.sync_interval_minutes,
        'last_successful_sync': merchant.last_successful_sync,
        'next_scheduled_sync': merchant.next_scheduled_sync,
        # Real feed configuration (admin-managed).
        'feed_type': merchant.feed_type or 'mock',
        'feed_url': merchant.feed_url,
        'feed_format': merchant.feed_format,
        'feed_query': merchant.feed_query,
        'has_feed_configured': has_feed_configured(merchant),
        **get_freshness_counts(offers),
    }


def get_freshness_counts(offers: list) -> dict[str, int]:
    """Fresh / aging / stale offer counts for one merchant's catalog slice."""
    return freshness_summary([freshness_status(offer.last_updated) for offer in offers])


def _as_aware(value: datetime) -> datetime:
    """Normalize naive datetimes (SQLite rows) to UTC-aware comparisons."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def get_sync_state(db: Session, merchant: Merchant) -> dict[str, Any]:
    """Current scheduler-facing state for one merchant (admin status endpoint)."""
    active = (
        db.query(MerchantSync)
        .filter(
            MerchantSync.merchant_id == merchant.id,
            MerchantSync.status.in_(('pending', 'running')),
        )
        .order_by(MerchantSync.id.desc())
        .first()
    )
    last_run = (
        db.query(MerchantSync)
        .filter(MerchantSync.merchant_id == merchant.id)
        .order_by(MerchantSync.id.desc())
        .first()
    )
    if active is not None:
        state = 'syncing'
    elif not merchant.sync_enabled or not merchant.is_active:
        state = 'disabled'
    else:
        state = 'idle'
    overview = get_merchant_overview(db, merchant)
    return {
        'merchant_id': merchant.id,
        'slug': merchant.slug,
        'state': state,
        'sync_enabled': bool(merchant.sync_enabled),
        'merchant_active': bool(merchant.is_active),
        'sync_interval_minutes': merchant.sync_interval_minutes,
        'last_successful_sync': merchant.last_successful_sync,
        'next_scheduled_sync': merchant.next_scheduled_sync,
        'active_sync': (
            {
                'id': active.id,
                'status': active.status,
                'started_at': active.started_at,
                'trigger_type': getattr(active, 'trigger_type', None) or 'manual',
            }
            if active is not None
            else None
        ),
        'last_run': (
            {
                'id': last_run.id,
                'status': last_run.status,
                'trigger_type': getattr(last_run, 'trigger_type', None) or 'manual',
                'started_at': last_run.started_at,
                'completed_at': last_run.completed_at,
                'duration_ms': last_run.duration_ms,
                'error_message': last_run.error_message,
            }
            if last_run is not None
            else None
        ),
        'fresh_offers': overview['fresh'],
        'aging_offers': overview['aging'],
        'stale_offers': overview['stale'],
    }


def update_sync_config(db: Session, merchant: Merchant, updates: dict[str, Any]) -> Merchant:
    """Apply admin-approved sync configuration changes.

    Only whitelisted fields are touched and the interval is clamped into a
    safe range - arbitrary client values never reach the database directly.
    """
    if updates.get('sync_enabled') is not None:
        merchant.sync_enabled = bool(updates['sync_enabled'])

    interval_changed = False
    if updates.get('sync_interval_minutes') is not None:
        merchant.sync_interval_minutes = normalize_interval_minutes(
            updates['sync_interval_minutes']
        )
        interval_changed = True

    # Real feed configuration (validated further by the admin API layer).
    feed_type = updates.get('feed_type')
    if feed_type is not None:
        normalized = str(feed_type).strip().lower()
        if normalized not in VALID_SOURCE_TYPES:
            raise ValueError("feed_type must be 'mock', 'url' or 'etsy'.")
        merchant.feed_type = normalized

    if updates.get('feed_url') is not None:
        merchant.feed_url = str(updates['feed_url']).strip() or None

    feed_format = updates.get('feed_format')
    if feed_format is not None:
        normalized_format = str(feed_format).strip().lower() or None
        if normalized_format not in (None, 'csv', 'json'):
            raise ValueError("feed_format must be 'csv' or 'json'.")
        merchant.feed_format = normalized_format

    if updates.get('feed_query') is not None:
        merchant.feed_query = str(updates['feed_query']).strip()[:200] or None

    if updates.get('feed_auth_env_var') is not None:
        merchant.feed_auth_env_var = str(updates['feed_auth_env_var']).strip() or None

    # Re-plan the schedule so a new cadence takes effect immediately instead
    # of at the previously planned moment.
    if not merchant.sync_enabled:
        merchant.next_scheduled_sync = None
    elif merchant.next_scheduled_sync is None or interval_changed:
        merchant.next_scheduled_sync = compute_next_scheduled_sync(merchant)

    db.commit()
    db.refresh(merchant)
    return merchant


def list_merchant_syncs(db: Session, merchant_id: int, limit: int = 20) -> list[MerchantSync]:
    """Recent sync runs for one merchant, newest first."""
    return (
        db.query(MerchantSync)
        .filter(MerchantSync.merchant_id == merchant_id)
        .order_by(MerchantSync.id.desc())
        .limit(limit)
        .all()
    )


def has_active_sync(db: Session, merchant_id: int) -> bool:
    """True when a pending/running sync already exists for this merchant."""
    return (
        db.query(MerchantSync)
        .filter(
            MerchantSync.merchant_id == merchant_id,
            MerchantSync.status.in_(('pending', 'running')),
        )
        .first()
        is not None
    )


def compute_next_scheduled_sync(merchant: Merchant, now: datetime | None = None) -> datetime | None:
    """Next run time for this merchant, or None when automated sync is off."""
    if not merchant.sync_enabled:
        return None
    interval = normalize_interval_minutes(merchant.sync_interval_minutes)
    reference = now or _utc_now()
    return reference + timedelta(minutes=interval)


def normalize_interval_minutes(value: Any) -> int:
    """Clamp an interval into the safe configurable range."""
    try:
        minutes = int(value)
    except (TypeError, ValueError):
        minutes = DEFAULT_SYNC_INTERVAL_MINUTES
    return max(MIN_SYNC_INTERVAL_MINUTES, min(MAX_SYNC_INTERVAL_MINUTES, minutes))


def get_due_merchants(db: Session, now: datetime | None = None) -> list[Merchant]:
    """Merchants whose automated sync is enabled and due to run."""
    reference = now or _utc_now()
    merchants = (
        db.query(Merchant)
        .filter(
            Merchant.sync_enabled.is_(True),
            Merchant.is_active.is_(True),
        )
        .order_by(Merchant.id.asc())
        .all()
    )
    return [
        merchant
        for merchant in merchants
        if merchant.next_scheduled_sync is None
        or _as_aware(merchant.next_scheduled_sync) <= _as_aware(reference)
    ]


VALID_SOURCE_TYPES = ('mock', 'url', 'etsy')


def get_merchant_source(merchant: Merchant) -> str:
    """Normalized data-source type for this merchant ('mock'|'url'|'etsy')."""
    source = (merchant.feed_type or 'mock').strip().lower()
    return source if source in VALID_SOURCE_TYPES else 'mock'


def has_feed_configured(merchant: Merchant) -> bool:
    """True when this merchant syncs from a real remote source (feed or API)."""
    source = get_merchant_source(merchant)
    if source == 'url':
        return bool((merchant.feed_url or '').strip()) and (
            merchant.feed_format or ''
        ) in ('csv', 'json')
    if source == 'etsy':
        # Configuration itself lives in environment variables; the sync/test
        # paths produce readable errors when the key is missing/disabled.
        return True
    return False


def build_sync_stats(result: dict[str, Any]) -> dict[str, Any]:
    """Normalize an ingestion result into the recorded sync statistics."""
    received = int(result.get('records_received', result.get('received', 0)))
    invalid = int(result.get('records_invalid', result.get('skipped', 0)))
    products_created = int(result.get('products_created', 0))
    products_matched = int(result.get('products_matched', 0))
    offers_created = int(result.get('offers_created', 0))
    offers_updated = int(result.get('offers_updated', 0))
    return {
        'records_received': received,
        'records_valid': int(result.get('records_valid', max(0, received - invalid))),
        'records_invalid': invalid,
        'products_created': products_created,
        'products_updated': products_matched,
        'offers_created': offers_created,
        'offers_updated': offers_updated,
        # Records deduplicated instead of duplicated: re-seen external ids
        # updated their existing offer in place.
        'duplicates_detected': offers_updated + products_matched,
        'errors': list(result.get('errors', []))[:50],
    }


def parse_result_stats(sync: MerchantSync) -> dict[str, Any] | None:
    """Decode the JSON statistics stored on a sync row."""
    raw = getattr(sync, 'result_stats', None)
    if not raw:
        return None
    try:
        decoded = json.loads(raw)
        return decoded if isinstance(decoded, dict) else None
    except (TypeError, ValueError):
        return None


def _run_merchant_ingestion(db: Session, merchant: Merchant) -> dict[str, Any]:
    """Run this merchant's configured source through the ingestion pipeline.

    ``feed_type == 'url'`` merchants pull a real remote CSV/JSON feed via
    ``MerchantFeedConnector``; ``feed_type == 'etsy'`` merchants pull active
    listings from the official Etsy Open API v3 via ``EtsyConnector``;
    everyone else keeps using the registered mock connector exactly as
    before. All paths share normalization + deduplication + offer upsert.
    """
    source_type = get_merchant_source(merchant)

    if source_type in ('url', 'etsy'):
        if source_type == 'etsy':
            connector = EtsyConnector(
                merchant.slug,
                keywords=(merchant.feed_query or '').strip() or None,
            )
        else:
            connector = MerchantFeedConnector(
                merchant.slug,
                merchant.feed_url,
                merchant.feed_format,
                merchant.feed_auth_env_var,
            )
        report = connector.fetch_with_report()
        source_merchant = get_or_create_merchant(db, slug=merchant.slug, name=merchant.name)
        result = ingest_external_products(db, report.products, source_merchant)
        # Quarantined validation rows join pipeline skips as reported errors.
        validation_errors = [
            {
                'external_product_id': entry.get('external_product_id'),
                'row_index': entry.get('row_index'),
                'error': '; '.join(entry.get('errors') or []),
            }
            for entry in report.invalid_records
        ]
        result['records_received'] = report.records_received
        result['records_valid'] = report.valid_count
        result['records_invalid'] = report.invalid_count
        result['errors'] = validation_errors + list(result.get('errors', []))
        result['skipped'] = int(result.get('skipped', 0)) + report.invalid_count
        result['connector'] = type(connector).__name__
        return result

    result = run_connector_ingestion(db, merchant.slug)
    received = int(result.get('received', 0))
    skipped = int(result.get('skipped', 0))
    result['records_received'] = received
    result['records_valid'] = max(0, received - skipped)
    result['records_invalid'] = skipped
    return result


def run_manual_sync(db: Session, merchant: Merchant) -> MerchantSync:
    """Execute one manual connector sync end-to-end and record the result."""
    return _execute_sync(db, merchant, trigger='manual')


def run_scheduled_sync(db: Session, merchant: Merchant) -> MerchantSync:
    """Execute one scheduled connector sync end-to-end and record the result.

    Identical safety properties to the manual path; only ``trigger_type``
    differs so history can show which runs were automated.
    """
    return _execute_sync(db, merchant, trigger='scheduled')


def run_sync(db: Session, merchant: Merchant, trigger: str = 'manual') -> MerchantSync:
    """Shared execution path for manual and scheduled connector syncs."""
    return _execute_sync(db, merchant, trigger=trigger)


def _execute_sync(db: Session, merchant: Merchant, trigger: str = 'manual') -> MerchantSync:
    """Run one connector sync end-to-end and record the result.

    Serialized per merchant (a pending/running row blocks a new one),
    failure-safe (previous catalog data is never wiped), and fully recorded
    in ``MerchantSync`` history including the next scheduled run time.
    """
    if has_active_sync(db, merchant.id):
        raise SyncAlreadyRunningError(
            f'A sync for merchant "{merchant.slug}" is already running.'
        )

    sync = MerchantSync(
        merchant_id=merchant.id,
        status='running',
        trigger_type='scheduled' if trigger == 'scheduled' else 'manual',
        started_at=_utc_now(),
    )
    db.add(sync)
    db.commit()
    db.refresh(sync)

    started = time.perf_counter()

    try:
        result = _run_merchant_ingestion(db, merchant)
        duration_ms = int((time.perf_counter() - started) * 1000)
        sync.status = 'completed'
        sync.products_processed = int(result.get('products_created', 0)) + int(
            result.get('products_matched', 0)
        )
        sync.offers_processed = int(result.get('offers_created', 0)) + int(
            result.get('offers_updated', 0)
        )
        skipped = int(result.get('records_invalid', result.get('skipped', 0)))
        if skipped:
            sync.error_message = f'{skipped} record(s) quarantined or skipped during ingestion.'
        # Detailed statistics for the admin dashboard (capped for storage).
        sync.result_stats = json.dumps(build_sync_stats(result))[:20000]
    except Exception as exc:  # noqa: BLE001 - every failure must be recorded
        # Roll back any partial session state; committed data stays intact.
        db.rollback()
        duration_ms = int((time.perf_counter() - started) * 1000)
        sync.status = 'failed'
        sync.products_processed = 0
        sync.offers_processed = 0
        sync.error_message = str(exc)[:1000]

    sync.completed_at = _utc_now()
    sync.duration_ms = duration_ms

    # Bookkeeping on the merchant row: stamp success and plan the next run.
    # Failures also schedule a retry at the normal cadence - previous valid
    # product/offer data is never wiped either way.
    if sync.status == 'completed':
        merchant.last_successful_sync = sync.completed_at
    merchant.next_scheduled_sync = compute_next_scheduled_sync(merchant, sync.completed_at)

    db.commit()
    db.refresh(sync)
    return sync


def dashboard_summary(db: Session) -> dict[str, int]:
    """Real totals for the dashboard summary cards."""
    merchants = db.query(Merchant).order_by(Merchant.id.asc()).all()
    total_products = 0
    total_offers = 0
    active_merchants = 0
    for merchant in merchants:
        if merchant.is_active:
            active_merchants += 1
        offers = list(merchant.offers or [])
        total_products += len({offer.product_id for offer in offers})
        total_offers += len(offers)

    return {
        'active_merchants': active_merchants,
        'total_merchants': len(merchants),
        'total_products': total_products,
        'total_offers': total_offers,
        'successful_syncs': db.query(MerchantSync).filter(MerchantSync.status == 'completed').count(),
        'failed_syncs': db.query(MerchantSync).filter(MerchantSync.status == 'failed').count(),
    }
