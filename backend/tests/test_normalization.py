"""Tests for the fashion normalization layer."""
from __future__ import annotations

from app.services.normalization_service import (
    extract_colors_from_text,
    extract_occasions,
    extract_styles,
    format_display_price,
    normalize_availability,
    normalize_brand,
    normalize_category,
    normalize_color_list,
    normalize_color_name,
    normalize_currency,
    normalize_gender,
    normalize_materials,
    normalize_occasion_name,
    normalize_product_metadata,
    normalize_product_name,
    normalize_rating,
    normalize_seasons,
    normalize_size_list,
    normalize_style_name,
    normalize_subcategory,
    normalized_name_tokens,
)


def test_category_aliases_map_to_canonical_values():
    assert normalize_category('Footwear') == 'Sneakers'
    assert normalize_category('shoes') == 'Sneakers'
    assert normalize_category('SNEAKERS') == 'Sneakers'
    assert normalize_category('trousers') == 'Pants'
    assert normalize_category('t-shirt') == 'Tops'
    assert normalize_category('coat') == 'Outerwear'
    assert normalize_category('tee shirt') == 'Tops'
    assert normalize_category('dresses') == 'Dresses'


def test_category_unknown_value_falls_back_to_title_case():
    assert normalize_category('activewear') == 'Activewear'
    assert normalize_category('') == 'Uncategorized'
    assert normalize_category(None) == 'Uncategorized'


def test_existing_catalog_categories_are_preserved():
    for category in ['Hoodies', 'Sneakers', 'Jackets', 'Accessories', 'Pants',
                     'Bags', 'Tops', 'Dresses', 'Outerwear', 'Blazers']:
        assert normalize_category(category) == category


def test_subcategory_normalization():
    assert normalize_subcategory('graphic hoodie') == 'Graphic Hoodie'
    assert normalize_subcategory(None, name='Tailored Wool Overcoat', category='Outerwear') == 'Tailored Overcoat'
    assert normalize_subcategory(None, name='Silk Slip Dress', category='Dresses') == 'Silk Slip Dress'
    assert normalize_subcategory(None, name='Classic Chino Pants', category='Pants') == 'Chino Trousers'


def test_gender_normalization():
    assert normalize_gender('men') == 'Men'
    assert normalize_gender("women's") == 'Women'
    assert normalize_gender('neutral') == 'Unisex'
    assert normalize_gender(None, name='Silk Slip Dress') == 'Women'
    assert normalize_gender(None, name='Classic Chino Pants') == 'Unisex'


def test_color_normalization():
    assert normalize_color_name('jet black') == 'Black'
    assert normalize_color_name('pure white') == 'White'
    assert normalize_color_name('navy blue') == 'Navy'
    assert normalize_color_name('heather grey') == 'Gray'
    assert normalize_color_list([' Black ', 'jet black', '', 'Gray']) == ['Black', 'Gray']
    assert 'Black' in extract_colors_from_text('A sleek jet black party dress')


def test_style_normalization():
    assert normalize_style_name('formalwear') == 'Formal'
    assert normalize_style_name('streetwear') == 'Streetwear'
    assert normalize_style_name('office wear') == 'Formal'
    styles = extract_styles([], name='Double Breasted Tailored Blazer', category='Blazers')
    assert 'Formal' in styles


def test_occasion_normalization():
    assert normalize_occasion_name('office') == 'Office'
    assert normalize_occasion_name('dinner date') == 'Date Night'
    assert normalize_occasion_name('cocktail party') == 'Party'
    occasions = extract_occasions([], name='Silk Evening Slip Dress', description='Perfect for date night and gala party')
    assert 'Date Night' in occasions
    assert 'Party' in occasions


def test_material_and_season_normalization():
    materials = normalize_materials([], name='100% Organic Cotton French Terry Hoodie')
    assert 'Cotton' in materials
    seasons = normalize_seasons([], name='Heavyweight Thermal Wool Winter Coat', styles=['Winter'])
    assert 'Winter' in seasons


def test_comprehensive_product_metadata_normalization():
    raw = {
        'name': '  Oversized Graphic Hoodie  ',
        'brand': '  H&M  ',
        'category': 'hoodies',
        'description': 'A relaxed organic cotton sweatshirt in jet black for casual streetwear.',
        'colors': ['jet black', 'Gray'],
        'sizes': ['m', 'l'],
    }
    normalized = normalize_product_metadata(raw)
    assert normalized['name'] == 'Oversized Graphic Hoodie'
    assert normalized['brand'] == 'H&M'
    assert normalized['category'] == 'Hoodies'
    assert normalized['subcategory'] == 'Graphic Hoodie'
    assert normalized['normalized_colors'] == ['Black', 'Gray']
    assert 'Streetwear' in normalized['styles']
    assert 'Cotton' in normalized['materials']
    assert normalized['sizes'] == ['M', 'L']


def test_currency_and_pricing():
    assert normalize_currency('₹') == 'INR'
    assert normalize_currency('$') == 'USD'
    assert format_display_price(1299.0, 'INR') == '₹1,299'
    assert format_display_price(79.99, '$') == '$79.99'


def test_availability_and_rating():
    assert normalize_availability('in_stock') == 'In Stock'
    assert normalize_availability('sold out') == 'Out of Stock'
    assert normalize_rating(4.567) == 4.6
    assert normalize_rating(99) == 5.0