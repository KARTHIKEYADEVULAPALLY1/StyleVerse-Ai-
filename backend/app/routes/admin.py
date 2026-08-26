"""Admin-only backend operations (protected).

Two authorization mechanisms are accepted on these endpoints:

1. ``X-Admin-Key`` header - server-to-server key (``ADMIN_API_KEY`` env var),
   never exposed to ordinary frontend users.
2. A standard StyleVerse JWT belonging to a user with ``is_admin=True``.

Ordinary authenticated users receive ``403 Forbidden``. There is exactly one
authentication system - the existing JWT one - plus the pre-existing service
key for operational tooling.
"""
from __future__ import annotations
import hmac
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.connectors import MOCK_MERCHANT_SLUGS, ConnectorError
from app.connectors.etsy_connector import EtsyConnector
from app.connectors.feed_connector import (
    FeedValidationError,
    MerchantFeedConnector,
    validate_feed_url,
)
from app.database import get_db
from app.models.merchant import Merchant
from app.models.merchant_sync import MerchantSync
from app.routes.auth import get_current_user
from app.services import analytics_service
from app.services.ingestion_service import run_mock_ingestion
from app.services.merchant_sync_service import (
    MAX_SYNC_INTERVAL_MINUTES,
    MIN_SYNC_INTERVAL_MINUTES,
    SyncAlreadyRunningError,
    dashboard_summary,
    get_merchant_overview,
    get_merchant_source,
    get_sync_state,
    has_feed_configured,
    list_merchant_syncs,
    parse_result_stats,
    run_manual_sync,
    update_sync_config,
)

#: Maximum number of preview rows returned by Test Feed.
FEED_PREVIEW_LIMIT = 10


def _sync_run_response(sync: MerchantSync) -> SyncRunResponse:
    """Serialize one sync row, decoding its stored statistics document."""
    data = {
        column.name: getattr(sync, column.name)
        for column in MerchantSync.__table__.columns
    }
    data.pop('result_stats', None)  # stored as raw JSON text on the row
    return SyncRunResponse(**data, result_stats=parse_result_stats(sync))


def _build_feed_test_response(merchant: Merchant) -> FeedTestResponse:
    """Validate the merchant's configured source WITHOUT touching the catalog."""
    if not has_feed_configured(merchant):
        return FeedTestResponse(
            connection='failed',
            message=(
                "No real source configured. Set Feed Type to 'url' (with URL + "
                "format) or 'etsy' (uses ETSY_API_KEY from the backend env)."
            ),
        )
    try:
        if get_merchant_source(merchant) == 'etsy':
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
    except ConnectorError as exc:
        # Never include secrets in messages - connector errors only carry URLs.
        return FeedTestResponse(connection='failed', message=str(exc))

    def _row(entry: dict, product=None) -> FeedTestSampleRow:
        record = entry.get('record') or {}
        errors = entry.get('errors') or []
        if product is not None:
            return FeedTestSampleRow(
                row_index=entry.get('row_index', 0),
                is_valid=True,
                external_product_id=product.external_product_id,
                name=product.name,
                brand=product.brand or None,
                category=product.category or None,
                price=float(product.price),
                currency=product.currency,
                availability=product.availability,
                image_url=product.image_url,
                product_url=product.product_url,
            )
        price_raw = record.get('price')
        try:
            price_value = float(str(price_raw)) if price_raw not in (None, '') else None
        except (TypeError, ValueError):
            price_value = None
        return FeedTestSampleRow(
            row_index=entry.get('row_index', 0),
            is_valid=False,
            external_product_id=entry.get('external_product_id'),
            name=entry.get('name'),
            brand=(record.get('brand') or None),
            category=(record.get('category') or None),
            price=price_value,
            currency=(record.get('currency') or None),
            availability=(record.get('availability') or None),
            image_url=(record.get('image_url') or None),
            product_url=(record.get('product_url') or None),
            errors=[str(e) for e in errors],
        )

    sample: List[FeedTestSampleRow] = []
    for index, product in enumerate(report.products[:FEED_PREVIEW_LIMIT]):
        sample.append(_row({'row_index': index}, product=product))
    slots = FEED_PREVIEW_LIMIT - len(sample)
    if slots > 0:
        for entry in report.invalid_records[:slots]:
            sample.append(_row(entry))

    return FeedTestResponse(
        connection='ok',
        message=f'Feed validated successfully ({report.valid_count} valid, '
                f'{report.invalid_count} invalid record(s)).',
        format_detected=report.format_detected,
        record_count=report.records_received,
        valid_count=report.valid_count,
        invalid_count=report.invalid_count,
        sample=sample,
        errors=[
            {
                'row_index': entry.get('row_index'),
                'external_product_id': entry.get('external_product_id'),
                'errors': entry.get('errors') or [],
            }
            for entry in report.invalid_records[:50]
        ],
    )

