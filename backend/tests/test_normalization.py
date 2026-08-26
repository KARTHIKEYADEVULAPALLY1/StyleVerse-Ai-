"""Tests for the normalization layer."""
from __future__ import annotations

from app.services.normalization_service import (
    format_display_price,
    normalize_availability,
    normalize_brand,
    normalize_category,
    normalize_color_list,
    normalize_currency,
    normalize_product_name,
    normalize_rating,
    normalize_size_list,
    normalized_name_tokens,
)


def test_category_aliases_map_to_canonical_values():
    assert normalize_category('Footwear') == 'Sneakers'
    assert normalize_category('shoes') == 'Sneakers'
    assert normalize_category('SNEAKERS') == 'Sneakers'
    assert normalize_category('trousers') == 'Pants'
    assert normalize_category('t-shirt') == 'Tops'
    assert normalize_category('coat') == 'Outerwear'


def test_category_unknown_value_falls_back_to_title_case():
    assert normalize_category('activewear') == 'Activewear'
    assert normalize_category('') == 'Uncategorized'
    assert normalize_category(None) == 'Uncategorized'


def test_existing_catalog_categories_are_preserved():
    # Categories already used by the seeded catalog must map to themselves.
    for category in ['Hoodies', 'Sneakers', 'Jackets', 'Accessories', 'Pants',
                     'Bags', 'Tops', 'Dresses', 'Outerwear', 'Blazers']:
        assert normalize_category(category) == category


def test_name_normalization_collapses_whitespace():
    assert normalize_product_name('  Classic   White   Sneakers  ') == 'Classic White Sneakers'
    assert normalize_product_name('- Trim Me -') == 'Trim Me'
    assert normalize_product_name(None) == ''


def test_normalized_name_tokens():
    assert normalized_name_tokens('Classic White Sneakers!') == ['classic', 'white', 'sneakers']


def test_brand_normalization():
    assert normalize_brand('  H&M  ') == 'H&M'
    assert normalize_brand('Levis   Originals') == 'Levis Originals'


def test_currency_normalization():
    assert normalize_currency('₹') == 'INR'
    assert normalize_currency('Rs') == 'INR'
    assert normalize_currency('inr') == 'INR'
    assert normalize_currency('$') == 'USD'
    assert normalize_currency('usd') == 'USD'
    assert normalize_currency('£') == 'GBP'
    assert normalize_currency('') == 'INR'
    assert normalize_currency(None) == 'INR'


def test_availability_normalization():
    assert normalize_availability('in_stock') == 'In Stock'
    assert normalize_availability('in stock') == 'In Stock'
    assert normalize_availability('Available') == 'In Stock'
    assert normalize_availability('out_of_stock') == 'Out of Stock'
    assert normalize_availability('sold out') == 'Out of Stock'
    assert normalize_availability('') == 'In Stock'
    assert normalize_availability(None) == 'In Stock'


def test_rating_clamped_to_valid_range():
    assert normalize_rating(4.567) == 4.6
    assert normalize_rating(99) == 5.0
    assert normalize_rating(-3) == 0.0
    assert normalize_rating(None) == 0.0
    assert normalize_rating('not-a-number') == 0.0


def test_color_and_size_lists_deduplicated_and_trimmed():
    assert normalize_color_list([' Black ', 'black', '', 'Gray']) == ['Black', 'black', 'Gray']
    assert normalize_size_list(['M', ' M ', 'L']) == ['M', 'L']
    assert normalize_size_list(None) == []


def test_format_display_price():
    assert format_display_price(1299.0, 'INR') == '₹1,299'
    assert format_display_price(79.99, '$') == '$79.99'
    assert format_display_price(50.0, 'USD') == '$50.00'