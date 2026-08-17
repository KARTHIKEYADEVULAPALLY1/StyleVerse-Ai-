from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / '.env')

postgres_user = os.getenv('POSTGRES_USER')
postgres_password = os.getenv('POSTGRES_PASSWORD')
postgres_server = os.getenv('POSTGRES_SERVER')
postgres_port = os.getenv('POSTGRES_PORT')
postgres_db = os.getenv('POSTGRES_DB')

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL and all([postgres_user, postgres_password, postgres_server, postgres_port, postgres_db]):
    DATABASE_URL = (
        f'postgresql://{postgres_user}:{postgres_password}@{postgres_server}:{postgres_port}/{postgres_db}'
    )
if not DATABASE_URL:
    DATABASE_URL = 'sqlite:///./styleverse_ai.db'

connect_args = {'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}

engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def ensure_pgvector_extension() -> None:
    """Enable the pgvector extension when Postgres is in use, if the database supports it."""
    if not DATABASE_URL.startswith('postgresql'):
        return
    try:
        with engine.begin() as connection:
            connection.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
    except Exception:
        # The local PostgreSQL runtime may not have pgvector installed; product search
        # should remain usable with the SQLAlchemy JSON fallback instead of crashing startup.
        pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
