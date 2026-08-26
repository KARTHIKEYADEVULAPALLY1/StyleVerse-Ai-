"""Tests for automated product/offer refresh and data freshness.

Covers: scheduled sync, disabled merchants, sync intervals, overlapping-sync
prevention, successful/failed refreshes, stale detection + freshness status,
previous-data preservation on failure, and admin authorization for the new
sync-config/sync-status endpoints.
"""
from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone

import pytest

import app.services.merchant_sync_service as sync_service
from app.models.merchant import Merchant
from app.models.merchant_sync import MerchantSync
from app.services.freshness_service import (
    AGING,
    FRESH,
    STALE,
    UNKNOWN,
    freshness_status,
)
from app.services.merchant_sync_service import (
    SyncAlreadyRunningError,
    get_due_merchants,
    run_scheduled_sync,
    update_sync_config,
)

ADMIN_HEADER = {'X-Admin-Key': 'test-admin-key-123'}


@pytest.fixture(autouse=True)
def _admin_key(monkeypatch):
    monkeypatch.setenv('ADMIN_API_KEY', 'test-admin-key-123')


def get_merchant(db, slug='amazon') -> Merchant:
    return db.query(Merchant).filter(Merchant.slug == slug).first()


# ---------------------------------------------------------------------------
# Freshness policy (unit level)
# ---------------------------------------------------------------------------

def test_freshness_status_grades():
    now = datetime.now(timezone.utc)
    assert freshness_status(now - timedelta(minutes=5), now) == FRESH
    assert freshness_status(now - timedelta(minutes=45), now) == AGING
    assert freshness_status(now - timedelta(hours=3), now) == STALE
    assert freshness_status(None) == UNKNOWN


def test_freshness_thresholds_are_configurable(monkeypatch):
    monkeypatch.setenv('FRESH_OFFER_MINUTES', '10')
    monkeypatch.setenv('AGING_OFFER_MINUTES', '20')
    from app.services import freshness_service

    now = datetime.now(timezone.utc)
    assert freshness_service.freshness_status(now - timedelta(minutes=5), now) == FRESH
    assert freshness_service.freshness_status(now - timedelta(minutes=15), now) == AGING
    assert freshness_service.freshness_status(now - timedelta(minutes=30), now) == STALE


def test_stale_detection_on_offer_rows(seeded_db):
    """An offer with an old last_updated grades stale; a fresh one does not."""
    from app.models.product_offer import ProductOffer

    offer = seeded_db.query(ProductOffer).first()
    offer.last_updated = datetime.now(timezone.utc) - timedelta(hours=5)
    seeded_db.commit()

    assert freshness_status(offer.last_updated) == STALE
    offer.last_updated = datetime.now(timezone.utc)
    assert freshness_status(offer.last_updated) == FRESH


def test_price_comparison_exposes_freshness_status(seeded_db, client):
    body = client.get('/api/products/2/prices').json()
    assert body['offers'], 'expected seeded offers for product 2'
    for offer in body['offers']:
        assert {'last_updated', 'freshness_status'} <= set(offer)
        assert offer['freshness_status'] in (FRESH, AGING, STALE, UNKNOWN)


# ---------------------------------------------------------------------------
# Sync scheduling configuration
# ---------------------------------------------------------------------------

def test_merchants_default_to_enabled_with_hourly_interval(seeded_db):
    merchant = get_merchant(seeded_db)
    assert merchant.sync_enabled is True
    assert merchant.sync_interval_minutes == 60


def test_disabled_merchant_is_never_due(seeded_db):
    merchant = get_merchant(seeded_db)
    merchant.sync_enabled = False
    merchant.next_scheduled_sync = None
    seeded_db.commit()

    due_ids = {m.id for m in get_due_merchants(seeded_db)}
    assert merchant.id not in due_ids


