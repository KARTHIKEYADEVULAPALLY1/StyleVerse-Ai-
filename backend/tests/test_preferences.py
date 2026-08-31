from __future__ import annotations

from app.models.product import Product


def _signup(client, email: str) -> str:
    response = client.post(
        '/api/auth/signup',
        json={'name': 'Preference Tester', 'email': email, 'password': 'SuperSecret123!'},
    )
    assert response.status_code == 201
    return response.json()['access_token']


def test_preferences_require_jwt(client):
    assert client.get('/api/preferences').status_code == 401
    assert client.put('/api/preferences', json={'skipped': True}).status_code == 401


def test_preferences_validate_enums_and_ranges(client):
    token = _signup(client, 'preferences-invalid@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    assert client.put(
        '/api/preferences',
        headers=headers,
        json={'style': 'unknown', 'occasion': 'office', 'color_palette': 'neutrals', 'budget': 3000},
    ).status_code == 422
    assert client.put(
        '/api/preferences',
        headers=headers,
        json={'style': 'formal', 'occasion': 'office', 'color_palette': 'neutrals', 'budget': 999},
    ).status_code == 422


def test_preferences_save_skip_and_update(client):
    token = _signup(client, 'preferences-save@example.com')
    headers = {'Authorization': f'Bearer {token}'}

    skipped = client.put('/api/preferences', headers=headers, json={'skipped': True})
    assert skipped.status_code == 200
    assert skipped.json()['skipped'] is True
    assert skipped.json()['completed'] is False

    saved = client.put(
        '/api/preferences',
        headers=headers,
        json={
            'style': 'minimalist',
            'occasion': 'date_night',
            'color_palette': 'monochrome',
            'budget': 5000,
        },
    )
    assert saved.status_code == 200
    assert saved.json()['completed'] is True
    assert client.get('/api/preferences', headers=headers).json()['style'] == 'minimalist'


def test_preferences_are_additive_recommendation_signals(client, seeded_db):
    token = _signup(client, 'preferences-recommendations@example.com')
    headers = {'Authorization': f'Bearer {token}'}
    response = client.put(
        '/api/preferences',
        headers=headers,
        json={'style': 'formal', 'occasion': 'office', 'color_palette': 'neutrals', 'budget': 5000},
    )
    assert response.status_code == 200

    products = client.get('/api/recommendations', headers=headers)
    assert products.status_code == 200
    assert isinstance(products.json(), list)
    assert seeded_db.query(Product).count() >= len(products.json())


def test_style_profile_keeps_onboarding_preferences_separate(client):
    token = _signup(client, 'preferences-profile@example.com')
    headers = {'Authorization': f'Bearer {token}'}
    client.put(
        '/api/preferences',
        headers=headers,
        json={'style': 'streetwear', 'occasion': 'travel', 'color_palette': 'cool_blues', 'budget': 3000},
    )

    profile = client.get('/api/style-profile', headers=headers)
    assert profile.status_code == 200
    assert profile.json()['onboarding_preferences']['style'] == 'streetwear'