router = APIRouter(prefix='/api/admin', tags=['admin'])

_bearer = HTTPBearer(auto_error=False)

DEFAULT_DEV_ADMIN_KEY = 'styleverse-dev-admin-key'


def get_admin_api_key() -> str:
    """Resolve the expected admin key from configuration."""
    return os.getenv('ADMIN_API_KEY', DEFAULT_DEV_ADMIN_KEY)


def require_admin_key(x_admin_key: Optional[str] = Header(default=None)) -> None:
    """Dependency that blocks unauthenticated/non-admin callers.

    Uses a constant-time comparison so the endpoint is not vulnerable to
    timing attacks on the key value.
    """
    if not x_admin_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Admin authorization required: missing X-Admin-Key header.',
        )
    if not hmac.compare_digest(x_admin_key, get_admin_api_key()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Invalid admin key.',
        )


def require_admin_access(
    x_admin_key: Optional[str] = Header(default=None),
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
    db: Session = Depends(get_db),
) -> None:
    """Accept either the service admin key or an authenticated admin user."""
    if x_admin_key:
        if hmac.compare_digest(x_admin_key, get_admin_api_key()):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Invalid admin key.',
        )
    if credentials and credentials.credentials:
        # Raises 401 for invalid/expired tokens.
        user = get_current_user(credentials=credentials, db=db)
        if getattr(user, 'is_admin', False):
            return
        # Authenticated non-admin users are forbidden (not unauthorized).
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Administrator access required.',
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Admin authorization required: provide X-Admin-Key or an administrator account.',
    )



class IngestionRunRequest(BaseModel):
    merchant_slugs: Optional[List[str]] = None


class MerchantResponse(BaseModel):
    model_config = {'from_attributes': True}

    id: int
    name: str
    slug: str
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: bool


class MerchantDetailResponse(MerchantResponse):
    """Merchant + real operational facts for the dashboard card."""

    connector_status: str = 'unknown'
    product_count: int = 0
    offer_count: int = 0
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_duration_ms: Optional[int] = None
    last_sync_error: Optional[str] = None
    # Automated-sync configuration (admin-managed only).
    sync_enabled: bool = True
    sync_interval_minutes: int = 60
    last_successful_sync: Optional[datetime] = None
    next_scheduled_sync: Optional[datetime] = None
    # Real merchant feed configuration.
    feed_type: str = 'mock'
    feed_url: Optional[str] = None
    feed_format: Optional[str] = None
    feed_query: Optional[str] = None
    has_feed_configured: bool = False
    # Offer freshness breakdown for this merchant's catalog slice.
    fresh_offers: int = 0
    aging_offers: int = 0
    stale_offers: int = 0


class SyncConfigRequest(BaseModel):
    """Partial update of one merchant's automated-sync + feed settings.

    ``sync_interval_minutes`` is validated into a safe range so automated
    syncing can never be configured to hammer a merchant source every few
    seconds. Feed URLs are SSRF-checked before being stored.
    """

    sync_enabled: Optional[bool] = None
    sync_interval_minutes: Optional[int] = None
    # Real merchant source configuration.
    feed_type: Optional[str] = None          # 'mock' | 'url' | 'etsy'
    feed_url: Optional[str] = None
    feed_format: Optional[str] = None        # 'csv' | 'json' | null
    feed_query: Optional[str] = None         # search keywords for API sources
    feed_auth_env_var: Optional[str] = None  # NAME of the env var, never the secret


class FeedTestSampleRow(BaseModel):
    row_index: int
    is_valid: bool
    external_product_id: Optional[str] = None
    name: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    availability: Optional[str] = None
    image_url: Optional[str] = None
    product_url: Optional[str] = None
    errors: List[str] = []


class FeedTestResponse(BaseModel):
    """Result of validating a merchant feed without touching the catalog."""

    connection: str                      # 'ok' | 'failed'
    message: Optional[str] = None
    format_detected: Optional[str] = None
    record_count: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    sample: List[FeedTestSampleRow] = []
    errors: List[dict] = []


class SyncStatusResponse(BaseModel):
    merchant_id: int
    slug: str
    state: str
    sync_enabled: bool
    merchant_active: bool
    sync_interval_minutes: int
    last_successful_sync: Optional[datetime] = None
    next_scheduled_sync: Optional[datetime] = None
    active_sync: Optional[dict] = None
    last_run: Optional[dict] = None
    fresh_offers: int = 0
    aging_offers: int = 0
    stale_offers: int = 0


