"""Lightweight automated sync scheduler for the existing FastAPI app.

Design goals (MVP-appropriate, no new infrastructure dependencies):

* a single asyncio task loops on a fixed tick (default 60s) and never blocks
  API requests - connector work runs in a worker thread via
  ``asyncio.to_thread`` with its own database session;
* per-merchant overlap prevention is enforced twice: an in-process
  ``_in_flight`` set guards against double-dispatch inside one process, and
  the ``MerchantSync`` pending/running check in the sync service guards
  across manual + scheduled triggers (a second run raises
  ``SyncAlreadyRunningError`` instead of starting);
* merchants only run when ``sync_enabled`` AND ``is_active``, and only when
  ``next_scheduled_sync`` is due (or has never been planned);
* every completed run re-plans ``next_scheduled_sync`` from the merchant's
  configured interval, so the loop behaves exactly as it will for real
  merchant connectors later.

Configuration (env vars, all optional)::

    SYNC_SCHEDULER_ENABLED          default 'true'
    SYNC_SCHEDULER_TICK_SECONDS     default '60'  (clamped to >= 5)
"""
from __future__ import annotations

import asyncio
import logging
import os
import threading

from app.database import SessionLocal
from app.services.merchant_sync_service import (
    SyncAlreadyRunningError,
    get_due_merchants,
    run_scheduled_sync,
)

logger = logging.getLogger(__name__)

MIN_TICK_SECONDS = 5


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {'1', 'true', 'yes', 'on'}


def _tick_seconds() -> float:
    try:
        return max(MIN_TICK_SECONDS, float(os.getenv('SYNC_SCHEDULER_TICK_SECONDS', '60')))
    except (TypeError, ValueError):
        return 60.0


def scheduler_enabled() -> bool:
    return _env_bool('SYNC_SCHEDULER_ENABLED', True)


class SyncScheduler:
    """Asyncio background loop that keeps merchant data continuously fresh."""

    def __init__(self) -> None:
        self._task: asyncio.Task | None = None
        self._stop_event: asyncio.Event | None = None
        # Guard so the same merchant can never be dispatched twice at once.
        self._in_flight: set[int] = set()
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------
    async def start(self) -> None:
        if not scheduler_enabled():
            logger.info('Sync scheduler disabled via SYNC_SCHEDULER_ENABLED.')
            return
        if self._task is not None and not self._task.done():
            return
        self._stop_event = asyncio.Event()
        self._task = asyncio.create_task(self._loop(), name='merchant-sync-scheduler')
        logger.info('Sync scheduler started (tick=%ss).', _tick_seconds())

    async def stop(self) -> None:
        if self._stop_event is not None:
            self._stop_event.set()
        if self._task is not None:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            except Exception:  # noqa: BLE001 - shutdown must continue regardless
                pass
            self._task = None
            self._stop_event = None
        logger.info('Sync scheduler stopped.')

    # ------------------------------------------------------------------
    # Loop
    # ------------------------------------------------------------------
    async def _loop(self) -> None:
        stop = self._stop_event
        while stop is not None and not stop.is_set():
            try:
                await self.tick()
            except Exception:  # noqa: BLE001 - the loop must survive any tick failure
                logger.exception('Sync scheduler tick failed.')
            try:
                await asyncio.wait_for(stop.wait(), timeout=_tick_seconds())
            except asyncio.TimeoutError:
                continue

    async def tick(self) -> list[int]:
        """One scheduling pass. Returns ids of dispatched merchant syncs."""
        due_ids = self._collect_due_merchants()
        dispatched: list[int] = []
        for merchant_id in due_ids:
            with self._lock:
                if merchant_id in self._in_flight:
                    continue  # overlapping sync prevention (in-process)
                self._in_flight.add(merchant_id)
            dispatched.append(merchant_id)
            # Fire-and-forget: each merchant runs independently in its own
            # thread + DB session so slow connectors never block others or
            # the API event loop.
            asyncio.create_task(self._run_merchant(merchant_id))
        return dispatched

    def _collect_due_merchants(self) -> list[int]:
        """Find enabled+active merchants whose next sync is due."""
        db = SessionLocal()
        try:
            return [merchant.id for merchant in get_due_merchants(db)]
        finally:
            db.close()

    async def _run_merchant(self, merchant_id: int) -> None:
        try:
            await asyncio.to_thread(self._run_merchant_blocking, merchant_id)
        except Exception:  # noqa: BLE001 - one bad run must not kill the loop
            logger.exception('Scheduled sync for merchant %s crashed.', merchant_id)
        finally:
            with self._lock:
                self._in_flight.discard(merchant_id)

    def _run_merchant_blocking(self, merchant_id: int) -> None:
        db = SessionLocal()
        try:
            from app.models.merchant import Merchant

            merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
            if merchant is None or not merchant.sync_enabled or not merchant.is_active:
                return  # disabled between dispatch and execution
            sync = run_scheduled_sync(db, merchant)
            logger.info(
                'Scheduled sync %s for "%s": %s (%s products / %s offers).',
                sync.id,
                merchant.slug,
                sync.status,
                sync.products_processed,
                sync.offers_processed,
            )
        except SyncAlreadyRunningError:
            # A manual sync got there first - exactly the desired behavior:
            # do NOT start a second concurrent run for this merchant.
            logger.info(
                'Scheduled sync skipped for merchant %s: sync already in progress.',
                merchant_id,
            )
        finally:
            db.close()


# Module-level singleton wired into FastAPI startup/shutdown.
scheduler = SyncScheduler()


async def start_scheduler() -> None:
    await scheduler.start()


async def stop_scheduler() -> None:
    await scheduler.stop()

