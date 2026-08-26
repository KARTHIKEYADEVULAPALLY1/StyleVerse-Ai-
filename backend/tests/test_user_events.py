"""Tests for the user behavior analytics layer.

Covers: valid events, invalid event types, invalid product references,
authenticated vs anonymous attribution, table indexes, recommendation
scoring weights, and the admin analytics aggregation.
"""
from __future__ import annotations

import pytest
from sqlalchemy import inspect, text

from app.models.product import Product
from app.models.user_event import UserEvent
from app.services.event_service import (
    EVENT_SCORES,
    EVENT_TYPES,
    event_analytics_summary,
    get_user_event_scores,
    record_user_event,
)
from app.services.recommendation_service import score_product


def _first_product_id(db) -> int:
    return db.query(Product.id).order_by(Product.id.asc()).first()[0]


# ---------------------------------------------------------------------------
# POST /api/events
# ---------------------------------------------------------------------------

def test_valid_event_is_recorded(client, seeded_db):
    product_id = _first_product_id(seeded_db)

    response = client.post(
        '/api/events',
        json={'event_type': 'product_viewed', 'product_id': product_id},
    )

    assert response.status_code == 201
    body = response.json()
    assert body['event_type'] == 'product_viewed'

    event = seeded_db.query(UserEvent).filter(UserEvent.id == body['id']).one()
    assert event.event_type == 'product_viewed'
    assert event.product_id == product_id
    assert event.user_id is None  # anonymous


def test_invalid_event_type_is_rejected(client, seeded_db):
    response = client.post('/api/events', json={'event_type': 'page_hovered'})
    assert response.status_code == 422
    assert seeded_db.query(UserEvent).count() == 0


def test_invalid_product_reference_is_rejected(client, seeded_db):
    response = client.post(
        '/api/events',
        json={'event_type': 'product_viewed', 'product_id': 99999999},
    )
    assert response.status_code == 422
    detail = response.json()['detail']
    assert 'not found' in detail.lower()
    assert seeded_db.query(UserEvent).count() == 0


def test_missing_required_product_is_rejected(client, seeded_db):
    response = client.post('/api/events', json={'event_type': 'cart_added'})
    assert response.status_code == 422


def test_authenticated_event_associates_user(client, seeded_db):
    signup = client.post(
        '/api/auth/signup',
        json={
            'name': 'Analytics Tester',
            'email': 'events-tester@example.com',
            'password': 'SuperSecret123!',
        },
    )
    assert signup.status_code == 201
    token = signup.json()['access_token']

    product_id = _first_product_id(seeded_db)
    response = client.post(
        '/api/events',
        json={
            'event_type': 'wishlist_added',
            'product_id': product_id,
            'metadata': {'source': 'pdp'},
        },
        headers={'Authorization': f'Bearer {token}'},
    )

    assert response.status_code == 201
    event = seeded_db.query(UserEvent).order_by(UserEvent.id.desc()).first()
    assert event.user_id is not None
    assert event.event_metadata == {'source': 'pdp'}


def test_anonymous_event_uses_non_identifying_session(client, seeded_db):
    product_id = _first_product_id(seeded_db)
    response = client.post(
        '/api/events',
        json={
            'event_type': 'ai_stylist_used',
            'session_id': 'a1b2c3d4e5f6',
            'metadata': {'occasion': 'date_night', 'style': 'minimalist'},
        },
    )

    assert response.status_code == 201
    event = seeded_db.query(UserEvent).order_by(UserEvent.id.desc()).first()
    assert event.user_id is None
    assert event.session_id == 'a1b2c3d4e5f6'
    assert event.event_metadata == {'occasion': 'date_night', 'style': 'minimalist'}


def test_sensitive_metadata_never_persists(client, seeded_db):
    product_id = _first_product_id(seeded_db)
    response = client.post(
        '/api/events',
        json={
            'event_type': 'virtual_try_on_used',
            'product_id': product_id,
            'metadata': {
                'password': 'hunter2',
                'credit_card': '4111111111111111',
                'user_photo': 'base64blob...',
                'session_token': 'abc',
            },
        },
    )

    assert response.status_code == 201
    event = seeded_db.query(UserEvent).order_by(UserEvent.id.desc()).first()
    assert not event.event_metadata  # everything sensitive was scrubbed


