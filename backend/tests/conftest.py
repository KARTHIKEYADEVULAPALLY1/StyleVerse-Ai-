"""Shared pytest fixtures for the StyleVerse multi-store ingestion tests.

Tests run against the real PostgreSQL database but every test executes
inside a transaction that is rolled back afterwards, so no test data is
ever persisted and existing production-like data is never modified.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

# Ensure the backend root is importable regardless of invocation directory.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import engine as global_engine  # noqa: E402
from app.database import get_db  # noqa: E402


@pytest.fixture(scope='session')
def engine():
    """Verify PostgreSQL connectivity; skip the whole suite if unavailable."""
    try:
        with global_engine.connect() as connection:
            connection.execute(text('SELECT 1'))
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f'PostgreSQL is not available for tests: {exc}')

    from app.db_migrations import run_additive_migrations

    run_additive_migrations(global_engine)
    return global_engine


@pytest.fixture()
def db_session(engine):
    """A session bound to an outer transaction that is rolled back on teardown."""
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection, join_transaction_mode='create_savepoint')
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def seeded_db(db_session):
    """db_session pre-seeded with the original catalog, offers, and merchants."""
    from app.services.merchant_service import seed_initial_merchants
    from app.services.price_service import seed_product_offers
    from app.services.product_service import seed_initial_products

    seed_initial_products(db_session)
    seed_product_offers(db_session)
    seed_initial_merchants(db_session)
    return db_session


@pytest.fixture()
def client(seeded_db):
    """FastAPI TestClient wired to the rolled-back test session.

    Note: TestClient is intentionally NOT used as a context manager so the
    app lifespan/startup event does not commit anything to the real database.
    """
    from fastapi.testclient import TestClient

    from app.main import app

    app.dependency_overrides[get_db] = lambda: seeded_db
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)