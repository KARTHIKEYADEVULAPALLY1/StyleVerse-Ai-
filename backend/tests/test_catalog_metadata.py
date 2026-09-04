"""Comprehensive test suite for the enriched Product Catalog metadata."""
from __future__ import annotations

import pytest
from sqlalchemy.orm import Session

from app.models.product import Product
from app.services.catalog_service import catalog_summary, get_catalog_product, list_catalog_products
from app.services.discovery_service import discover_products
from app.services.product_service import search_products, seed_initial_products
from app.services.recommendation_service import get_recommendations_for_user
from app.services.stylist_service import generate_outfit, generate_outfit_recommendations


def test_metadata_persistence_and_enrichment(db_session: Session):
    seed_initial_products(db_session)
    products = db_session.query(Product).all()
    assert len(products) >= 10

    # Verify every product has rich metadata fields populated
    for p in products:
        assert p.category is not None
        assert p.subcategory is not None
        assert p.target_gender in {'Men', 'Women', 'Unisex', 'Kids'}
        assert isinstance(p.styles, list) and len(p.styles) > 0
        assert isinstance(p.occasions, list) and len(p.occasions) > 0
        assert isinstance(p.normalized_colors, list) and len(p.normalized_colors) > 0
        assert isinstance(p.materials, list)
        assert isinstance(p.seasons, list)


def test_search_by_semantic_metadata(db_session: Session):
    seed_initial_products(db_session)

    # The curated catalog supports travel/casual discovery rather than the
    # retired synthetic formalwear catalog.
    results = search_products(db_session, 'travel jacket')
    assert len(results) > 0
    categories = [r.category for r in results]
    assert any(cat in categories for cat in ['Jackets', 'Outerwear', 'Fleece'])

    hoodie_results = search_products(db_session, 'green hoodie')
    assert len(hoodie_results) > 0
    assert any('Hoodie' in r.name for r in hoodie_results)


def test_discovery_filtering_by_metadata(db_session: Session):
    seed_initial_products(db_session)

    casual_res = discover_products(db_session, style='Casual')
    assert casual_res['total'] > 0
    for item in casual_res['products']:
        styles_lower = [s.lower() for s in item.get('styles', [])]
        assert 'casual' in styles_lower

    travel_res = discover_products(db_session, occasion='Travel')
    assert travel_res['total'] > 0
    for item in travel_res['products']:
        occasions_lower = [o.lower() for o in item.get('occasions', [])]
        assert 'travel' in occasions_lower

    # Filter by Color
    black_res = discover_products(db_session, color='Black')
    assert black_res['total'] > 0
    for item in black_res['products']:
        colors_lower = [c.lower() for c in item.get('normalized_colors', [])]
        assert 'black' in colors_lower

    # Available filters facet check
    assert 'categories' in casual_res['available_filters']
    assert 'styles' in casual_res['available_filters']
    assert 'occasions' in casual_res['available_filters']
    assert 'colors' in casual_res['available_filters']


def test_ai_stylist_with_normalized_metadata(db_session: Session):
    seed_initial_products(db_session)

    # Occasion: Office, Style: Formal, Color: Neutral, Budget: 10000
    outfit = generate_outfit(
        db_session,
        occasion='Office',
        style='Formal',
        color='Neutral',
        budget=15000,
    )
    assert len(outfit) > 0
    roles = [role for role, _ in outfit]
    assert any(role in {'top', 'bottom', 'accessory', 'shoes'} for role in roles)

    # Top recommendations
    recs = generate_outfit_recommendations(
        db_session,
        occasion='Office',
        style='Formal',
        color='Neutral',
        budget=15000,
    )
    assert len(recs) > 0
    top_product = recs[0]
    assert top_product.category in {'Blazers', 'Pants', 'Accessories', 'Outerwear', 'Tops'}


def test_recommendations_with_normalized_metadata(db_session: Session):
    seed_initial_products(db_session)
    # Recommendation engine should return valid recommendations without errors
    results = get_recommendations_for_user(db_session, user_id=1, limit=5)
    assert isinstance(results, list)


def test_admin_catalog_quality_and_warnings(db_session: Session):
    seed_initial_products(db_session)

    summary = catalog_summary(db_session)
    assert summary['total_products'] >= 10

    catalog_list = list_catalog_products(db_session)
    assert catalog_list['total'] >= 10

    # Inspect first product
    first_id = catalog_list['items'][0]['id']
    detail = get_catalog_product(db_session, first_id)
    assert detail is not None
    assert 'subcategory' in detail
    assert 'styles' in detail
    assert 'occasions' in detail
    assert 'normalized_colors' in detail
    assert isinstance(detail['warnings'], list)