class SyncRunResponse(BaseModel):
    model_config = {'from_attributes': True}

    id: int
    merchant_id: int
    status: str
    products_processed: int
    offers_processed: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: Optional[datetime] = None
    # What started this run ('manual' or 'scheduled').
    trigger_type: str = 'manual'
    # Detailed ingestion statistics (records received/valid/invalid, products
    # & offers created/updated, duplicates, row-level errors).
    result_stats: Optional[dict] = None


class DashboardSummaryResponse(BaseModel):
    active_merchants: int
    total_merchants: int
    total_products: int
    total_offers: int
    successful_syncs: int
    failed_syncs: int


@router.post(
    '/ingestion/run',
    summary='Run the mock multi-store ingestion pipeline (admin only)',
)
def run_ingestion(
    payload: IngestionRunRequest | None = None,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_key),
) -> dict:
    """Execute: mock data -> connector -> normalization -> dedup -> DB."""
    slugs = payload.merchant_slugs if payload else None
    try:
        result = run_mock_ingestion(db, merchant_slugs=slugs)
    except Exception as exc:  # noqa: BLE001 - surface pipeline failures to admins
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Ingestion failed: {exc}',
        )
    return result


@router.get(
    '/merchants',
    response_model=List[MerchantDetailResponse],
    summary='List merchants with sync/connector status (admin only)',
)
def list_merchants(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> List[MerchantDetailResponse]:
    merchants = db.query(Merchant).order_by(Merchant.id.asc()).all()
    return [
        MerchantDetailResponse(
            id=m.id,
            name=m.name,
            slug=m.slug,
            website_url=m.website_url,
            logo_url=m.logo_url,
            is_active=m.is_active,
            **get_merchant_overview(db, m),
        )
        for m in merchants
    ]


@router.get(
    '/merchants/{merchant_id}',
    response_model=MerchantDetailResponse,
    summary='Get one merchant with sync/connector status (admin only)',
)
def get_merchant_detail(
    merchant_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> MerchantDetailResponse:
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    return MerchantDetailResponse(
        id=merchant.id,
        name=merchant.name,
        slug=merchant.slug,
        website_url=merchant.website_url,
        logo_url=merchant.logo_url,
        is_active=merchant.is_active,
        **get_merchant_overview(db, merchant),
    )


@router.get(
    '/merchants/{merchant_id}/syncs',
    response_model=List[SyncRunResponse],
    summary='Recent sync runs for a merchant (admin only)',
)
def get_merchant_sync_history(
    merchant_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> List[SyncRunResponse]:
    if not db.query(Merchant).filter(Merchant.id == merchant_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    runs = list_merchant_syncs(db, merchant_id, limit=max(1, min(limit, 100)))
    return [_sync_run_response(run) for run in runs]


@router.post(
    '/merchants/{merchant_id}/sync',
    response_model=SyncRunResponse,
    summary='Manually trigger a connector sync for a merchant (admin only)',
)
def trigger_merchant_sync(
    merchant_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> SyncRunResponse:
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    if not merchant.is_active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Merchant "{merchant.slug}" is inactive; activate it before syncing.',
        )
    try:
        return _sync_run_response(run_manual_sync(db, merchant))
    except SyncAlreadyRunningError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Sync already in progress. {exc}',
        )


@router.post(
    '/merchants/{merchant_id}/test-feed',
    response_model=FeedTestResponse,
    summary='Validate the configured feed (connectivity + schema) without importing',
)
def test_merchant_feed(
    merchant_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> FeedTestResponse:
    """Connectivity + schema check. Never modifies products or offers.

    Returns connection status, detected format, record counts and a small
    sample (preview) marking invalid records with per-field reasons.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    return _build_feed_test_response(merchant)


@router.post(
    '/merchants/{merchant_id}/feed-sync',
    response_model=SyncRunResponse,
    summary='Import a real merchant product feed (admin only)',
)
def trigger_merchant_feed_sync(
    merchant_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> SyncRunResponse:
    """Fetch + validate + normalize + deduplicate a remote merchant feed.

    The full pipeline runs exactly as for mock connectors; malformed records
    are quarantined and reported instead of imported, and an upstream feed
    failure never deletes existing catalog data.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    if not has_feed_configured(merchant):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No feed configured for this merchant. Save a configuration "
                "with feed_type 'url', a validated feed_url and format "
                "'csv' or 'json' first."
            ),
        )
    try:
        return _sync_run_response(run_manual_sync(db, merchant))
    except SyncAlreadyRunningError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f'Sync already in progress. {exc}',
        )
    except ConnectorError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )


