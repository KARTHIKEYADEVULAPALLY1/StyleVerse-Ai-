"""Tests for ingestion endpoint authorization and behavior."""
from __future__ import annotations

import pytest

ADMIN_HEADER = {'X-Admin-Key': 'test-admin-key-123'}


@pytest.fixture(autouse=True)
def _admin_key(monkeypatch):
    monkeypatch.setenv('ADMIN_API_KEY', 'test-admin-key-123')


def test_ingestion_requires_authentication(client):
    response = client.post('/api/admin/ingestion/run')
    assert response.status_code == 401


def test_ingestion_rejects_invalid_key(client):
    response = client.post(
        '/api/admin/ingestion/run',
        headers={'X-Admin-Key': 'wrong-key'},
    )
    assert response.status_code == 403


def test_merchant_list_requires_authentication(client):
    assert client.get('/api/admin/merchants').status_code == 401
    assert client.get('/api/admin/connectors').status_code == 401


def test_ingestion_runs_with_valid_key(client):
    response = client.post('/api/admin/ingestion/run', headers=ADMIN_HEADER)
    assert response.status_code == 200
    body = response.json()
    assert body['status'] == 'completed'

    totals = body['totals']
    assert totals['merchants_processed'] >= 1
    assert totals['received'] > 0
    assert totals['offers_created'] + totals['offers_updated'] == totals['received']
    assert totals['skipped'] == 0

    merchants = {m['merchant'] for m in body['merchants']}
    assert {'amazon', 'myntra', 'ajio', 'flipkart'} <= merchants


def test_ingestion_can_target_single_merchant(client):
    response = client.post(
        '/api/admin/ingestion/run',
        json={'merchant_slugs': ['ajio']},
        headers=ADMIN_HEADER,
    )
    assert response.status_code == 200
    body = response.json()
    assert body['totals']['merchants_processed'] == 1
    assert body['merchants'][0]['merchant'] == 'ajio'


def test_merchants_listed_with_valid_key(client):
    client.post('/api/admin/ingestion/run', headers=ADMIN_HEADER)
    response = client.get('/api/admin/merchants', headers=ADMIN_HEADER)
    assert response.status_code == 200
    slugs = {m['slug'] for m in response.json()}
    assert {'amazon', 'myntra', 'ajio', 'flipkart'} <= slugs
    for merchant in response.json():
        assert set(merchant) >= {'id', 'name', 'slug', 'website_url', 'is_active'}


def test_connectors_listed_with_valid_key(client):
    response = client.get('/api/admin/connectors', headers=ADMIN_HEADER)
    assert response.status_code == 200
    body = response.json()
    assert 'amazon' in body['available']


def test_unknown_merchant_slug_reports_error(client):
    response = client.post(
        '/api/admin/ingestion/run',
        json={'merchant_slugs': ['no-such-store']},
        headers=ADMIN_HEADER,
    )
    assert response.status_code == 500