def test_inactive_merchant_is_never_due(seeded_db):
    merchant = get_merchant(seeded_db)
    merchant.is_active = False
    merchant.next_scheduled_sync = None
    seeded_db.commit()

    due_ids = {m.id for m in get_due_merchants(seeded_db)}
    assert merchant.id not in due_ids


def test_sync_interval_controls_due_state(seeded_db):
    merchant = get_merchant(seeded_db)

    # Never synced before -> immediately due.
    merchant.next_scheduled_sync = None
    seeded_db.commit()
    assert merchant.id in {m.id for m in get_due_merchants(seeded_db)}

    # Recently synced -> not due until the interval elapses.
    merchant.next_scheduled_sync = datetime.now(timezone.utc) + timedelta(minutes=30)
    seeded_db.commit()
    assert merchant.id not in {m.id for m in get_due_merchants(seeded_db)}

    # Interval elapsed -> due again.
    merchant.next_scheduled_sync = datetime.now(timezone.utc) - timedelta(minutes=1)
    seeded_db.commit()
    assert merchant.id in {m.id for m in get_due_merchants(seeded_db)}


def test_update_sync_config_replans_schedule_and_disable_clears_it(seeded_db):
    merchant = get_merchant(seeded_db)

    update_sync_config(seeded_db, merchant, {'sync_enabled': True, 'sync_interval_minutes': 15})
    assert merchant.sync_enabled is True
    assert merchant.sync_interval_minutes == 15
    assert merchant.next_scheduled_sync is not None

    # Disabling clears the planned run entirely.
    update_sync_config(seeded_db, merchant, {'sync_enabled': False})
    assert merchant.sync_enabled is False
    assert merchant.next_scheduled_sync is None


def test_unsafe_intervals_are_clamped_by_service_layer(seeded_db):
    merchant = get_merchant(seeded_db)
    # A value that slipped past the API would still be clamped to >= 5 minutes.
    update_sync_config(seeded_db, merchant, {'sync_interval_minutes': 0})
    assert merchant.sync_interval_minutes >= 5


# ---------------------------------------------------------------------------
# Successful / failed refresh + history recording
# ---------------------------------------------------------------------------

def test_successful_refresh_records_full_history(seeded_db):
    merchant = get_merchant(seeded_db)
    sync = run_scheduled_sync(seeded_db, merchant)

    assert sync.status == 'completed'
    assert sync.trigger_type == 'scheduled'
    assert sync.started_at is not None
    assert sync.completed_at is not None
    assert sync.duration_ms is not None
    assert sync.products_processed > 0
    assert sync.offers_processed > 0
    assert merchant.last_successful_sync is not None
    assert merchant.next_scheduled_sync is not None


def test_manual_sync_is_recorded_as_manual_trigger(client, seeded_db):
    merchant_id = get_merchant(seeded_db, 'amazon').id
    response = client.post(f'/api/admin/merchants/{merchant_id}/sync', headers=ADMIN_HEADER)
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'completed'
    assert body['trigger_type'] == 'manual'

    runs = client.get(f'/api/admin/merchants/{merchant_id}/syncs', headers=ADMIN_HEADER).json()
    assert any(run['id'] == body['id'] for run in runs)


def test_failed_refresh_preserves_previous_data_and_reports_error(seeded_db, monkeypatch):
    merchant = get_merchant(seeded_db, 'amazon')
    # Establish valid previous data.
    good_run = run_scheduled_sync(seeded_db, merchant)
    assert good_run.status == 'completed'
    offers_before = len(list(merchant.offers))
    products_before = {offer.product_id for offer in merchant.offers}
    assert offers_before > 0

    def explode(db, slug, data_dir=None):
        raise RuntimeError('simulated connector outage')

    monkeypatch.setattr(sync_service, 'run_connector_ingestion', explode)
    failed = run_scheduled_sync(seeded_db, merchant)

    assert failed.status == 'failed'
    assert 'simulated connector outage' in (failed.error_message or '')
    assert failed.products_processed == 0
    assert failed.offers_processed == 0

    # The catalog was NOT wiped: all previous products/offers are intact and
    # a retry stays scheduled.
    seeded_db.expire_all()
    merchant = get_merchant(seeded_db, 'amazon')
    assert len(list(merchant.offers)) == offers_before
    assert {offer.product_id for offer in merchant.offers} == products_before
    assert merchant.next_scheduled_sync is not None


