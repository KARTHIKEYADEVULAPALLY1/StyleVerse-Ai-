from __future__ import annotations

import logging
import logging.config
import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from sqlalchemy import text

from app.database import Base, SessionLocal, engine, ensure_pgvector_extension
from app.db_migrations import run_additive_migrations
from app.models.cart import Cart, CartItem  # noqa: F401
from app.models.merchant import Merchant  # noqa: F401
from app.models.merchant_sync import MerchantSync  # noqa: F401
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.product_offer import ProductOffer  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_preference import UserPreference  # noqa: F401
from app.models.user_event import UserEvent  # noqa: F401
from app.models.wishlist import Wishlist, WishlistItem  # noqa: F401
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.cart import router as cart_router
from app.routes.catalog import router as catalog_router
from app.routes.discovery import router as discovery_router
from app.routes.events import router as events_router
from app.routes.orders import router as orders_router
from app.routes.preferences import router as preferences_router
from app.routes.products import router as products_router
from app.routes.redirect import router as redirect_router
from app.routes.recommendations import router as recommendations_router
from app.routes.stylist import router as stylist_router
from app.routes.style_profile import router as style_profile_router
from app.routes.try_on import router as try_on_router
from app.routes.wishlist import router as wishlist_router
from app.services.merchant_service import seed_initial_merchants
from app.services.auth_service import promote_env_admins
from app.services.product_service import ensure_product_search_columns, seed_initial_products
from app.services.price_service import seed_product_offers
from app.services.try_on_service import ensure_uploads_directory
from app.services.media_storage import LocalMediaStorage, media_storage

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

# Configure logging
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console"]
    }
}
logging.config.dictConfig(LOGGING_CONFIG)

app = FastAPI(title='StyleVerse AI API', version='0.1.0')

# Request ID middleware - must be added before any routes that need it
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Generate a UUID for each request and add it to request.state and response headers."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

# Exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions with request_id for support correlation."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "request_id": request.state.request_id}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors with request_id.

    Pydantic v2's ``exc.errors()`` may include non-JSON-serializable objects
    (e.g. ``ValueError`` instances in the ``ctx`` field). We run the result
    through ``jsonable_encoder`` so any non-serializable values are coerced
    to JSON-safe representations.
    """
    errors = exc.errors()
    sanitized_errors = jsonable_encoder(errors)
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Validation error",
            "errors": sanitized_errors,
            "request_id": request.state.request_id,
        },
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with full logging but sanitized response."""
    logger = logging.getLogger(__name__)
    logger.exception("Unhandled exception occurred: %s", exc)
    
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong. Please try again.", "request_id": request.state.request_id}
    )

if isinstance(media_storage, LocalMediaStorage):
    app.mount('/media', StaticFiles(directory=str(media_storage.root)), name='media')
app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(catalog_router)
app.include_router(products_router)
app.include_router(redirect_router)
app.include_router(discovery_router)
app.include_router(events_router)
app.include_router(wishlist_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(preferences_router)
app.include_router(recommendations_router)
app.include_router(style_profile_router)
app.include_router(stylist_router)
app.include_router(try_on_router)

dev_origins = os.getenv('FRONTEND_URL_DEV', 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
preview_origins = os.getenv('FRONTEND_URL_PREVIEW', 'http://localhost:4173,http://127.0.0.1:4173')
prod_origins = os.getenv('FRONTEND_URL_PROD', '')

origins = []
for origin in dev_origins.split(','):
    if origin.strip():
        origins.append(origin.strip())
for origin in preview_origins.split(','):
    if origin.strip():
        origins.append(origin.strip())
for origin in prod_origins.split(','):
    if origin.strip():
        origins.append(origin.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health_check() -> dict:
    """Health check endpoint that verifies database connectivity.
    
    Returns:
        200: Database is healthy
        503: Database is unavailable
    """
    try:
        db = SessionLocal()
        try:
            db.execute(text('SELECT 1'))
        finally:
            db.close()
        return {'status': 'healthy'}
    except Exception:
        return JSONResponse(status_code=503, content={'status': 'unhealthy'})


@app.get('/')
def root() -> dict:
    return {'message': 'StyleVerse AI backend is running'}


@app.on_event('startup')
def startup_event() -> None:
    logger = logging.getLogger(__name__)
    ensure_uploads_directory()
    try:
        ensure_pgvector_extension()
        run_additive_migrations(engine)
        db = SessionLocal()
        try:
            ensure_product_search_columns(db)
            seed_initial_products(db)
            seed_initial_merchants(db)
            seed_product_offers(db)
            promote_env_admins(db)
        finally:
            db.close()
    except Exception as e:
        # Log the error clearly so operators can see database initialization failed.
        # The app still starts to allow the health endpoint to report status,
        # but database-dependent features won't work until resolved.
        logger.error("Database initialization failed during startup: %s", e)


@app.on_event('startup')
async def start_background_scheduler() -> None:
    # Automated merchant syncing. Runs as its own asyncio task with worker
    # threads for connector work - normal API requests are never blocked.
    from app.services.sync_scheduler import start_scheduler

    await start_scheduler()


@app.on_event('shutdown')
async def stop_background_scheduler() -> None:
    from app.services.sync_scheduler import stop_scheduler

    await stop_scheduler()
