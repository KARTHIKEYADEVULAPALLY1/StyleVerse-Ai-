"""Tests for the My Style profile feature (GET /api/style-profile).

Covers: JWT enforcement, the clean new/onboarding state (no invented
preferences), deterministic real-data updates from wishlist / views / orders,
profile strength, price range, and determinism (same answer on repeat calls).
"""
from __future__ import annotations

from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.services.event_service import record_user_event
from app.services.style_profile_service import build_style_profile


def _first_product(db) -> Product:
    return db.query(Product).order_by(Product.id.asc()).first()


def _make_user(db, email: str) -> int:
    user = User(name='Profile Tester', email=email, hashed_password='not-a-real-credential')
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id


def _signup(client, email: str) -> str:
    response = client.post(
        '/api/auth/signup',
        json={'name': 'Profile Tester', 'email': email, 'password': 'SuperSecret123!'},
    )
    assert response.status_code == 201
    return response.json()['access_token']


# ---------------------------------------------------------------------------
# Endpoint behaviour
# ---------------------------------------------------------------------------

def test_style_profile_requires_jwt(client):
    response = client.get('/api/style-profile')
    assert response.status_code == 401


def test_new_user_gets_clean_empty_state(client):
    """A brand-new account must NOT be handed invented preferences."""
    token = _signup(client, 'style-new@example.com')

    response = client.get('/api/style-profile', headers={'Authorization': f'Bearer {token}'})
    assert response.status_code == 200
    body = response.json()

    assert body['favorite_categories'] == []
    assert body['favorite_brands'] == []
    assert body['favorite_colors'] == []
    assert body['preferred_styles'] == []
    assert body['average_price_range'] is None
    assert body['frequently_viewed_categories'] == []
    assert body['wishlist_categories'] == []
    assert body['purchase_categories'] == []
    assert body['profile_strength'] == 0


def test_profile_updates_from_real_wishlist_activity(client, seeded_db):
    product = _first_product(seeded_db)
    token = _signup(client, 'style-wishlist@example.com')

    added = client.post(
        f'/api/wishlist/{product.id}',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert added.status_code == 201

    body = client.get(
        '/api/style-profile', headers={'Authorization': f'Bearer {token}'}
    ).json()

    assert product.category in body['favorite_categories']
    assert product.brand in body['favorite_brands']
    assert product.category in body['wishlist_categories']
    assert product.colors and set(body['favorite_colors']) & set(product.colors)
    assert body['average_price_range'] is not None
    assert body['profile_strength'] > 0


def test_profile_reflects_views_for_cold_start_user(client, seeded_db):
    """No wishlist/orders - real viewing activity must still shape the profile."""
    product = _first_product(seeded_db)
    token = _signup(client, 'style-viewer-views@example.com')

    for _ in range(3):
        response = client.post(
            '/api/events',
            json={'event_type': 'product_viewed', 'product_id': product.id},
            headers={'Authorization': f'Bearer {token}'},
        )
        assert response.status_code == 201

    body = client.get(
        '/api/style-profile', headers={'Authorization': f'Bearer {token}'}
    ).json()

    assert product.category in body['favorite_categories']
    assert product.category in body['frequently_viewed_categories']
    assert body['profile_strength'] > 0


def test_purchase_categories_from_order(db_session):
    product = _first_product(db_session)
    user_id = _make_user(db_session, 'style-buyer@example.com')

    order = Order(user_id=user_id, total_amount='5,000', status='delivered')
    db_session.add(order)
    db_session.flush()
    db_session.add(
        OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name=product.name,
            quantity=1,
            selected_size='M',
            price_at_purchase=product.price,
        )
    )
    db_session.commit()

    profile = build_style_profile(db_session, user_id)
    assert product.category in profile['purchase_categories']
    assert product.category in profile['favorite_categories']
    assert profile['profile_strength'] > 0


def test_profile_strength_is_zero_for_new_user(db_session):
    user_id = _make_user(db_session, 'style-empty@example.com')
    assert build_style_profile(db_session, user_id)['profile_strength'] == 0


def test_profile_strength_is_bounded(db_session):
    product = _first_product(db_session)
    user_id = _make_user(db_session, 'style-heavy@example.com')

    for _ in range(40):
        record_user_event(
            db_session, event_type='product_viewed', user_id=user_id, product_id=product.id
        )

    strength = build_style_profile(db_session, user_id)['profile_strength']
    assert 0 <= strength <= 100


def test_favorites_come_from_real_activity(client, seeded_db):
    """Favorite categories must be a subset of categories the user actually touched."""
    p1 = _first_product(seeded_db)
    token = _signup(client, 'style-subset@example.com')
    client.post(f'/api/wishlist/{p1.id}', headers={'Authorization': f'Bearer {token}'})

    body = client.get(
        '/api/style-profile', headers={'Authorization': f'Bearer {token}'}
    ).json()

    source_categories = {p1.category}
    for category in body['favorite_categories']:
        assert category in source_categories, 'Favourites must come from real activity.'


def test_profile_is_deterministic(client, seeded_db):
    """Repeated calls must return identical output (no randomness)."""
    product = _first_product(seeded_db)
    token = _signup(client, 'style-deterministic@example.com')
    client.post(
        f'/api/wishlist/{product.id}',
        headers={'Authorization': f'Bearer {token}'},
    )

    first = client.get(
        '/api/style-profile', headers={'Authorization': f'Bearer {token}'}
    ).json()
    second = client.get(
        '/api/style-profile', headers={'Authorization': f'Bearer {token}'}
    ).json()
    assert first == second