def test_events_endpoint_rejects_malformed_payloads(client, seeded_db):
    for payload in (
        {},
        {'event_type': 'product_viewed'},
        {'event_type': 123, 'product_id': 1},
        {'event_type': 'product_searched', 'product_id': 'not-an-int'},
    ):
        response = client.post('/api/events', json=payload)
        assert response.status_code == 422, payload


# ---------------------------------------------------------------------------
# Schema / indexes / vocabulary
# ---------------------------------------------------------------------------

def test_user_event_indexes_exist(engine):
    inspector = inspect(engine)
    indexes = inspector.get_indexes('user_events')
    indexed_columns = set()
    for index in indexes:
        indexed_columns.update(index['column_names'])

    for required in ('user_id', 'event_type', 'product_id', 'created_at'):
        assert required in indexed_columns, (
            f'Missing index on user_events.{required}; found: {indexed_columns}'
        )


def test_event_type_vocabulary_is_controlled():
    assert EVENT_TYPES == (
        'product_viewed',
        'product_searched',
        'wishlist_added',
        'wishlist_removed',
        'cart_added',
        'cart_removed',
        'order_created',
        'merchant_clicked',
        'ai_stylist_used',
        'virtual_try_on_used',
    )
    assert set(EVENT_SCORES) <= set(EVENT_TYPES)


# ---------------------------------------------------------------------------
# Recommendation scoring
# ---------------------------------------------------------------------------

def test_recommendation_scoring_weights():
    assert EVENT_SCORES['product_viewed'] == 1
    assert EVENT_SCORES['wishlist_added'] == 4
    assert EVENT_SCORES['cart_added'] == 5
    assert EVENT_SCORES['order_created'] == 8
    assert EVENT_SCORES['merchant_clicked'] == 3


def _make_user(db, email: str) -> int:
    """Insert a throwaway user row (user_events.user_id is a real FK)."""
    from app.models.user import User

    user = User(name='Event Tester', email=email, hashed_password='not-a-real-credential')
    db.add(user)
    db.commit()
    db.refresh(user)
    return user.id


def test_get_user_event_scores_accumulates_weights(db_session):
    user_a = _make_user(db_session, 'score-user-a@example.com')
    user_b = _make_user(db_session, 'score-user-b@example.com')
    product_id = _first_product_id(db_session)
    record_user_event(db_session, event_type='product_viewed', user_id=user_a, product_id=product_id)
    record_user_event(db_session, event_type='wishlist_added', user_id=user_a, product_id=product_id)
    # Another user's events must not leak into user A's profile.
    record_user_event(db_session, event_type='product_viewed', user_id=user_b, product_id=product_id)

    scores = get_user_event_scores(db_session, user_a)
    assert scores[int(product_id)] == 1 + 4  # view + wishlist

    scores_other = get_user_event_scores(db_session, user_b)
    assert scores_other[int(product_id)] == 1


class _FakeProduct:
    """Minimal stand-in satisfying score_product's attribute access."""

    def __init__(self, category, brand, name='', description=''):
        self.category = category
        self.brand = brand
        self.name = name
        self.description = description
        self.colors = []
        self.sizes = []
        self.price = '\u20b92,000'


PREFERRED = ({'Dresses'}, {'Aurelia'}, {'formal'}, 2000.0)


def test_score_product_event_bonus_influences_ranking():
    base = _FakeProduct('Dresses', 'Aurelia')
    viewed_only = score_product(base, *PREFERRED, event_score=EVENT_SCORES['product_viewed'])
    wishlisted = score_product(base, *PREFERRED, event_score=EVENT_SCORES['wishlist_added'])
    carted = score_product(base, *PREFERRED, event_score=EVENT_SCORES['cart_added'])
    purchased = score_product(base, *PREFERRED, event_score=EVENT_SCORES['order_created'])

    affinity_only = score_product(base, *PREFERRED)
    assert viewed_only > affinity_only
    assert wishlisted > viewed_only
    assert carted > wishlisted
    assert purchased > carted


