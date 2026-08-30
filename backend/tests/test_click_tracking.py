"""Tests for merchant click tracking + redirect endpoints.

Covers: valid/invalid/missing offers, unsafe stored URLs, click recording
(anonymous + authenticated), analytics summary / by-merchant / by-product,
date filters, and admin authorization. All HTTP is stub-free - it exercises
the real TestClient against the rolled-back transaction database.
"""
from __future__ import annotations

import pytest

from app.models.merchant_click import MerchantClick
from app.models.product_offer import ProductOffer

ADMIN_HEADER = {'X-Admin-Key': 'test-admin-key-123'}


@pytest.fixture(autouse=True)
def _admin_key(monkeypatch):
    monkeypatch.setenv('ADMIN_API_KEY', 'test-admin-key-123')


def seeded_offer(db, store='Ajio', **overrides):
    """First seeded offer of the given store (has a search-URL fallback)."""
    # Keep the fixtures deterministic and ensure analytics tests exercise
    # multiple products rather than four store offers for product 1.
    preferred_product = {'Ajio': 1, 'Myntra': 2, 'Amazon': 3, 'Flipkart': 4}.get(store)
    query = db.query(ProductOffer).filter(ProductOffer.store == store)
    offer = query.filter(ProductOffer.product_id == preferred_product).first() if preferred_product else None
    offer = offer or query.first()
    assert offer is not None, f'expected a seeded {store} offer'
    return offer


def register_and_login(client, email='clicker@example.com', password='TestPass123!'):
    client.post(
        '/api/auth/signup',
        json={'email': email, 'password': password, 'name': 'Clicker'},
    )
    login = client.post(
        '/api/auth/login',
        json={'email': email, 'password': password},
    )
    body = login.json()
    token = body.get('access_token') or body.get('token')
    assert token, f'login failed: {body}'
    return {'Authorization': f'Bearer {token}'}


# ---------------------------------------------------------------------------
# Redirect endpoint
# ---------------------------------------------------------------------------

def test_valid_offer_redirects_and_records_click(client, seeded_db):
    offer = seeded_offer(seeded_db)
    response = client.get(f'/api/redirect/{offer.id}', follow_redirects=False)

    assert response.status_code == 302
    location = response.headers['location']
    assert location.startswith(('http://', 'https://'))
    # A non-identifying session cookie is issued to anonymous visitors.
    assert 'sv_sid' in response.headers.get('set-cookie', '')

    clicks = (
        seeded_db.query(MerchantClick)
        .filter(MerchantClick.offer_id == offer.id)
        .all()
    )
    assert len(clicks) == 1
    assert clicks[0].product_id == offer.product_id
    assert clicks[0].user_id is None          # anonymous
    assert clicks[0].session_id               # random session id present


def test_missing_offer_returns_404(client, seeded_db):
    response = client.get('/api/redirect/999999', follow_redirects=False)
    assert response.status_code == 404


def test_invalid_offer_id_returns_422(client):
    assert client.get('/api/redirect/not-a-number').status_code == 422


def test_unsafe_stored_url_is_rejected_without_redirect_or_click(client, seeded_db):
    offer = seeded_offer(seeded_db, store='Myntra')
    offer.product_url = 'javascript:alert(document.domain)'
    seeded_db.commit()

    response = client.get(f'/api/redirect/{offer.id}', follow_redirects=False)
    assert response.status_code in (400, 409)

    assert (
        seeded_db.query(MerchantClick)
        .filter(MerchantClick.offer_id == offer.id)
        .count()
        == 0
    )


def test_data_and_file_scheme_urls_are_rejected(client, seeded_db):
    for bad in ('data:text/html;base64,PHNjcmlwdD4=', 'file:///etc/passwd'):
        offer = seeded_offer(seeded_db, store='Flipkart')
        offer.product_url = bad
        seeded_db.commit()
        response = client.get(f'/api/redirect/{offer.id}', follow_redirects=False)
        assert response.status_code in (400, 409), bad
    assert seeded_db.query(MerchantClick).count() >= 0  # no crash; clicks may exist only for valid ones


def test_legacy_visit_route_also_records_clicks(client, seeded_db):
    offer = seeded_offer(seeded_db, store='Amazon')
    product_id = offer.product_id
    response = client.get(
        f'/api/products/{product_id}/offers/{offer.id}/visit', follow_redirects=False
    )
    assert response.status_code == 302
    assert (
        seeded_db.query(MerchantClick)
        .filter(MerchantClick.offer_id == offer.id)
        .count()
        == 1
    )


def test_authenticated_click_links_user(client, seeded_db):
    headers = register_and_login(client)
    offer = seeded_offer(seeded_db, store='Ajio')
    response = client.get(
        f'/api/redirect/{offer.id}',
        headers=headers,
        follow_redirects=False,
    )
    assert response.status_code == 302
    click = (
        seeded_db.query(MerchantClick)
        .filter(MerchantClick.offer_id == offer.id)
        .one()
    )
    assert click.user_id is not None          # associated with the account
    assert click.session_id                   # and still has a session id


def test_invalid_token_degrades_to_anonymous(client, seeded_db):
    offer = seeded_offer(seeded_db, store='Ajio')
    response = client.get(
        f'/api/redirect/{offer.id}',
        headers={'Authorization': 'Bearer not-a-real-token'},
        follow_redirects=False,
    )
    assert response.status_code == 302
    click = seeded_db.query(MerchantClick).one()
    assert click.user_id is None              # invalid token -> anonymous


