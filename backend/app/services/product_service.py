from __future__ import annotations

import hashlib
import json
import math
import re
from typing import Any, Dict, List, Optional

from sqlalchemy import inspect, or_, text
from sqlalchemy.orm import Session

try:
    from pgvector.sqlalchemy import Vector
except ImportError:  # pragma: no cover
    Vector = None

from app.models.product import Product

SEMANTIC_SYNONYMS = {
    'formal': {'formal', 'elegant', 'sophisticated', 'polished', 'dressy', 'evening', 'dinner', 'party', 'night', 'date'},
    'casual': {'casual', 'college', 'daily', 'relaxed', 'everyday', 'streetwear', 'comfortable', 'lazy', 'simple'},
    'winter': {'winter', 'cold', 'warm', 'coat', 'outerwear', 'layered', 'wool', 'chilly', 'holiday'},
    'travel': {'travel', 'commute', 'airport', 'packed', 'lightweight', 'weekend', 'outdoor'},
    'office': {'office', 'work', 'smart', 'professional', 'tailored', 'meeting'},
    'athleisure': {'athleisure', 'sporty', 'active', 'workout', 'running', 'training', 'comfort'},
    'minimal': {'minimal', 'clean', 'plain', 'simple', 'neutral', 'classic'},
    'summer': {'summer', 'light', 'bright', 'sunny', 'beach', 'tropical'},
    'night': {'night', 'evening', 'party', 'date', 'dinner'},
}

VECTOR_SIZE = 64

