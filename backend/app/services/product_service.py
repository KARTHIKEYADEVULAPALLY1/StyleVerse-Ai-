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
from app.data.curated_catalog import CURATED_PRODUCTS

from app.services.normalization_service import (
    normalize_product_metadata,
)

SEMANTIC_SYNONYMS = {
    'formal': {'formal', 'formalwear', 'elegant', 'sophisticated', 'polished', 'dressy', 'evening', 'dinner', 'party', 'night', 'date', 'blazer', 'suit', 'office', 'executive', 'work'},
    'casual': {'casual', 'college', 'daily', 'relaxed', 'everyday', 'streetwear', 'comfortable', 'lazy', 'simple', 'tee', 'hoodie'},
    'winter': {'winter', 'cold', 'warm', 'coat', 'outerwear', 'layered', 'wool', 'chilly', 'holiday', 'overcoat', 'insulated'},
    'travel': {'travel', 'commute', 'airport', 'packed', 'lightweight', 'weekend', 'outdoor', 'vacation'},
    'office': {'office', 'work', 'workwear', 'smart', 'professional', 'tailored', 'meeting', 'corporate', 'formal'},
    'athleisure': {'athleisure', 'sporty', 'active', 'workout', 'running', 'training', 'comfort', 'gym', 'sneakers'},
    'minimal': {'minimal', 'minimalist', 'clean', 'plain', 'simple', 'neutral', 'classic', 'monochrome'},
    'summer': {'summer', 'light', 'bright', 'sunny', 'beach', 'tropical', 'linen', 'breathable'},
    'night': {'night', 'evening', 'party', 'date', 'dinner', 'cocktail'},
}

VECTOR_SIZE = 64