# ---------------------------------------------------------------------------
# Overlapping sync prevention
# ---------------------------------------------------------------------------

def test_overlapping_sync_is_rejected(seeded_db):
    merchant = get_merchant(seeded_db)
    # Simulate a sync already in flight.
    active = MerchantSync(
        merchant_id=merchant.id,
        status='running',
        trigger_type='manual',
        started_at=datetime.now(timezone.utc),
    )
    seeded_db.add(active)
    seeded_db.commit()

    with pytest.raises(SyncAlreadyRunningError):
        run_scheduled_sync(seeded_db, merchant)

    # No second run row was created beyond the simulated one.
    running_count = (
        seeded_db.query(MerchantSync)
        .filter(
            MerchantSync.merchant_id == merchant.id,
            MerchantSync.status.in_(('pending', 'running')),
        )
        .count()
    )
    assert running_count == 1


def test_api_returns_conflict_for_already_running_sync(client, seeded_db):
    merchant = seeded_db.query(Merchant).filter(Merchant.slug == 'ajio').first()
    seeded_db.add(
        MerchantSync(
            merchant_id=merchant.id,
            status='running',
            trigger_type='manual',
            started_at=datetime.now(timezone.utc),
        )
    )
    seeded_db.commit()

    response = client.post(f'/api/admin/merchants/{merchant.id}/sync', headers=ADMIN_HEADER)
    assert response.status_code == 409
    assert 'already' in response.json()['detail'].lower()


def test_scheduler_tick_does_not_double_dispatch_same_merchant(seeded_db, monkeypatch):
    import app.services.sync_scheduler as sched_mod
    from app.services.sync_scheduler import SyncScheduler

    merchant = get_merchant(seeded_db, 'flipkart')
    # The live database may carry future next_scheduled_sync values committed
    # by the running server's scheduler; force one merchant due so the tick
    # dispatch is deterministic regardless of environment history.
    merchant.next_scheduled_sync = None
    seeded_db.commit()

    monkeypatch.setattr(sched_mod, 'SessionLocal', lambda: seeded_db)
    scheduler = SyncScheduler()

    async def scenario():
        # Both ticks inside one event loop: worker tasks created by the first
        # tick are still in flight when the second tick runs.
        first = await scheduler.tick()
        second = await scheduler.tick()
        return first, second

    dispatched, second = asyncio.run(scenario())
    assert dispatched, 'expected at least one due merchant'
    assert set(second).isdisjoint(set(dispatched))


def test_scheduler_runs_due_merchant_end_to_end(seeded_db, monkeypatch):
    import app.services.sync_scheduler as sched_mod
    from app.services.sync_scheduler import SyncScheduler

    merchant = get_merchant(seeded_db, 'flipkart')
    # Force a clean mock source: the live database may carry a committed
    # 'etsy' configuration (which fails without ETSY_API_KEY).
    merchant.next_scheduled_sync = None
    merchant.sync_enabled = True
    merchant.feed_type = 'mock'
    merchant.feed_query = None
    seeded_db.commit()

    # The live database may hold committed sync rows from earlier real usage;
    # only consider runs created by THIS test (id > baseline).
    from sqlalchemy import func as sqlfunc

    baseline_id = (
        seeded_db.query(sqlfunc.max(MerchantSync.id)).scalar() or 0
    )

    monkeypatch.setattr(sched_mod, 'SessionLocal', lambda: seeded_db)
    scheduler = SyncScheduler()
    dispatched_holder: list[int] = []

    async def scenario():
        dispatched_holder.extend(await scheduler.tick())
        assert merchant.id in dispatched_holder
        # Execute via the SAME production blocking path, but inline: sharing
        # one SQLAlchemy Session across threads (to_thread) would trigger
        # IllegalStateChangeError - a test-harness artifact, not production
        # behavior (real workers get their own SessionLocal).
        for mid in list(dispatched_holder):
            scheduler._run_merchant_blocking(mid)

    asyncio.run(scenario())

    seeded_db.expire_all()
    new_runs = (
        seeded_db.query(MerchantSync)
        .filter(MerchantSync.id > baseline_id)
        .filter(MerchantSync.merchant_id == merchant.id)
        .all()
    )
    assert len(new_runs) >= 1, (
        f'dispatched={dispatched_holder} '
        f'rows={[(r.id, r.merchant_id, r.trigger_type, r.status, r.error_message) for r in new_runs]}'
    )
    assert all(r.trigger_type == 'scheduled' for r in new_runs)
    assert all(r.status == 'completed' for r in new_runs)


