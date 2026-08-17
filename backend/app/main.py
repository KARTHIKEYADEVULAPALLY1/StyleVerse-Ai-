from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, SessionLocal, engine, ensure_pgvector_extension
from app.models.cart import Cart, CartItem  # noqa: F401
from app.models.order import Order, OrderItem  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.product_offer import ProductOffer  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.wishlist import Wishlist, WishlistItem  # noqa: F401
from app.routes.auth import router as auth_router
from app.routes.cart import router as cart_router
from app.routes.orders import router as orders_router
from app.routes.products import router as products_router
from app.routes.recommendations import router as recommendations_router
from app.routes.stylist import router as stylist_router
from app.routes.try_on import router as try_on_router
from app.routes.wishlist import router as wishlist_router
from app.services.product_service import ensure_product_search_columns, seed_initial_products
from app.services.price_service import seed_product_offers
from app.services.try_on_service import ensure_uploads_directory

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

app = FastAPI(title='StyleVerse AI API', version='0.1.0')
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(wishlist_router)
app.include_router(cart_router)
app.include_router(orders_router)
app.include_router(recommendations_router)
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
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            ensure_product_search_columns(db)
            seed_initial_products(db)
            seed_product_offers(db)
        finally:
            db.close()
    except Exception:
        # Keep app startup resilient until the database is available.
        # This allows the health endpoint to remain reachable while configuration is being finalized.
        pass