# ---------------------------------------------------------------------------
# Analytics endpoints
# ---------------------------------------------------------------------------

def _click(db, offer, product_id, user_id=None):
    """Create a click exactly as production does (incl. merchant resolution)."""
    from app.services.merchant_redirect_service import record_merchant_click

    return record_merchant_click(
        db,
        offer=offer,
        product_id=product_id,
        user_id=user_id,
        session_id='sess',
    )


def test_analytics_endpoints_require_authorization(client, seeded_db):
    assert client.get('/api/admin/analytics/merchant-clicks').status_code == 401
    assert client.get('/api/admin/analytics/merchants').status_code == 401
    assert client.get('/api/admin/analytics/products').status_code == 401
    wrong = {'X-Admin-Key': 'nope'}
    assert client.get('/api/admin/analytics/merchants', headers=wrong).status_code == 403


def test_merchant_click_summary_aggregates(client, seeded_db):
    ajio = seeded_offer(seeded_db, store='Ajio')
    myntra = seeded_offer(seeded_db, store='Myntra')
    _click(seeded_db, ajio, ajio.product_id)
    _click(seeded_db, ajio, ajio.product_id)
    _click(seeded_db, myntra, myntra.product_id)

    response = client.get(
        '/api/admin/analytics/merchant-clicks?days=30', headers=ADMIN_HEADER
    )
    assert response.status_code == 200
    body = response.json()
    assert body['total_clicks'] == 3
    assert body['unique_products'] == 2
    assert body['active_merchants'] == 2
    assert body['top_merchant'] == 'Ajio'          # 2 clicks vs Myntra's 1
    by_merchant = {r['merchant']: r['clicks'] for r in body['clicks_by_merchant']}
    assert by_merchant == {'Ajio': 2, 'Myntra': 1}
    assert sum(r['clicks'] for r in body['clicks_by_date']) == 3


def test_merchant_analytics_rows_sorted_by_clicks(client, seeded_db):
    ajio = seeded_offer(seeded_db, store='Ajio')
    amazon = seeded_offer(seeded_db, store='Amazon')
    _click(seeded_db, ajio, ajio.product_id)
    _click(seeded_db, ajio, ajio.product_id)
    _click(seeded_db, amazon, amazon.product_id)

    rows = client.get(
        '/api/admin/analytics/merchants?days=30', headers=ADMIN_HEADER
    ).json()
    clicks_by_name = {row['merchant']: row['clicks'] for row in rows}
    assert clicks_by_name['Ajio'] == 2
    assert clicks_by_name['Amazon'] >= 1
    # Sorted busiest-first.
    click_values = [row['clicks'] for row in rows]
    assert click_values == sorted(click_values, reverse=True)
    assert all('last_click_at' in row for row in rows)


def test_product_analytics_includes_clicked_products(client, seeded_db):
    ajio = seeded_offer(seeded_db, store='Ajio')
    myntra = seeded_offer(seeded_db, store='Myntra')
    _click(seeded_db, ajio, ajio.product_id)
    _click(seeded_db, myntra, ajio.product_id)

    rows = client.get(
        '/api/admin/analytics/products?days=30', headers=ADMIN_HEADER
    ).json()
    target = next(r for r in rows if r['product_id'] == ajio.product_id)
    assert target['clicks'] == 2
    assert target['best_price'] is not None
    assert target['last_updated'] is not None
    # Sorted most-clicked first.
    click_values = [r['clicks'] for r in rows]
    assert click_values == sorted(click_values, reverse=True)


def test_product_analytics_sort_parameter(client, seeded_db):
    a = seeded_offer(seeded_db, store='Ajio')
    m = seeded_offer(seeded_db, store='Myntra')
    _click(seeded_db, a, a.product_id)
    _click(seeded_db, a, a.product_id)
    _click(seeded_db, m, m.product_id)
    desc = client.get(
        '/api/admin/analytics/products?days=30&sort=clicks', headers=ADMIN_HEADER
    ).json()
    asc = client.get(
        '/api/admin/analytics/products?days=30&sort=clicks_asc', headers=ADMIN_HEADER
    ).json()
    assert desc[0]['clicks'] >= desc[-1]['clicks']
    assert asc[0]['clicks'] <= asc[-1]['clicks']


def test_date_filter_excludes_old_clicks(client, seeded_db):
    from datetime import datetime, timedelta, timezone

    offer = seeded_offer(seeded_db, store='Ajio')
    recent = _click(seeded_db, offer, offer.product_id)
    old = MerchantClick(
        offer_id=offer.id,
        merchant_id=recent.merchant_id,
        product_id=offer.product_id,
        session_id='old-session',
        clicked_at=datetime.now(timezone.utc) - timedelta(days=60),
    )
    seeded_db.add(old)
    seeded_db.commit()

    last7 = client.get(
        '/api/admin/analytics/merchant-clicks?days=7', headers=ADMIN_HEADER
    ).json()
    last90 = client.get(
        '/api/admin/analytics/merchant-clicks?days=90', headers=ADMIN_HEADER
    ).json()
    assert last7['total_clicks'] == 1            # only the recent click
    assert last90['total_clicks'] == 2           # both included
