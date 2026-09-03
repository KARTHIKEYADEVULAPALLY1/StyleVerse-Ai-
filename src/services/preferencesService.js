import { ApiEndpoints } from '../config/api.js'

const API_BASE_URL = ApiEndpoints.preferences()

async function apiFetch(token, options = {}) {
  const response = await fetch(API_BASE_URL, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Unable to save your style preferences.')
  }
  return data
}

export function fetchPreferences(token) {
  return token ? apiFetch(token) : Promise.resolve(null)
}

export function fetchPreferenceOptions(token) {
  const url = `${API_BASE_URL}/options`
  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
    .then((res) => (res.ok ? res.json() : null))
    .catch(() => null)
}

export function savePreferences(token, preferences) {
  return apiFetch(token, {
    method: 'PUT',
    body: JSON.stringify(preferences),
  })
}