@router.get(
    '/merchants/{merchant_id}/sync-status',
    response_model=SyncStatusResponse,
    summary='Current automated-sync state for a merchant (admin only)',
)
def get_merchant_sync_status(
    merchant_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> dict:
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    return get_sync_state(db, merchant)


@router.patch(
    '/merchants/{merchant_id}/sync-config',
    response_model=MerchantDetailResponse,
    summary="Update a merchant's automated-sync settings (admin only)",
)
def update_merchant_sync_config(
    merchant_id: int,
    payload: SyncConfigRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> MerchantDetailResponse:
    """Enable/disable automated syncing or change the interval.

    Only administrators (admin key or admin JWT) can reach this endpoint.
    Intervals outside ``[{MIN}, {MAX}]`` minutes are rejected with 422 so
    an unsafe cadence such as every few seconds can never be configured.
    """
    merchant = db.query(Merchant).filter(Merchant.id == merchant_id).first()
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f'Merchant with ID {merchant_id} not found.',
        )
    updates = payload.model_dump(exclude_none=True)
    requested_interval = updates.get('sync_interval_minutes')
    if requested_interval is not None and (
        requested_interval < MIN_SYNC_INTERVAL_MINUTES
        or requested_interval > MAX_SYNC_INTERVAL_MINUTES
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f'sync_interval_minutes must be between {MIN_SYNC_INTERVAL_MINUTES} '
                f'and {MAX_SYNC_INTERVAL_MINUTES} minutes.'
            ),
        )

    # Feed configuration validation - reject unsafe values before storing.
    feed_type = updates.get('feed_type')
    if feed_type is not None and str(feed_type).strip().lower() not in ('mock', 'url', 'etsy'):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="feed_type must be 'mock', 'url' or 'etsy'.",
        )
    feed_format = updates.get('feed_format')
    if feed_format is not None and (
        (str(feed_format).strip().lower() or None) not in ('csv', 'json', None)
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="feed_format must be 'csv' or 'json'.",
        )
    requested_url = updates.get('feed_url')
    if requested_url:
        try:
            validate_feed_url(str(requested_url))
        except FeedValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            )
    # The secret itself is never accepted here - only the NAME of an
    # environment variable holding it.
    auth_env = updates.get('feed_auth_env_var')
    if auth_env and not str(auth_env).replace('_', '').isalnum():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='feed_auth_env_var must be the NAME of an environment variable.',
        )

    try:
        updated = update_sync_config(db, merchant, updates)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    return MerchantDetailResponse(
        id=updated.id,
        name=updated.name,
        slug=updated.slug,
        website_url=updated.website_url,
        logo_url=updated.logo_url,
        is_active=updated.is_active,
        **get_merchant_overview(db, updated),
    )


@router.get(
    '/analytics/merchant-clicks',
    summary='Headline merchant-click metrics + chart series (admin only)',
)
def get_click_analytics_summary(
    days: int = 30,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> dict:
    return analytics_service.merchant_click_summary(db, analytics_service.normalize_days(days))


@router.get(
    '/analytics/user-events',
    summary='User behavior event metrics + charts (views, searches, wishlist, cart, AI usage) (admin only)',
)
def get_user_event_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> dict:
    from app.services.event_service import event_analytics_summary

    return event_analytics_summary(db, days)


@router.get(
    '/analytics/merchants',
    summary='Clicks grouped by merchant (admin only)',
)
def get_merchant_click_analytics(
    days: int = 30,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> list[dict]:
    return analytics_service.merchant_analytics(db, analytics_service.normalize_days(days))


@router.get(
    '/analytics/products',
    summary='Per-product click performance, sortable by clicks (admin only)',
)
def get_product_click_analytics(
    days: int = 30,
    sort: str = 'clicks',
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> list[dict]:
    rows = analytics_service.product_analytics(db, analytics_service.normalize_days(days))
    if sort == 'clicks_asc':
        return sorted(rows, key=lambda row: row['clicks'])
    # Default (and explicit) sort: most clicks first.
    return sorted(rows, key=lambda row: row['clicks'], reverse=True)


@router.get(
    '/dashboard/summary',
    response_model=DashboardSummaryResponse,
    summary='Real dashboard totals (admin only)',
)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin_access),
) -> dict:
    return dashboard_summary(db)


@router.get(
    '/connectors',
    summary='List connectors available for ingestion (admin only)',
    dependencies=[Depends(require_admin_key)],
)
def list_connectors() -> dict:
    from app.connectors import list_available_connectors

    return {
        'registered': sorted(MOCK_MERCHANT_SLUGS),
        'available': list_available_connectors(),
    }