"""Normalization helpers for the multi-store ingestion pipeline & catalog enrichment.

Converts raw values coming from merchant connectors and product inputs into the
canonical forms used by StyleVerse's normalized ``Product`` / ``ProductOffer`` models.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Set

# ---------------------------------------------------------------------------
# Category normalization
# ---------------------------------------------------------------------------

CATEGORY_ALIASES = {
    'sneakers': 'Sneakers',
    'sneaker': 'Sneakers',
    'shoes': 'Sneakers',
    'shoe': 'Sneakers',
    'footwear': 'Sneakers',
    'trainers': 'Sneakers',
    'hoodies': 'Hoodies',
    'hoodie': 'Hoodies',
    'sweatshirt': 'Hoodies',
    'sweatshirts': 'Hoodies',
    'jackets': 'Jackets',
    'jacket': 'Jackets',
    'outerwear': 'Outerwear',
    'coat': 'Outerwear',
    'coats': 'Outerwear',
    'overcoat': 'Outerwear',
    'tops': 'Tops',
    'top': 'Tops',
    't-shirt': 'Tops',
    'tshirt': 'Tops',
    'tee': 'Tops',
    'tee shirt': 'Tops',
    'shirt': 'Tops',
    'shirts': 'Tops',
    'dresses': 'Dresses',
    'dress': 'Dresses',
    'pants': 'Pants',
    'trousers': 'Pants',
    'trouser': 'Pants',
    'chinos': 'Pants',
    'jeans': 'Pants',
    'blazers': 'Blazers',
    'blazer': 'Blazers',
    'bags': 'Bags',
    'bag': 'Bags',
    'handbag': 'Bags',
    'handbags': 'Bags',
    'backpack': 'Bags',
    'crossbody': 'Bags',
    'tote': 'Bags',
    'accessories': 'Accessories',
    'accessory': 'Accessories',
    'watch': 'Accessories',
    'watches': 'Accessories',
    'sunglasses': 'Accessories',
    'cap': 'Accessories',

    'caps': 'Accessories',
    'hat': 'Accessories',
    'hats': 'Accessories',
}


def normalize_category(raw_category: str | None) -> str:
    """Map a category string onto a canonical StyleVerse category."""
    value = (raw_category or '').strip().lower()
    if not value:
        return 'Uncategorized'
    if value in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[value]
    return value.title()


# ---------------------------------------------------------------------------
# Subcategory normalization
# ---------------------------------------------------------------------------

SUBCATEGORY_RULES = [
    ('Graphic Hoodie', {'graphic hoodie', 'graphic sweatshirt', 'printed hoodie'}),
    ('Oversized Hoodie', {'oversized hoodie', 'relaxed hoodie', 'boxy hoodie'}),
    ('Zip Hoodie', {'zip hoodie', 'zip-up hoodie', 'full zip'}),
    ('Hoodie', {'hoodie', 'sweatshirt'}),
    ('Running Sneakers', {'running sneaker', 'running shoes', 'runner'}),
    ('Retro Sneakers', {'retro sneaker', 'classic sneaker', 'vintage sneaker'}),
    ('Low-Top Sneakers', {'low-top', 'low top sneaker'}),
    ('Sneakers', {'sneaker', 'trainer', 'footwear', 'shoe'}),
    ('Structured Blazer', {'structured blazer', 'tailored blazer', 'suit blazer', 'double-breasted blazer'}),
    ('Casual Blazer', {'casual blazer', 'unstructured blazer', 'linen blazer'}),
    ('Blazer', {'blazer', 'suit jacket'}),
    ('Tailored Overcoat', {'tailored overcoat', 'wool overcoat', 'trench coat', 'long coat'}),
    ('Bomber Jacket', {'bomber jacket', 'bomber'}),
    ('Denim Jacket', {'denim jacket', 'jean jacket'}),
    ('Outerwear', {'jacket', 'coat', 'outerwear', 'parka'}),
    ('Silk Slip Dress', {'silk slip dress', 'slip dress', 'satin dress', 'silk dress'}),
    ('Maxi Dress', {'maxi dress', 'evening dress', 'cocktail dress'}),
    ('Dresses', {'dress', 'gown'}),
    ('Chino Trousers', {'chino', 'chinos', 'tapered trouser', 'tapered pants', 'slack'}),
    ('Denim Jeans', {'denim', 'jeans', 'jean'}),
    ('Pants', {'pants', 'trouser', 'trousers', 'bottoms'}),
    ('Leather Crossbody Bag', {'crossbody bag', 'crossbody', 'shoulder bag', 'leather bag'}),
    ('Tote Bag', {'tote bag', 'tote', 'canvas tote'}),
    ('Bags', {'bag', 'handbag', 'backpack'}),
    ('Analog Chronograph', {'chronograph', 'analog watch', 'wrist watch', 'wristwatch', 'watch'}),
    ('Accessories', {'sunglasses', 'cap', 'hat', 'belt', 'accessory', 'accessories'}),
    ('Crewneck Tee', {'crewneck', 't-shirt', 'tee', 'tshirt'}),
    ('Tops', {'top', 'shirt', 'blouse'}),
]


def normalize_subcategory(
    raw_subcategory: str | None,
    name: str | None = None,
    category: str | None = None,
    description: str | None = None,
) -> Optional[str]:
    """Derive or normalize subcategory from explicit input, title, and description."""
    if raw_subcategory and raw_subcategory.strip():
        cleaned = raw_subcategory.strip().lower()
        for label, triggers in SUBCATEGORY_RULES:
            if cleaned == label.lower() or cleaned in triggers:
                return label
        return raw_subcategory.strip().title()

    combined_text = f"{name or ''} {category or ''} {description or ''}".lower()
    for label, triggers in SUBCATEGORY_RULES:
        for trigger in triggers:
            if re.search(r'\b' + re.escape(trigger) + r'\b', combined_text):
                return label

    cat_norm = normalize_category(category)
    return cat_norm if cat_norm != 'Uncategorized' else None


# ---------------------------------------------------------------------------
# Gender / Target normalization
# ---------------------------------------------------------------------------

GENDER_MAP = {
    'men': 'Men',
    'mens': 'Men',
    "men's": 'Men',
    'male': 'Men',
    'women': 'Women',
    'womens': 'Women',
    "women's": 'Women',
    'female': 'Women',
    'unisex': 'Unisex',
    'neutral': 'Unisex',
    'all': 'Unisex',
    'kids': 'Kids',
    'boys': 'Kids',
    'girls': 'Kids',
}


def normalize_gender(raw_gender: str | None, name: str | None = None, description: str | None = None) -> str:
    """Normalize target gender to 'Men', 'Women', 'Unisex', or 'Kids'."""
    if raw_gender:
        key = raw_gender.strip().lower()
        if key in GENDER_MAP:
            return GENDER_MAP[key]

    combined = f"{name or ''} {description or ''}".lower()
    if re.search(r"\b(women's|womens|women|ladies|dress|blouse|skirt)\b", combined):
        return 'Women'
    if re.search(r"\b(men's|mens|men|gentlemen)\b", combined):
        return 'Men'
    return 'Unisex'


# ---------------------------------------------------------------------------
# Color normalization
# ---------------------------------------------------------------------------

CANONICAL_COLORS = {
    'Black': {'black', 'jet black', 'matte black', 'noir', 'ebony', 'onyx', 'midnight black'},
    'White': {'white', 'pure white', 'chalk white', 'snow', 'bright white'},
    'Off White': {'off white', 'off-white', 'ivory', 'chalk', 'cream white'},
    'Navy': {'navy', 'navy blue', 'dark blue', 'midnight blue', 'deep navy'},
    'Gray': {'gray', 'grey', 'light gray', 'dark gray', 'heather gray', 'ash', 'heather grey', 'slate'},
    'Charcoal': {'charcoal', 'anthracite', 'gunmetal', 'dark charcoal'},
    'Cream': {'cream', 'beige', 'ecru', 'vanilla', 'milk', 'eggshell'},
    'Olive': {'olive', 'olive green', 'army green', 'sage', 'moss', 'khaki green', 'military green'},
    'Stone': {'stone', 'sand', 'khaki', 'light tan', 'pebble'},
    'Tan': {'tan', 'camel', 'taupe', 'buff', 'wheat'},
    'Camel': {'camel', 'caramel', 'toffee', 'cognac'},
    'Silver': {'silver', 'metallic silver', 'chrome', 'platinum', 'steel'},
    'Gold': {'gold', 'yellow gold', 'champagne', 'rose gold', 'brass', 'metallic gold'},
    'Red': {'red', 'ruby', 'crimson', 'scarlet', 'cherry', 'bright red'},
    'Wine': {'wine', 'burgundy', 'maroon', 'bordeaux', 'oxblood', 'merlot'},
    'Espresso': {'espresso', 'chocolate', 'dark brown', 'brown', 'mocha'},
}

# Reverse map for single lookup
COLOR_ALIAS_MAP: Dict[str, str] = {}
for canonical, aliases in CANONICAL_COLORS.items():
    COLOR_ALIAS_MAP[canonical.lower()] = canonical
    for alias in aliases:
        COLOR_ALIAS_MAP[alias.lower()] = canonical


def normalize_color_name(raw_color: str | None) -> Optional[str]:
    """Map a single color string to its canonical StyleVerse representation."""
    if not raw_color:
        return None
    cleaned = raw_color.strip().lower()
    if cleaned in COLOR_ALIAS_MAP:
        return COLOR_ALIAS_MAP[cleaned]
    # Check for substring match (e.g., "Deep Navy" -> "Navy")
    for canonical, aliases in CANONICAL_COLORS.items():
        if canonical.lower() in cleaned:
            return canonical
        for alias in aliases:
            if alias in cleaned:
                return canonical
    return raw_color.strip().title()


def normalize_color_list(colors: List[str] | None) -> List[str]:
    """Trim, canonicalize, and de-duplicate color names while preserving order."""
    result: List[str] = []
    for color in colors or []:
        norm = normalize_color_name(str(color))
        if norm and norm not in result:
            result.append(norm)
    return result


def extract_colors_from_text(text: str | None) -> List[str]:
    """Extract known canonical colors appearing in name/description."""
    if not text:
        return []
    text_lower = text.lower()
    extracted: List[str] = []
    for canonical, aliases in CANONICAL_COLORS.items():
        for word in [canonical.lower(), *aliases]:
            if re.search(r'\b' + re.escape(word) + r'\b', text_lower):
                if canonical not in extracted:
                    extracted.append(canonical)
                break
    return extracted


# ---------------------------------------------------------------------------
# Style normalization
# ---------------------------------------------------------------------------

STYLE_TAXONOMY = {
    'Formal': {'formal', 'formalwear', 'office wear', 'business', 'business formal', 'executive', 'tailored', 'black tie', 'suit', 'blazer', 'smart', 'office'},
    'Casual': {'casual', 'everyday', 'daily', 'relaxed', 'laid-back', 'weekend', 'brunch', 'comfy', 'tee', 'hoodie'},
    'Minimalist': {'minimalist', 'minimal', 'clean', 'sleek', 'scandinavian', 'understated', 'simple', 'monochrome', 'capsule'},
    'Streetwear': {'streetwear', 'street', 'urban', 'hypebeast', 'oversized', 'sneakers', 'graphic', 'skate', 'drop'},
    'Vintage': {'vintage', 'retro', 'heritage', 'classic', 'timeless', '90s', '80s', 'nostalgic', 'archival'},
    'Bohemian': {'bohemian', 'boho', 'artisan', 'flowing', 'slip dress', 'linen', 'earthy', 'resort'},
    'Athleisure': {'athleisure', 'athletic', 'sport', 'sportswear', 'activewear', 'gym', 'workout', 'running', 'performance'},
    'Winter': {'winter', 'warm', 'thermal', 'heavyweight', 'puffer', 'fleece', 'wool', 'outerwear', 'overcoat', 'insulated'},
    'Summer': {'summer', 'breathable', 'lightweight', 'linen', 'resort', 'beach', 'sunny', 'vacation'},
}


def normalize_style_name(raw_style: str | None) -> Optional[str]:
    """Normalize a single style string to canonical StyleVerse style."""
    if not raw_style:
        return None
    cleaned = raw_style.strip().lower()
    for canonical, triggers in STYLE_TAXONOMY.items():
        if cleaned == canonical.lower() or cleaned in triggers:
            return canonical
    return raw_style.strip().title()


def extract_styles(
    explicit_styles: Optional[List[str]] = None,
    name: str | None = None,
    category: str | None = None,
    description: str | None = None,
) -> List[str]:
    """Derive deterministic style labels from explicit input and product text."""
    styles: List[str] = []
    for st in explicit_styles or []:
        norm = normalize_style_name(st)
        if norm and norm not in styles:
            styles.append(norm)

    combined = f"{name or ''} {category or ''} {description or ''}".lower()
    for canonical, triggers in STYLE_TAXONOMY.items():
        if canonical not in styles:
            for trigger in triggers:
                if re.search(r'\b' + re.escape(trigger) + r'\b', combined):
                    styles.append(canonical)
                    break

    if not styles:
        styles.append('Casual')

    return styles


# ---------------------------------------------------------------------------
# Occasion normalization
# ---------------------------------------------------------------------------

OCCASION_TAXONOMY = {
    'Office': {'office', 'work', 'workwear', 'business', 'corporate', 'meeting', 'presentation', 'desk'},
    'Party': {'party', 'cocktail', 'cocktail party', 'celebration', 'night out', 'club', 'gala', 'evening party', 'festive'},
    'Casual Day': {'casual day', 'casual', 'weekend', 'brunch', 'day out', 'errands', 'street', 'daily'},
    'Date Night': {'date night', 'date', 'romantic', 'dinner', 'dinner date', 'evening'},
    'Wedding': {'wedding', 'ceremony', 'reception', 'black tie', 'formal occasion'},
    'Workout': {'workout', 'gym', 'running', 'training', 'fitness', 'sport', 'athletic'},
    'Travel': {'travel', 'vacation', 'holiday', 'resort', 'airport', 'road trip'},
}


def normalize_occasion_name(raw_occasion: str | None) -> Optional[str]:
    """Normalize a single occasion string."""
    if not raw_occasion:
        return None
    cleaned = raw_occasion.strip().lower()
    for canonical, triggers in OCCASION_TAXONOMY.items():
        if cleaned == canonical.lower() or cleaned in triggers:
            return canonical
    return raw_occasion.strip().title()


def extract_occasions(
    explicit_occasions: Optional[List[str]] = None,
    name: str | None = None,
    category: str | None = None,
    description: str | None = None,
    styles: Optional[List[str]] = None,
) -> List[str]:
    """Derive deterministic occasion labels from explicit input, style, and product text."""
    occasions: List[str] = []
    for occ in explicit_occasions or []:
        norm = normalize_occasion_name(occ)
        if norm and norm not in occasions:
            occasions.append(norm)

    combined = f"{name or ''} {category or ''} {description or ''}".lower()
    for canonical, triggers in OCCASION_TAXONOMY.items():
        if canonical not in occasions:
            for trigger in triggers:
                if re.search(r'\b' + re.escape(trigger) + r'\b', combined):
                    occasions.append(canonical)
                    break

    # Infer smart occasion defaults based on style if still empty
    if not occasions:
        style_set = set(styles or [])
        if 'Formal' in style_set:
            occasions.append('Office')
        elif 'Streetwear' in style_set or 'Casual' in style_set:
            occasions.append('Casual Day')
        elif 'Athleisure' in style_set:
            occasions.append('Workout')
        else:
            occasions.append('Casual Day')

    return occasions



# ---------------------------------------------------------------------------
# Material normalization
# ---------------------------------------------------------------------------

MATERIAL_TAXONOMY = {
    'Cotton': {'cotton', 'organic cotton', 'french terry', 'fleece', 'brushed cotton', 'jersey'},
    'Leather': {'leather', 'genuine leather', 'full-grain leather', 'calfskin', 'suede', 'faux leather', 'vegan leather'},
    'Silk': {'silk', 'mulberry silk', 'pure silk', 'silk satin'},
    'Wool': {'wool', 'merino wool', 'merino', 'cashmere', 'wool blend'},
    'Denim': {'denim', 'selvedge', 'raw denim', 'cotton denim'},
    'Satin': {'satin', 'duchess satin'},
    'Linen': {'linen', 'pure linen', 'flax'},
    'Polyester': {'polyester', 'nylon', 'spandex', 'elastane', 'synthetic', 'poly blend'},
    'Stainless Steel': {'stainless steel', 'steel', 'titanium', 'mineral glass', 'sapphire crystal'},
}


def normalize_materials(
    explicit_materials: Optional[List[str]] = None,
    name: str | None = None,
    description: str | None = None,
) -> List[str]:
    """Extract and normalize materials."""
    materials: List[str] = []
    for mat in explicit_materials or []:
        cleaned = str(mat).strip().lower()
        matched = False
        for canonical, triggers in MATERIAL_TAXONOMY.items():
            if cleaned == canonical.lower() or cleaned in triggers:
                if canonical not in materials:
                    materials.append(canonical)
                matched = True
                break
        if not matched and cleaned:
            val = str(mat).strip().title()
            if val not in materials:
                materials.append(val)

    combined = f"{name or ''} {description or ''}".lower()
    for canonical, triggers in MATERIAL_TAXONOMY.items():
        if canonical not in materials:
            for trigger in triggers:
                if re.search(r'\b' + re.escape(trigger) + r'\b', combined):
                    materials.append(canonical)
                    break
    return materials


# ---------------------------------------------------------------------------
# Season normalization
# ---------------------------------------------------------------------------

SEASON_TAXONOMY = {
    'All Season': {'all season', 'all-season', 'year round', 'essential', 'core', 'everyday'},
    'Winter': {'winter', 'fall/winter', 'cold weather', 'autumn/winter', 'fleece', 'wool', 'coat', 'heavyweight'},
    'Summer': {'summer', 'spring/summer', 'warm weather', 'beach', 'breathable', 'linen', 'short sleeve'},
    'Spring': {'spring', 'transitional'},
    'Fall/Autumn': {'fall', 'autumn', 'layering'},
}


def normalize_seasons(
    explicit_seasons: Optional[List[str]] = None,
    name: str | None = None,
    description: str | None = None,
    styles: Optional[List[str]] = None,
) -> List[str]:
    """Extract and normalize seasons."""
    seasons: List[str] = []
    for s in explicit_seasons or []:
        cleaned = str(s).strip().lower()
        matched = False
        for canonical, triggers in SEASON_TAXONOMY.items():
            if cleaned == canonical.lower() or cleaned in triggers:
                if canonical not in seasons:
                    seasons.append(canonical)
                matched = True
                break
        if not matched and cleaned:
            val = str(s).strip().title()
            if val not in seasons:
                seasons.append(val)

    combined = f"{name or ''} {description or ''}".lower()
    for canonical, triggers in SEASON_TAXONOMY.items():
        if canonical not in seasons:
            for trigger in triggers:
                if re.search(r'\b' + re.escape(trigger) + r'\b', combined):
                    seasons.append(canonical)
                    break

    style_set = set(styles or [])
    if 'Winter' in style_set and 'Winter' not in seasons:
        seasons.append('Winter')
    if 'Summer' in style_set and 'Summer' not in seasons:
        seasons.append('Summer')

    if not seasons:
        seasons.append('All Season')
    return seasons


# ---------------------------------------------------------------------------
# Comprehensive Product Metadata Normalizer
# ---------------------------------------------------------------------------

def normalize_product_metadata(raw_data: Dict[str, Any]) -> Dict[str, Any]:
    """Produce a complete, normalized metadata dictionary for a product record."""
    name = normalize_product_name(raw_data.get('name'))
    brand = normalize_brand(raw_data.get('brand'))
    category = normalize_category(raw_data.get('category'))
    description = (raw_data.get('description') or '').strip()

    subcategory = normalize_subcategory(
        raw_data.get('subcategory'),
        name=name,
        category=category,
        description=description,
    )

    gender = normalize_gender(
        raw_data.get('target_gender'),
        name=name,
        description=description,
    )

    # Colors: combine explicit colors with extracted text colors
    raw_colors = raw_data.get('colors') or []
    norm_colors = normalize_color_list(raw_colors)
    if not norm_colors:
        norm_colors = extract_colors_from_text(f"{name} {description}")

    # Styles
    raw_styles = raw_data.get('styles') or []
    styles = extract_styles(
        explicit_styles=raw_styles,
        name=name,
        category=category,
        description=description,
    )

    # Occasions
    raw_occasions = raw_data.get('occasions') or []
    occasions = extract_occasions(
        explicit_occasions=raw_occasions,
        name=name,
        category=category,
        description=description,
        styles=styles,
    )

    # Materials
    raw_materials = raw_data.get('materials') or []
    materials = normalize_materials(
        explicit_materials=raw_materials,
        name=name,
        description=description,
    )

    # Seasons
    raw_seasons = raw_data.get('seasons') or []
    seasons = normalize_seasons(
        explicit_seasons=raw_seasons,
        name=name,
        description=description,
        styles=styles,
    )

    sizes = normalize_size_list(raw_data.get('sizes'))

    return {
        'name': name,
        'brand': brand,
        'category': category,
        'subcategory': subcategory,
        'target_gender': gender,
        'description': description,
        'colors': norm_colors,
        'normalized_colors': norm_colors,
        'styles': styles,
        'occasions': occasions,
        'materials': materials,
        'seasons': seasons,
        'sizes': sizes,
    }


# ---------------------------------------------------------------------------
# Name normalization
# ---------------------------------------------------------------------------

def normalize_product_name(raw_name: str | None) -> str:
    """Clean a product name: collapse whitespace, drop noise, keep readable case."""
    value = (raw_name or '').strip()
    value = re.sub(r'\s+', ' ', value)
    return value.strip(' -–—|')


def normalized_name_tokens(name: str | None) -> List[str]:
    """Lowercase alphanumeric tokens of a product name, used for matching."""
    return [token for token in re.split(r'[^a-z0-9]+', (name or '').lower()) if token]


def normalize_brand(raw_brand: str | None) -> str:
    """Canonical brand string: trimmed, single-spaced, comparable casing."""
    value = re.sub(r'\s+', ' ', (raw_brand or '').strip())
    return value


# ---------------------------------------------------------------------------
# Currency normalization
# ---------------------------------------------------------------------------

CURRENCY_SYMBOL_MAP = {
    '₹': 'INR',
    'rs': 'INR',
    'rs.': 'INR',
    'inr': 'INR',
    '$': 'USD',
    'us$': 'USD',
    'usd': 'USD',
    '€': 'EUR',
    'eur': 'EUR',
    '£': 'GBP',
    'gbp': 'GBP',
}

CURRENCY_SYMBOLS = {'INR': '₹', 'USD': '$', 'EUR': '€', 'GBP': '£'}


def normalize_currency(raw_currency: str | None) -> str:
    """Normalize currency symbols/codes to ISO codes (defaults to INR)."""
    value = (raw_currency or '').strip()
    if not value:
        return 'INR'
    return CURRENCY_SYMBOL_MAP.get(value.lower(), value.upper())


def format_display_price(amount: float, currency: str) -> str:
    """Format a numeric price as the display string used on Product rows."""
    code = normalize_currency(currency)
    symbol = CURRENCY_SYMBOLS.get(code, f'{code} ')
    if code == 'INR':
        return f'{symbol}{amount:,.0f}'
    return f'{symbol}{amount:,.2f}'


# ---------------------------------------------------------------------------
# Availability normalization
# ---------------------------------------------------------------------------

IN_STOCK_VALUES = {'in_stock', 'instock', 'in stock', 'available', 'yes', 'true', '1'}
OUT_OF_STOCK_VALUES = {
    'out_of_stock', 'outofstock', 'out of stock', 'oos', 'sold out',
    'unavailable', 'no', 'false', '0',
}


def normalize_availability(raw_availability: str | None) -> str:
    """Normalize merchant availability strings to 'In Stock' / 'Out of Stock'."""
    value = (raw_availability or '').strip().lower()
    if not value:
        return 'In Stock'
    if value in IN_STOCK_VALUES:
        return 'In Stock'
    if value in OUT_OF_STOCK_VALUES:
        return 'Out of Stock'
    return value.title() if value.startswith('in') else 'Out of Stock'


def normalize_rating(raw_rating: float | None) -> float:
    """Clamp merchant ratings into the 0..5 range used across StyleVerse."""
    try:
        value = float(raw_rating or 0.0)
    except (TypeError, ValueError):
        return 0.0
    return round(max(0.0, min(5.0, value)), 1)


def normalize_size_list(sizes: List[str] | None) -> List[str]:
    """Trim and de-duplicate size labels while preserving order."""
    result: List[str] = []
    for size in sizes or []:
        cleaned = re.sub(r'\s+', ' ', str(size).strip().upper())
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result