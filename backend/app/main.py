from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine, ensure_pgvector_extension
from app.db_migrations import run_additive_migrations
from app.models.cart import Cart, CartItem  # noqa: F401
from app.models.merchant import Merchant  # noqa: F401
from app.models.merchant_sync import MerchantSync  # noqa: F401
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.product_offer import ProductOffer  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_event import UserEvent  # noqa: F401
from app.models.wishlist import Wishlist, WishlistItem  # noqa: F401
from app.routes.admin import router as admin_router
from app.routes.auth import router as auth_router
from app.routes.cart import router as cart_router
from app.routes.catalog import router as catalog_router
from app.routes.discovery import router as discovery_router
from app.routes.events import router as events_router
from app.routes.orders import router as orders_router
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

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

app = FastAPI(title='StyleVerse AI API', version='0.1.0')
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
app.include_router(recommendations_router)
app.include_router(style_profile_router)
app.include_router(stylist_router)
app.include_router(try_on_router)

origins = os.getenv(
    'CORS_ORIGINS',
    'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000',
).split(',')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in origins if origin.strip()],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/api/health')
def health_check() -> dict:
    return {'status': 'ok'}


@app.get('/')
def root() -> dict:
    return {'message': 'StyleVerse AI backend is running'}


@app.on_event('startup')
def startup_event() -> None:
    ensure_uploads_directory()
    try:
        ensure_pgvector_extension()
        run_additive_migrations(engine)
        db = SessionLocal()
        try:
            ensure_product_search_columns(db)
            seed_initial_products(db)
            seed_product_offers(db)
            seed_initial_merchants(db)
            promote_env_admins(db)
        finally:
            db.close()
    except Exception:
        # Keep app startup resilient until the database is available.
        # This allows the health endpoint to remain reachable while configuration is being finalized.
        pass


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
