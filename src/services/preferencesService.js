import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.preferences()

export function fetchPreferences(token) {
  if (!token) return Promise.resolve(null)
  return apiFetch('', { baseUrl: API_BASE_URL, token, method: 'GET' })
}

export function fetchPreferenceOptions(token) {
  return apiFetch('/options', {
    baseUrl: API_BASE_URL,
    token: token || undefined,
    method: 'GET',
  }).catch(() => null)
}

export function savePreferences(token, preferences) {
  return apiFetch('', {
    baseUrl: API_BASE_URL,
    token,
    method: 'PUT',
    body: preferences,
  })
}