INITIAL_PRODUCTS: List[Dict[str, Any]] = [
    {
        'id': 1,
        'name': 'Oversized Graphic Hoodie',
        'brand': 'H&M',
        'category': 'Hoodies',
        'subcategory': 'Graphic Hoodie',
        'target_gender': 'Unisex',
        'styles': ['Streetwear', 'Casual'],
        'occasions': ['Casual Day'],
        'materials': ['Cotton'],
        'seasons': ['All Season', 'Winter', 'Fall/Autumn'],
        'description': 'A relaxed oversized hoodie in black with graphic detailing for a casual streetwear look.',
        'price': '₹1,299',
        'original_price': '₹2,499',
        'rating': 4.5,
        'image': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
        'store': 'H&M',
        'colors': ['Black', 'Gray', 'Cream'],
        'normalized_colors': ['Black', 'Gray', 'Cream'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 2,
        'name': 'Classic White Sneakers',
        'brand': 'Nike',
        'category': 'Sneakers',
        'subcategory': 'Running Sneakers',
        'target_gender': 'Unisex',
        'styles': ['Athleisure', 'Minimalist', 'Casual'],
        'occasions': ['Casual Day', 'Workout', 'Travel'],
        'materials': ['Leather', 'Polyester'],
        'seasons': ['All Season', 'Summer', 'Spring'],
        'description': 'Clean white sneakers designed for everyday comfort, casual dressing, and all-day wear.',
        'price': '₹4,999',
        'original_price': '₹6,999',
        'rating': 4.8,
        'image': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
        'store': 'Nike',
        'colors': ['White', 'Off White', 'Black'],
        'normalized_colors': ['White', 'Off White', 'Black'],
        'sizes': ['6', '7', '8', '9', '10'],
    },
    {
        'id': 3,
        'name': 'Korean Streetwear Jacket',
        'brand': 'Zara',
        'category': 'Jackets',
        'subcategory': 'Bomber Jacket',
        'target_gender': 'Unisex',
        'styles': ['Streetwear', 'Casual'],
        'occasions': ['Casual Day', 'Travel', 'Party'],
        'materials': ['Cotton', 'Polyester'],
        'seasons': ['All Season', 'Fall/Autumn', 'Winter'],
        'description': 'A lightweight streetwear jacket with a sharp silhouette and versatile layering for cool weather.',
        'price': '₹3,499',
        'original_price': '₹5,999',
        'rating': 4.3,
        'image': 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
        'store': 'Zara',
        'colors': ['Olive', 'Black', 'Stone'],
        'normalized_colors': ['Olive', 'Black', 'Stone'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 4,
        'name': 'Minimalist Watch',
        'brand': 'Daniel Wellington',
        'category': 'Accessories',
        'subcategory': 'Analog Chronograph',
        'target_gender': 'Unisex',
        'styles': ['Minimalist', 'Formal', 'Vintage'],
        'occasions': ['Office', 'Date Night', 'Party', 'Wedding'],
        'materials': ['Stainless Steel', 'Leather'],
        'seasons': ['All Season'],
        'description': 'An elegant minimalist watch with a refined silver finish perfect for daily styling.',
        'price': '₹8,999',
        'original_price': '₹12,999',
        'rating': 4.7,
        'image': 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80',
        'store': 'Daniel Wellington',
        'colors': ['Silver', 'Black', 'Gold'],
        'normalized_colors': ['Silver', 'Black', 'Gold'],
        'sizes': ['ONE SIZE'],
    },
    {
        'id': 5,
        'name': 'Slim Fit Chinos',
        'brand': 'Uniqlo',
        'category': 'Pants',
        'subcategory': 'Chino Trousers',
        'target_gender': 'Men',
        'styles': ['Minimalist', 'Formal', 'Casual'],
        'occasions': ['Office', 'Casual Day', 'Travel'],
        'materials': ['Cotton', 'Polyester'],
        'seasons': ['All Season', 'Summer', 'Spring'],
        'description': 'Tailored slim-fit chinos in a classic neutral tone made for smart casual styling.',
        'price': '₹1,999',
        'original_price': '₹3,499',
        'rating': 4.4,
        'image': 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80',
        'store': 'Uniqlo',
        'colors': ['Sand', 'Navy', 'Charcoal'],
        'normalized_colors': ['Stone', 'Navy', 'Charcoal'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 6,
        'name': 'Leather Crossbody Bag',
        'brand': 'Fossil',
        'category': 'Bags',
        'subcategory': 'Leather Crossbody Bag',
        'target_gender': 'Women',
        'styles': ['Vintage', 'Minimalist', 'Casual'],
        'occasions': ['Casual Day', 'Travel', 'Date Night', 'Office'],
        'materials': ['Leather'],
        'seasons': ['All Season'],
        'description': 'A compact leather crossbody bag with a premium finish and everyday utility.',
        'price': '₹5,499',
        'original_price': '₹7,999',
        'rating': 4.6,
        'image': 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
        'store': 'Fossil',
        'colors': ['Tan', 'Black', 'Espresso'],
        'normalized_colors': ['Tan', 'Black', 'Espresso'],
        'sizes': ['ONE SIZE'],
    },
    {
        'id': 7,
        'name': 'Everyday Cotton Tee',
        'brand': 'H&M',
        'category': 'Tops',
        'subcategory': 'Crewneck Tee',
        'target_gender': 'Unisex',
        'styles': ['Casual', 'Minimalist'],
        'occasions': ['Casual Day', 'Travel'],
        'materials': ['Cotton'],
        'seasons': ['All Season', 'Summer', 'Spring'],
        'description': 'A soft casual cotton top in a relaxed fit for everyday outfits and layered styling.',
        'price': '₹799',
        'original_price': '₹1,299',
        'rating': 4.2,
        'image': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80',
        'store': 'H&M',
        'colors': ['Cream', 'Black', 'Navy'],
        'normalized_colors': ['Cream', 'Black', 'Navy'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 8,
        'name': 'Silk Slip Dress',
        'brand': 'Zara',
        'category': 'Dresses',
        'subcategory': 'Silk Slip Dress',
        'target_gender': 'Women',
        'styles': ['Formal', 'Bohemian'],
        'occasions': ['Date Night', 'Party', 'Wedding'],
        'materials': ['Silk', 'Satin'],
        'seasons': ['Summer', 'All Season'],
        'description': 'A black satin slip dress with a flattering silhouette for evening wear and special occasions.',
        'price': '₹3,999',
        'original_price': '₹5,499',
        'rating': 4.7,
        'image': 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400&q=80',
        'store': 'Zara',
        'colors': ['Black', 'Wine', 'Champagne'],
        'normalized_colors': ['Black', 'Wine', 'Gold'],
        'sizes': ['S', 'M', 'L'],
    },
    {
        'id': 9,
        'name': 'Winter Wool Coat',
        'brand': 'Uniqlo',
        'category': 'Outerwear',
        'subcategory': 'Tailored Overcoat',
        'target_gender': 'Unisex',
        'styles': ['Winter', 'Formal', 'Minimalist'],
        'occasions': ['Office', 'Casual Day', 'Travel'],
        'materials': ['Wool'],
        'seasons': ['Winter', 'Fall/Autumn'],
        'description': 'A warm winter coat with layered insulation and a classic silhouette for chilly weather.',
        'price': '₹6,499',
        'original_price': '₹9,999',
        'rating': 4.5,
        'image': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80',
        'store': 'Uniqlo',
        'colors': ['Charcoal', 'Camel', 'Black'],
        'normalized_colors': ['Charcoal', 'Camel', 'Black'],
        'sizes': ['S', 'M', 'L', 'XL'],
    },
    {
        'id': 10,
        'name': 'Crimson Red Blazer',
        'brand': 'Mango',
        'category': 'Blazers',
        'subcategory': 'Structured Blazer',
        'target_gender': 'Women',
        'styles': ['Formal', 'Minimalist'],
        'occasions': ['Office', 'Party', 'Date Night'],
        'materials': ['Cotton', 'Polyester'],
        'seasons': ['All Season', 'Fall/Autumn', 'Spring'],
        'description': 'A bold red blazer offering a polished statement look for work and evening dressing.',
        'price': '₹4,299',
        'original_price': '₹6,499',
        'rating': 4.6,
        'image': 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=400&q=80',
        'store': 'Mango',
        'colors': ['Red', 'Black', 'Stone'],
        'normalized_colors': ['Red', 'Black', 'Stone'],
        'sizes': ['S', 'M', 'L'],
    },
]

# Additional discovery inventory keeps the local MVP useful without depending
# on a live merchant sync. Every item uses a publicly reachable image and is
# paired with real retailer URLs by ``price_service.seed_product_offers``.
INITIAL_PRODUCTS.extend(
    [
        {
            'id': 11,
            'name': 'Formal Satin Midi Dress',
            'brand': 'Mango',
            'category': 'Dresses',
            'subcategory': 'Midi Dress',
            'target_gender': 'Women',
            'styles': ['Formal', 'Minimalist'],
            'occasions': ['Office', 'Date Night', 'Wedding'],
            'materials': ['Satin'],
            'seasons': ['All Season', 'Summer'],
            'description': 'A polished satin midi dress for formal dinners, office events, and celebrations.',
            'price': '₹3,799',
            'original_price': '₹5,999',
            'rating': 4.5,
            'image': 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=85',
            'store': 'Mango',
            'colors': ['Wine', 'Black'],
            'normalized_colors': ['Wine', 'Black'],
            'sizes': ['XS', 'S', 'M', 'L'],
        },
        {
            'id': 12,
            'name': 'Relaxed Zip Hoodie',
            'brand': 'Adidas',
            'category': 'Hoodies',
            'subcategory': 'Zip Hoodie',
            'target_gender': 'Unisex',
            'styles': ['Casual', 'Athleisure'],
            'occasions': ['Casual Day', 'Travel', 'Workout'],
            'materials': ['Cotton', 'Polyester'],
            'seasons': ['All Season', 'Winter'],
            'description': 'A soft zip hoodie with a relaxed fit for casual layers and travel days.',
            'price': '₹2,499',
            'original_price': '₹3,999',
            'rating': 4.4,
            'image': 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=85',
            'store': 'Adidas',
            'colors': ['Gray', 'Black'],
            'normalized_colors': ['Gray', 'Black'],
            'sizes': ['S', 'M', 'L', 'XL'],
        },
        {
            'id': 13,
            'name': 'Leather Low-Top Shoes',
            'brand': 'Clarks',
            'category': 'Sneakers',
            'subcategory': 'Casual Shoes',
            'target_gender': 'Men',
            'styles': ['Minimalist', 'Casual'],
            'occasions': ['Casual Day', 'Office', 'Travel'],
            'materials': ['Leather'],
            'seasons': ['All Season'],
            'description': 'Clean leather low-top shoes that move from smart casual office looks to weekends.',
            'price': '₹4,299',
            'original_price': '₹6,499',
            'rating': 4.3,
            'image': 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=85',
            'store': 'Clarks',
            'colors': ['Black', 'Tan'],
            'normalized_colors': ['Black', 'Tan'],
            'sizes': ['7', '8', '9', '10'],
        },
        {
            'id': 14,
            'name': 'Tailored Pleat Trousers',
            'brand': 'Massimo Dutti',
            'category': 'Pants',
            'subcategory': 'Tailored Trousers',
            'target_gender': 'Women',
            'styles': ['Formal', 'Minimalist'],
            'occasions': ['Office', 'Date Night', 'Wedding'],
            'materials': ['Wool', 'Polyester'],
            'seasons': ['All Season', 'Fall/Autumn'],
            'description': 'High-waist tailored trousers with a refined pleat for polished formal dressing.',
            'price': '₹3,999',
            'original_price': '₹5,999',
            'rating': 4.4,
            'image': 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=600&q=85',
            'store': 'Massimo Dutti',
            'colors': ['Charcoal', 'Camel'],
            'normalized_colors': ['Charcoal', 'Camel'],
            'sizes': ['XS', 'S', 'M', 'L'],
        },
        {
            'id': 15,
            'name': 'Linen Resort Shirt',
            'brand': 'Uniqlo',
            'category': 'Tops',
            'subcategory': 'Linen Shirt',
            'target_gender': 'Unisex',
            'styles': ['Casual', 'Minimalist'],
            'occasions': ['Casual Day', 'Travel'],
            'materials': ['Linen'],
            'seasons': ['Summer', 'Spring'],
            'description': 'Breathable linen shirt with a relaxed silhouette for warm-weather casual outfits.',
            'price': '₹1,999',
            'original_price': '₹2,999',
            'rating': 4.2,
            'image': 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&q=85',
            'store': 'Uniqlo',
            'colors': ['White', 'Stone', 'Blue'],
            'normalized_colors': ['White', 'Stone', 'Blue'],
            'sizes': ['S', 'M', 'L', 'XL'],
        },
        {
            'id': 16,
            'name': 'Pleated Occasion Dress',
            'brand': 'Vero Moda',
            'category': 'Dresses',
            'subcategory': 'Pleated Dress',
            'target_gender': 'Women',
            'styles': ['Formal', 'Bohemian'],
            'occasions': ['Party', 'Wedding', 'Date Night'],
            'materials': ['Polyester'],
            'seasons': ['All Season', 'Spring'],
            'description': 'A flowing pleated dress designed for parties, weddings, and evening occasions.',
            'price': '₹2,899',
            'original_price': '₹4,499',
            'rating': 4.5,
            'image': 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&q=85',
            'store': 'Vero Moda',
            'colors': ['Navy', 'Wine'],
            'normalized_colors': ['Navy', 'Wine'],
            'sizes': ['XS', 'S', 'M', 'L'],
        },
        {
            'id': 17,
            'name': 'Court Sneakers',
            'brand': 'Adidas',
            'category': 'Sneakers',
            'subcategory': 'Lifestyle Sneakers',
            'target_gender': 'Unisex',
            'styles': ['Casual', 'Athleisure'],
            'occasions': ['Casual Day', 'Travel', 'Workout'],
            'materials': ['Leather', 'Rubber'],
            'seasons': ['All Season'],
            'description': 'Court-inspired sneakers with a cushioned sole for everyday casual comfort.',
            'price': '₹3,499',
            'original_price': '₹4,999',
            'rating': 4.6,
            'image': 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&q=85',
            'store': 'Adidas',
            'colors': ['White', 'Green'],
            'normalized_colors': ['White', 'Green'],
            'sizes': ['6', '7', '8', '9', '10'],
        },
        {
            'id': 18,
            'name': 'Utility Overshirt',
            'brand': "Levi's",
            'category': 'Jackets',
            'subcategory': 'Overshirt',
            'target_gender': 'Unisex',
            'styles': ['Streetwear', 'Casual'],
            'occasions': ['Casual Day', 'Travel'],
            'materials': ['Cotton'],
            'seasons': ['All Season', 'Fall/Autumn'],
            'description': 'A versatile cotton overshirt with utility pockets for layered casual looks.',
            'price': '₹2,999',
            'original_price': '₹4,499',
            'rating': 4.3,
            'image': 'https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=600&q=85',
            'store': 'Levi’s',
            'colors': ['Olive', 'Khaki'],
            'normalized_colors': ['Olive', 'Khaki'],
            'sizes': ['S', 'M', 'L', 'XL'],
        },
        {
            'id': 19,
            'name': 'Structured Work Tote',
            'brand': 'Charles & Keith',
            'category': 'Bags',
            'subcategory': 'Work Tote',
            'target_gender': 'Women',
            'styles': ['Formal', 'Minimalist'],
            'occasions': ['Office', 'Travel'],
            'materials': ['Faux Leather'],
            'seasons': ['All Season'],
            'description': 'A structured tote with room for workday essentials and polished office styling.',
            'price': '₹3,299',
            'original_price': '₹4,999',
            'rating': 4.4,
            'image': 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=85',
            'store': 'Charles & Keith',
            'colors': ['Tan', 'Black'],
            'normalized_colors': ['Tan', 'Black'],
            'sizes': ['ONE SIZE'],
        },
        {
            'id': 20,
            'name': 'Classic Oxford Shirt',
            'brand': 'Marks & Spencer',
            'category': 'Tops',
            'subcategory': 'Oxford Shirt',
            'target_gender': 'Men',
            'styles': ['Formal', 'Casual'],
            'occasions': ['Office', 'Casual Day', 'Wedding'],
            'materials': ['Cotton'],
            'seasons': ['All Season'],
            'description': 'A crisp cotton Oxford shirt that works for office, smart casual, and formal looks.',
            'price': '₹2,299',
            'original_price': '₹3,499',
            'rating': 4.5,
            'image': 'https://images.unsplash.com/photo-1603252110481-7ba873bf42ab?w=600&q=85',
            'store': 'Marks & Spencer',
            'colors': ['White', 'Blue'],
            'normalized_colors': ['White', 'Blue'],
            'sizes': ['S', 'M', 'L', 'XL'],
        },
    ]
)

# Keep the historical seed block above available for migration/test references,
# but expose only the curated retailer catalog to the application.
INITIAL_PRODUCTS = CURATED_PRODUCTS



def normalize_tokens(value: str) -> List[str]:
    return [token.lower() for token in re.split(r'[^a-z0-9]+', (value or '').lower()) if token]


def product_text_for_embedding(product: Product) -> str:
    return ' '.join(
        [
            product.name or '',
            product.brand or '',
            product.category or '',
            product.subcategory or '',
            product.target_gender or '',
            product.description or '',
            *(product.styles or []),
            *(product.occasions or []),
            *(product.materials or []),
            *(product.seasons or []),
            *(product.normalized_colors or product.colors or []),
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
            if token in variants or token == canonical:
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
        clauses.append(Product.brand.ilike(f'%{token}%'))
        clauses.append(Product.subcategory.ilike(f'%{token}%'))
        clauses.append(Product.target_gender.ilike(f'%{token}%'))

    return db.query(Product).filter(or_(*clauses)).order_by(Product.id.asc()).all()


def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    """Retrieve a single product by ID."""
    return db.query(Product).filter(Product.id == product_id).first()


def seed_initial_products(db: Session) -> None:
    """Seed initial StyleVerse products and backfill normalized metadata."""
    ensure_product_search_columns(db)

    current_ids = {product_data['id'] for product_data in INITIAL_PRODUCTS}
    db.query(Product).filter(Product.id.notin_(current_ids)).update(
        {Product.is_active: False},
        synchronize_session=False,
    )

    for product_data in INITIAL_PRODUCTS:
        existing = db.query(Product).filter(Product.id == product_data['id']).first()
        if not existing:
            product = Product(
                id=product_data['id'],
                name=product_data['name'],
                brand=product_data['brand'],
                category=product_data['category'],
                subcategory=product_data.get('subcategory'),
                target_gender=product_data.get('target_gender', 'Unisex'),
                styles=product_data.get('styles', []),
                occasions=product_data.get('occasions', []),
                materials=product_data.get('materials', []),
                seasons=product_data.get('seasons', []),
                description=product_data.get('description', ''),
                price=product_data['price'],
                original_price=product_data['original_price'],
                rating=product_data['rating'],
                image=product_data['image'],
                store=product_data['store'],
                colors=product_data['colors'],
                normalized_colors=product_data.get('normalized_colors', product_data['colors']),
                sizes=product_data['sizes'],
            )
            db.add(product)
        else:
            existing.is_active = True
            for field_name in [
                'name', 'brand', 'category', 'subcategory', 'target_gender',
                'styles', 'occasions', 'materials', 'seasons', 'description',
                'price', 'original_price', 'rating', 'image', 'store',
                'colors', 'normalized_colors', 'sizes',
            ]:
                if field_name in product_data:
                    setattr(existing, field_name, product_data[field_name])

    # Ensure all products in the database have normalized metadata populated
    for prod in db.query(Product).all():
        if prod.styles is None or prod.occasions is None or prod.normalized_colors is None or prod.subcategory is None:
            normalized = normalize_product_metadata({
                'name': prod.name,
                'brand': prod.brand,
                'category': prod.category,
                'subcategory': prod.subcategory,
                'target_gender': prod.target_gender,
                'description': prod.description,
                'colors': prod.colors,
                'styles': prod.styles,
                'occasions': prod.occasions,
                'materials': prod.materials,
                'seasons': prod.seasons,
                'sizes': prod.sizes,
            })
            if not prod.subcategory and normalized.get('subcategory'):
                prod.subcategory = normalized['subcategory']
            if not prod.target_gender and normalized.get('target_gender'):
                prod.target_gender = normalized['target_gender']
            if not prod.styles and normalized.get('styles'):
                prod.styles = normalized['styles']
            if not prod.occasions and normalized.get('occasions'):
                prod.occasions = normalized['occasions']
            if not prod.materials and normalized.get('materials'):
                prod.materials = normalized['materials']
            if not prod.seasons and normalized.get('seasons'):
                prod.seasons = normalized['seasons']
            if not prod.normalized_colors and normalized.get('normalized_colors'):
                prod.normalized_colors = normalized['normalized_colors']

        if prod.styles is None:
            prod.styles = []
        if prod.occasions is None:
            prod.occasions = []
        if prod.materials is None:
            prod.materials = []
        if prod.seasons is None:
            prod.seasons = []
        if prod.normalized_colors is None:
            prod.normalized_colors = []

    db.commit()
    generate_and_store_embeddings(db)
