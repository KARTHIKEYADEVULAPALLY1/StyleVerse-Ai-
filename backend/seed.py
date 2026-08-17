"""Database seed script for StyleVerse AI."""
from __future__ import annotations

import sys

if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

from app.database import Base, SessionLocal, engine
from app.models.product import Product
from app.models.user import User  # noqa: F401
from app.services.product_service import seed_initial_products, get_all_products


def main() -> None:
    print('Initializing database tables...')
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        print('Seeding initial products...')
        seed_initial_products(db)
        products = get_all_products(db)
        print(f'Successfully seeded! Total products in database: {len(products)}')
        for p in products:
            print(f'  - [{p.id}] {p.brand} {p.name} ({p.category}) - {p.price}')
    finally:
        db.close()


if __name__ == '__main__':
    main()
