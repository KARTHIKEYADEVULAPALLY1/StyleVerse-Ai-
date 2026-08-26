"""Safe, idempotent, additive schema migrations.

The project does not use Alembic; the established pattern is
``Base.metadata.create_all`` for new tables plus guarded ``ALTER TABLE``
statements for new columns. This module follows that pattern and only ever
performs additive changes - it never drops or rewrites existing data.

Run automatically on application startup and available for manual use::

    python -m app.db_migrations
"""
from __future__ import annotations

import logging
from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from app.database import Base
from app.models.merchant import Merchant  # noqa: F401 - registers the table
from app.models.merchant_sync import MerchantSync  # noqa: F401 - registers the table

logger = logging.getLogger(__name__)

# New columns added to product_offers by the multi-store architecture.
OFFER_COLUMNS = {
    'merchant_id': 'INTEGER',
    'merchant_product_id': 'VARCHAR(255)',
    'product_url': 'VARCHAR(1000)',
    'image_url': 'VARCHAR(1000)',
    'last_updated': 'TIMESTAMPTZ',
}

PRODUCT_COLUMNS = {
    'is_active': "BOOLEAN NOT NULL DEFAULT TRUE",
}

# Admin role flag on users - additive, existing users default to non-admin.
USER_COLUMNS = {
    'is_admin': 'BOOLEAN NOT NULL DEFAULT FALSE',
}

# Automated-sync configuration on merchants - additive, sensible defaults:
# automated syncing enabled with a 60 minute cadence until an admin changes it.
MERCHANT_COLUMNS = {
    'sync_enabled': 'BOOLEAN NOT NULL DEFAULT TRUE',
    'sync_interval_minutes': 'INTEGER NOT NULL DEFAULT 60',
    'last_successful_sync': 'TIMESTAMPTZ',
    'next_scheduled_sync': 'TIMESTAMPTZ',
}

# What started each sync run ('manual' or 'scheduled') - additive so existing
# history rows stay valid as plain manual runs.
SYNC_TRIGGER_COLUMN = ('trigger_type', "VARCHAR(20) NOT NULL DEFAULT 'manual'")

# Detailed ingestion statistics recorded per sync run (JSON document):
# records received/valid/invalid, products/offers created vs updated,
# duplicates detected, and row-level validation errors.
SYNC_RESULT_STATS_COLUMN = ('result_stats', 'TEXT')

# Real merchant feed configuration - additive, 'mock' keeps every existing
# merchant behaving exactly as before until an admin configures a live feed.
MERCHANT_FEED_COLUMNS = {
    'feed_type': "VARCHAR(20) NOT NULL DEFAULT 'mock'",
    'feed_url': 'VARCHAR(2000)',
    'feed_format': 'VARCHAR(10)',
    'feed_auth_env_var': 'VARCHAR(100)',
    'feed_query': 'VARCHAR(200)',
}


def _table_columns(engine: Engine, table_name: str) -> set[str]:
    inspector = inspect(engine)
    if not inspector.has_table(table_name):
        return set()
    return {column['name'] for column in inspector.get_columns(table_name)}


def _add_column_if_missing(engine: Engine, table: str, column: str, ddl_type: str) -> None:
    columns = _table_columns(engine, table)
    if column in columns:
        return
    with engine.begin() as connection:
        connection.execute(
            text(f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {ddl_type}')
        )
    logger.info('Added column %s.%s', table, column)


def _add_foreign_key_if_missing(engine: Engine, table: str, column: str) -> None:
    """Add FK constraints guarded so repeated runs are no-ops (PostgreSQL)."""
    if engine.dialect.name != 'postgresql':
        return
    constraint_name = f'fk_{table}_{column}_merchants'
    with engine.begin() as connection:
        connection.execute(
            text(
                f"""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint WHERE conname = '{constraint_name}'
                    ) THEN
                        ALTER TABLE {table} ADD CONSTRAINT {constraint_name}
                            FOREIGN KEY ({column}) REFERENCES merchants(id);
                    END IF;
                END $$;
                """
            )
        )


def run_additive_migrations(engine: Engine) -> None:
    """Create missing tables and add missing columns. Safe to run repeatedly."""
    # 1. New tables (merchants). create_all only creates what is absent.
    Base.metadata.create_all(bind=engine)

    # 2. Additive columns on existing tables.
    for column, ddl in OFFER_COLUMNS.items():
        _add_column_if_missing(engine, 'product_offers', column, ddl)
    _add_foreign_key_if_missing(engine, 'product_offers', 'merchant_id')

    for column, ddl in PRODUCT_COLUMNS.items():
        _add_column_if_missing(engine, 'products', column, ddl)

    for column, ddl in USER_COLUMNS.items():
        _add_column_if_missing(engine, 'users', column, ddl)

    for column, ddl in MERCHANT_COLUMNS.items():
        _add_column_if_missing(engine, 'merchants', column, ddl)

    _add_column_if_missing(engine, 'merchant_syncs', *SYNC_TRIGGER_COLUMN)
    _add_column_if_missing(engine, 'merchant_syncs', *SYNC_RESULT_STATS_COLUMN)

    for column, ddl in MERCHANT_FEED_COLUMNS.items():
        _add_column_if_missing(engine, 'merchants', column, ddl)


if __name__ == '__main__':  # pragma: no cover - manual utility entry point
    from app.database import engine

    run_additive_migrations(engine)
    print('Additive migrations complete.')
    