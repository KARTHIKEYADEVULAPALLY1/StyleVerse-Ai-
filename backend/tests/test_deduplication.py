"""Tests for product deduplication / matching."""
from __future__ import annotations

import pytest

from app.models.product import Product
from app.schemas.external_product import ExternalProduct
from app.services.normalization_service import normalize_product_name
from app.services.product_matcher import (
    HeuristicProductMatcher,
    find_matching_product,
    get_product_matcher,
    set_product_matcher,
)


def make_external(**overrides) -> ExternalProduct:
    base = {
        'merchant': 'tentree',
        'external_product_id': 'X-1',
        'name': 'Nimbus Rain Jacket',
        'brand': 'tentree',
        'category': 'Jackets',
        'price': 4499.0,
    }
    base.update(overrides)
    return ExternalProduct.model_validate(base)


def add_product(db, name, brand, category) -> Product:
    product = Product(
        name=name,
        brand=brand,
        category=category,
        price='₹1,000',
        rating=4.0,
        image='https://example.com/img.jpg',
        store=brand,
        colors=[],
        sizes=[],
    )
    db.add(product)
    db.flush()
    return product


def test_exact_match_same_brand_name_category(seeded_db):
    """The incoming item must map onto the equivalent seeded catalog product."""
    match = find_matching_product(seeded_db, make_external())
    assert match is not None
    assert normalize_product_name(match.name) == 'Nimbus Rain Jacket'
    assert match.brand == 'tentree'
    assert match.category == 'Jackets'


def test_exact_match_prefers_given_candidate(seeded_db):
    existing = add_product(seeded_db, 'Nimbus Rain Jacket', 'tentree', 'Jackets')
    match = find_matching_product(seeded_db, make_external(), candidates=[existing])
    assert match is not None
    assert match.id == existing.id


def test_different_brand_does_not_match(seeded_db):
    adidas = add_product(seeded_db, 'Classic White Sneakers', 'Adidas', 'Sneakers')
    assert find_matching_product(seeded_db, make_external(), candidates=[adidas]) is None


def test_different_category_does_not_match(seeded_db):
    hoodie = add_product(seeded_db, 'Classic White Sneakers', 'Nike', 'Hoodies')
    assert find_matching_product(seeded_db, make_external(), candidates=[hoodie]) is None


def test_fuzzy_match_within_threshold(seeded_db):
    existing = add_product(seeded_db, 'Aerolight Running Shoes', 'Puma', 'Sneakers')
    external = make_external(
        external_product_id='X-2',
        name='Aerolight Running Shoes Pro',
        brand='Puma',
        category='shoes',
    )
    match = find_matching_product(seeded_db, external, candidates=[existing])
    assert match is not None
    assert match.id == existing.id


def test_low_similarity_does_not_match(seeded_db):
    coat = add_product(seeded_db, 'Winter Wool Coat', 'Uniqlo', 'Outerwear')
    external = make_external(
        external_product_id='X-3',
        name='Summer Beach Sandals',
        brand='Uniqlo',
        category='Footwear',
    )
    assert find_matching_product(seeded_db, external, candidates=[coat]) is None


def test_no_candidates_means_no_match(seeded_db):
    """With an explicitly empty candidate set nothing can match."""
    assert find_matching_product(seeded_db, make_external(), candidates=[]) is None


def test_matching_strategy_is_replaceable(seeded_db):
    sentinel = add_product(seeded_db, 'Sentinel Product', 'SentinelBrand', 'Tops')

    class StubMatcher:
        def find_matching_product(self, db, external, candidates=None):
            return sentinel

    original = get_product_matcher()
    try:
        set_product_matcher(StubMatcher())
        external = make_external(name='Something Completely Different')
        assert find_matching_product(seeded_db, external).id == sentinel.id
    finally:
        set_product_matcher(original)

    # Default heuristic matcher restored.
    assert isinstance(get_product_matcher(), HeuristicProductMatcher)


@pytest.mark.parametrize('threshold,expected', [
    (0.9, False),   # strict threshold rejects the fuzzy pair
    (0.5, True),    # lenient threshold accepts it
])
def test_fuzzy_threshold_is_configurable(seeded_db, threshold, expected):
    existing = add_product(seeded_db, 'Aerolight Running Shoes', 'Puma', 'Sneakers')
    matcher = HeuristicProductMatcher(fuzzy_threshold=threshold)
    external = make_external(
        name='Aerolight Running Shoes Pro',
        brand='Puma',
        category='shoes',
    )
    match = matcher.find_matching_product(seeded_db, external, candidates=[existing])
    assert (match is not None) is expected