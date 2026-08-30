"""Shared pytest fixtures for the StyleVerse multi-store ingestion tests.

Tests run against the real PostgreSQL database but every test executes
inside a transaction that is rolled back afterwards, so no test data is
ever persisted and existing production-like data is never modified.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url, URL
from sqlalchemy.orm import Session

# Ensure the backend root is importable regardless of invocation directory.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _configure_isolated_database() -> str:
    """Point pytest at a disposable database, never the developer database."""
    from dotenv import load_dotenv

    load_dotenv(BACKEND_DIR / '.env')
    configured = os.getenv('DATABASE_URL')
    if not configured or not configured.startswith('postgresql'):
        return configured or 'sqlite:///./styleverse_test.db'

    source = make_url(configured)
    test_name = f'{source.database}_test'
    test_url = source.set(database=test_name)
    os.environ['DATABASE_URL'] = str(test_url)
    os.environ['STYLEVERSE_TEST_DATABASE'] = str(test_url)

    # Create the dedicated database through the maintenance database. This
    # touches only the *_test database and is idempotent across test runs.
    import psycopg2

    admin_url = source.set(database='postgres')
    conn = psycopg2.connect(
        dbname=admin_url.database,
        user=admin_url.username,
        password=admin_url.password,
        host=admin_url.host,
        port=admin_url.port,
    )
    conn.autocommit = True
    try:
        with conn.cursor() as cursor:
            cursor.execute('SELECT 1 FROM pg_database WHERE datname = %s', (test_name,))
            if cursor.fetchone() is None:
                cursor.execute(f'CREATE DATABASE "{test_name}"')
    finally:
        conn.close()
    return str(test_url)


TEST_DATABASE_URL = _configure_isolated_database()

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
    from app.database import Base
    import app.models  # noqa: F401

    # Deterministic schema/data boundary for every invocation. This is the
    # dedicated test database, never the development database.
    Base.metadata.drop_all(bind=global_engine)
    Base.metadata.create_all(bind=global_engine)
    run_additive_migrations(global_engine)
    # Provide the same deterministic baseline that the application startup
    # normally seeds, including for tests that intentionally use db_session
    # rather than the seeded_db fixture.
    from app.database import SessionLocal
    from app.services.merchant_service import seed_initial_merchants
    from app.services.price_service import seed_product_offers
    from app.services.product_service import seed_initial_products
    baseline = SessionLocal()
    try:
        seed_initial_products(baseline)
        seed_product_offers(baseline)
        seed_initial_merchants(baseline)
        # Seed data uses stable explicit IDs; advance PostgreSQL sequences so
        # tests that insert additional rows receive collision-free IDs.
        for table in ('products', 'product_offers', 'merchants', 'users', 'user_events', 'merchant_clicks'):
            baseline.execute(text(
                "SELECT setval(pg_get_serial_sequence(:table, 'id'), "
                "COALESCE((SELECT MAX(id) FROM " + table + "), 1), true)"
            ), {'table': table})
        baseline.commit()
    finally:
        baseline.close()
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