INITIAL_PRODUCTS: List[Dict[str, Any]] = [
    {
        'id': 1,
        'name': 'Oversized Graphic Hoodie',
        'brand': 'H&M',
        'category': 'Hoodies',
        'description': 'A relaxed oversized hoodie in black with graphic detailing for a casual streetwear look.',
        'price': '₹1,299',
        'original_price': '₹2,499',
        'rating': 4.5,
        'image': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        'store': 'H&M',
        'colors': ['Black', 'Gray', 'Cream'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 2,
        'name': 'Classic White Sneakers',
        'brand': 'Nike',
        'category': 'Sneakers',
        'description': 'Clean white sneakers designed for everyday comfort, casual dressing, and all-day wear.',
        'price': '₹4,999',
        'original_price': '₹6,999',
        'rating': 4.8,
        'image': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        'store': 'Nike',
        'colors': ['White', 'Off White', 'Black'],
        'sizes': ['6', '7', '8', '9', '10'],
    },
    {
        'id': 3,
        'name': 'Korean Streetwear Jacket',
        'brand': 'Zara',
        'category': 'Jackets',
        'description': 'A lightweight streetwear jacket with a sharp silhouette and versatile layering for cool weather.',
        'price': '₹3,499',
        'original_price': '₹5,999',
        'rating': 4.3,
        'image': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
        'store': 'Zara',
        'colors': ['Olive', 'Black', 'Stone'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 4,
        'name': 'Minimalist Watch',
        'brand': 'Daniel Wellington',
        'category': 'Accessories',
        'description': 'An elegant minimalist watch with a refined silver finish perfect for daily styling.',
        'price': '₹8,999',
        'original_price': '₹12,999',
        'rating': 4.7,
        'image': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80',
        'store': 'Daniel Wellington',
        'colors': ['Silver', 'Black', 'Gold'],
        'sizes': ['One Size'],
    },
    {
        'id': 5,
        'name': 'Slim Fit Chinos',
        'brand': 'Uniqlo',
        'category': 'Pants',
        'description': 'Tailored slim-fit chinos in a classic neutral tone made for smart casual styling.',
        'price': '₹1,999',
        'original_price': '₹3,499',
        'rating': 4.4,
        'image': 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80',
        'store': 'Uniqlo',
        'colors': ['Sand', 'Navy', 'Charcoal'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 6,
        'name': 'Leather Crossbody Bag',
        'brand': 'Fossil',
        'category': 'Bags',
        'description': 'A compact leather crossbody bag with a premium finish and everyday utility.',
        'price': '₹5,499',
        'original_price': '₹7,999',
        'rating': 4.6,
        'image': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
        'store': 'Fossil',
        'colors': ['Tan', 'Black', 'Espresso'],
        'sizes': ['One Size'],
    },
    {
        'id': 7,
        'name': 'Everyday Cotton Tee',
        'brand': 'H&M',
        'category': 'Tops',
        'description': 'A soft casual cotton top in a relaxed fit for everyday outfits and layered styling.',
        'price': '₹799',
        'original_price': '₹1,299',
        'rating': 4.2,
        'image': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80',
        'store': 'H&M',
        'colors': ['Cream', 'Black', 'Navy'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 8,
        'name': 'Silk Slip Dress',
        'brand': 'Zara',
        'category': 'Dresses',
        'description': 'A black satin slip dress with a flattering silhouette for evening wear and special occasions.',
        'price': '₹3,999',
        'original_price': '₹5,499',
        'rating': 4.7,
        'image': 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80',
        'store': 'Zara',
        'colors': ['Black', 'Wine', 'Champagne'],
        'sizes': ['S', 'M', 'L'],
    },
    {
        'id': 9,
        'name': 'Winter Wool Coat',
        'brand': 'Uniqlo',
        'category': 'Outerwear',
        'description': 'A warm winter coat with layered insulation and a classic silhouette for chilly weather.',
        'price': '₹6,499',
        'original_price': '₹9,999',
        'rating': 4.5,
        'image': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80',
        'store': 'Uniqlo',
        'colors': ['Charcoal', 'Camel', 'Black'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 10,
        'name': 'Crimson Red Blazer',
        'brand': 'Mango',
        'category': 'Blazers',
        'description': 'A bold red blazer offering a polished statement look for work and evening dressing.',
        'price': '₹4,299',
        'original_price': '₹6,499',
        'rating': 4.6,
        'image': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80',
        'store': 'Mango',
        'colors': ['Red', 'Black', 'Stone'],
        'sizes': ['S', 'M', 'L'],
    },
]


def normalize_tokens(value: str) -> List[str]:
    return [token.lower() for token in re.split(r'[^a-z0-9]+', (value or '').lower()) if token]


def product_text_for_embedding(product: Product) -> str:
    return ' '.join(
        [
            product.name or '',
            product.brand or '',
            product.category or '',
            product.description or '',
            *(product.colors or []),
            *(product.sizes or []),
        ]
    )


def build_semantic_vector(text: str) -> List[float]:
    vector = [0.0] * VECTOR_SIZE
    tokens = normalize_tokens(text)
    if not tokens:
        return vector

    expanded_tokens: set[str] = set()
    for token in tokens:
        expanded_tokens.add(token)
        for canonical, variants in SEMANTIC_SYNONYMS.items():
            if token in variants:
                expanded_tokens.add(canonical)
                expanded_tokens.update(variants)

    for token in expanded_tokens:
        digest = int.from_bytes(hashlib.md5(token.encode('utf-8')).digest(), 'big')
        index = digest % VECTOR_SIZE
        weight = 1.25 if token in tokens else 1.0
        vector[index] += weight

    norm = math.sqrt(sum(value * value for value in vector))
    if norm > 0:
        vector = [value / norm for value in vector]
    return vector


def cosine_similarity(left: List[float], right: List[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return dot / (left_norm * right_norm)


def ensure_product_search_columns(db: Session) -> None:
    """Ensure the product table includes description and embedding fields for semantic search."""
    columns = [column['name'] for column in inspect(db.bind).get_columns('products')]
    if 'description' not in columns:
        db.execute(text('ALTER TABLE products ADD COLUMN IF NOT EXISTS description VARCHAR(500)'))
    if 'embedding' not in columns:
        if db.bind.dialect.name == 'postgresql':
            try:
                db.execute(text('CREATE EXTENSION IF NOT EXISTS vector'))
                db.execute(text('ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding vector(64)'))
            except Exception:
                db.rollback()
                db.execute(text('ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding TEXT'))
        else:
            db.execute(text('ALTER TABLE products ADD COLUMN IF NOT EXISTS embedding TEXT'))
    db.commit()


def generate_and_store_embeddings(db: Session) -> int:
    """Generate deterministic semantic embeddings for existing products and persist them."""
    updated = 0
    for product in db.query(Product).all():
        vector = build_semantic_vector(product_text_for_embedding(product))
        if db.bind.dialect.name == 'postgresql' and Vector is not None:
            product.embedding = vector
        else:
            product.embedding = json.dumps(vector)
        updated += 1
    db.commit()
    return updated


def get_all_products(db: Session) -> List[Product]:
    """Retrieve all products from database ordered by ID."""
    return db.query(Product).order_by(Product.id.asc()).all()


def semantic_search_products(db: Session, query: str, limit: int = 12) -> List[Product]:
    """Return semantically relevant products using cosine similarity over lightweight embeddings."""
    normalized_query = ' '.join(re.split(r'\s+', (query or '').strip()))
    if not normalized_query:
        return get_all_products(db)

    query_vector = build_semantic_vector(normalized_query)
    if db.bind.dialect.name == 'postgresql':
        try:
            result = (
                db.query(Product)
                .filter(Product.embedding.isnot(None))
                .order_by(Product.embedding.cosine_distance(query_vector))
                .limit(limit)
                .all()
            )
            if result:
                return result
        except Exception:
            pass

    scored = []
    for product in get_all_products(db):
        embedding_value = product.embedding
        if isinstance(embedding_value, str):
            try:
                embedding_value = json.loads(embedding_value)
            except (TypeError, ValueError):
                embedding_value = None
        if embedding_value:
            score = cosine_similarity(list(embedding_value), query_vector)
        else:
            score = cosine_similarity(build_semantic_vector(product_text_for_embedding(product)), query_vector)
        scored.append((product, score))

    scored.sort(key=lambda item: item[1], reverse=True)
    return [product for product, _ in scored[:limit] if _ > 0.0]


def search_products(db: Session, query: str) -> List[Product]:
    """Search product records by semantic intent and then fall back to keyword matching when needed."""
    normalized_query = ' '.join(re.split(r'\s+', (query or '').strip()))
    if not normalized_query:
        return get_all_products(db)

    semantic_matches = semantic_search_products(db, normalized_query)
    if semantic_matches:
        return semantic_matches

    tokens = [token.lower() for token in re.split(r'[^a-zA-Z0-9]+', normalized_query) if token]
    if not tokens:
        return []

    clauses = []
    for token in tokens:
        clauses.append(Product.name.ilike(f'%{token}%'))
        clauses.append(Product.category.ilike(f'%{token}%'))
        clauses.append(Product.description.ilike(f'%{token}%'))

    return db.query(Product).filter(or_(*clauses)).order_by(Product.id.asc()).all()


def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    """Retrieve a single product by ID."""
    return db.query(Product).filter(Product.id == product_id).first()


def seed_initial_products(db: Session) -> None:
    """Seed initial StyleVerse products if not present in the database."""
    ensure_product_search_columns(db)

    for product_data in INITIAL_PRODUCTS:
        existing = db.query(Product).filter(Product.id == product_data['id']).first()
        if not existing:
            product = Product(
                id=product_data['id'],
                name=product_data['name'],
                brand=product_data['brand'],
                category=product_data['category'],
                description=product_data.get('description', ''),
                price=product_data['price'],
                original_price=product_data['original_price'],
                rating=product_data['rating'],
                image=product_data['image'],
                store=product_data['store'],
                colors=product_data['colors'],
                sizes=product_data['sizes'],
            )
            db.add(product)
        else:
            for field_name in ['name', 'brand', 'category', 'description', 'price', 'original_price', 'rating', 'image', 'store', 'colors', 'sizes']:
                value = product_data.get(field_name)
                if value is not None and getattr(existing, field_name, None) != value:
                    setattr(existing, field_name, value)
    db.commit()
    generate_and_store_embeddings(db)