# ---------------------------------------------------------------------------
# Admin API authorization + validation for the new endpoints
# ---------------------------------------------------------------------------

def test_new_admin_endpoints_require_authorization(client):
    assert client.get('/api/admin/merchants/1/sync-status').status_code == 401
    assert client.patch('/api/admin/merchants/1/sync-config').status_code == 401


def test_new_admin_endpoints_reject_invalid_key(client):
    wrong = {'X-Admin-Key': 'not-the-key'}
    assert client.get('/api/admin/merchants/1/sync-status', headers=wrong).status_code == 403
    assert client.patch(
        '/api/admin/merchants/1/sync-config',
        headers=wrong,
        json={'sync_enabled': False},
    ).status_code == 403


def test_sync_config_endpoint_updates_settings(client, seeded_db):
    merchant_id = get_merchant(seeded_db, 'myntra').id
    response = client.patch(
        f'/api/admin/merchants/{merchant_id}/sync-config',
        headers=ADMIN_HEADER,
        json={'sync_enabled': False},
    )
    assert response.status_code == 200
    body = response.json()
    assert body['sync_enabled'] is False
    assert body['next_scheduled_sync'] is None

    reenable = client.patch(
        f'/api/admin/merchants/{merchant_id}/sync-config',
        headers=ADMIN_HEADER,
        json={'sync_enabled': True, 'sync_interval_minutes': 180},
    )
    assert reenable.status_code == 200
    body = reenable.json()
    assert body['sync_enabled'] is True
    assert body['sync_interval_minutes'] == 180
    assert body['next_scheduled_sync'] is not None


def test_sync_config_endpoint_rejects_unsafe_interval(client, seeded_db):
    merchant_id = get_merchant(seeded_db, 'ajio').id
    response = client.patch(
        f'/api/admin/merchants/{merchant_id}/sync-config',
        headers=ADMIN_HEADER,
        json={'sync_interval_minutes': 1},  # below the 5-minute floor
    )
    assert response.status_code == 422
    assert 'between' in response.json()['detail']


def test_sync_status_endpoint_reports_idle_state(client, seeded_db):
    merchant_id = get_merchant(seeded_db, 'amazon').id
    response = client.get(
        f'/api/admin/merchants/{merchant_id}/sync-status', headers=ADMIN_HEADER
    )
    assert response.status_code == 200
    body = response.json()
    assert body['state'] in ('idle', 'syncing', 'disabled')
    assert {'fresh_offers', 'aging_offers', 'stale_offers'} <= set(body)
    assert body['sync_interval_minutes'] >= 5


def test_merchant_list_exposes_sync_config_and_freshness(client, seeded_db):
    response = client.get('/api/admin/merchants', headers=ADMIN_HEADER)
    assert response.status_code == 200
    for merchant in response.json():
        assert {
            'sync_enabled',
            'sync_interval_minutes',
            'last_successful_sync',
            'next_scheduled_sync',
            'fresh_offers',
            'aging_offers',
            'stale_offers',
        } <= set(merchant)