def test_score_product_event_contribution_is_bounded():
    base = _FakeProduct('Dresses', 'Aurelia')
    capped = score_product(base, *PREFERRED, event_score=1000)
    assert capped - score_product(base, *PREFERRED) <= 8.0 + 1e-9


# ---------------------------------------------------------------------------
# Admin analytics aggregation
# ---------------------------------------------------------------------------

def test_event_analytics_summary_aggregates_real_rows(db_session):
    rows = db_session.execute(text('SELECT id FROM products ORDER BY id LIMIT 3')).fetchall()
    product_ids = [row[0] for row in rows]
    assert len(product_ids) >= 2

    record_user_event(db_session, event_type='product_viewed', session_id='s1', product_id=product_ids[0])
    record_user_event(db_session, event_type='product_viewed', session_id='s2', product_id=product_ids[0])
    record_user_event(db_session, event_type='product_searched', session_id='s1', event_metadata={'query': 'Formal'})
    record_user_event(db_session, event_type='wishlist_added', session_id='s1', product_id=product_ids[0])
    record_user_event(db_session, event_type='wishlist_removed', session_id='s1', product_id=product_ids[0])
    record_user_event(db_session, event_type='cart_added', session_id='s1', product_id=product_ids[1])
    record_user_event(db_session, event_type='merchant_clicked', session_id='s1', product_id=product_ids[1])
    record_user_event(db_session, event_type='ai_stylist_used', session_id='s1')
    record_user_event(db_session, event_type='virtual_try_on_used', session_id='s1')

    summary = event_analytics_summary(db_session, days=30)

    assert summary['total_product_views'] == 2
    assert summary['total_searches'] == 1
    assert summary['wishlist_actions'] == 2
    assert summary['cart_actions'] == 1
    assert summary['merchant_clicks'] == 1
    assert summary['ai_stylist_sessions'] == 1
    assert summary['try_on_sessions'] == 1
    assert summary['total_events'] >= 9

    top_viewed = summary['top_viewed_products']
    assert top_viewed and top_viewed[0]['product_id'] == product_ids[0]
    assert top_viewed[0]['count'] == 2

    top_wishlisted = summary['top_wishlisted_products']
    assert top_wishlisted and top_wishlisted[0]['product_id'] == product_ids[0]

    top_carted = summary['top_carted_products']
    assert top_carted and top_carted[0]['product_id'] == product_ids[1]

    assert summary['top_search_terms'][0] == {'term': 'formal', 'count': 1}
    assert any(row['events'] > 0 for row in summary['events_by_date'])


def test_recommendations_still_work_for_user_without_events(seeded_db):
    """Regression guard: the existing engine is untouched for eventless users."""
    from app.services.recommendation_service import get_recommendations_for_user

    products = get_recommendations_for_user(seeded_db, user_id=987654)
    assert isinstance(products, list)  # popular fallback path, no crash


def test_recommendations_use_real_activity(seeded_db):
    """Events for a cold-start user must produce a personalized result set."""
    from app.services.recommendation_service import get_recommendations_for_user

    # Pick a category that has at least two products so we can assert that a
    # sibling product shows up after viewing one of them.
    row = seeded_db.execute(
        text(
            'SELECT category FROM products '
            'GROUP BY category HAVING COUNT(*) >= 2 ORDER BY category LIMIT 1'
        )
    ).fetchone()
    if row is None:
        pytest.skip('No category with two or more products to assert on.')
    category = row[0]

    candidates = seeded_db.query(Product.id).filter(Product.category == category).all()
    target_id = candidates[0][0]
    same_category_ids = [c[0] for c in candidates[1:]]

    # A "cold" user with zero wishlist/orders but real viewing activity.
    cold_user_id = _make_user(seeded_db, 'cold-start-activity@example.com')
    for _ in range(3):
        record_user_event(
            seeded_db,
            event_type='product_viewed',
            user_id=cold_user_id,
            product_id=target_id,
        )

    recommendations = get_recommendations_for_user(seeded_db, user_id=cold_user_id)
    recommended_ids = [p.id for p in recommendations]
    assert recommended_ids, 'Expected personalized recommendations from activity.'
    assert any(pid in recommended_ids for pid in same_category_ids), (
        'Recommendations should reflect the categories the user actually viewed.'
    )

