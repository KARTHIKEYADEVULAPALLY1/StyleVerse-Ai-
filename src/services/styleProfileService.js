import { ApiEndpoints } from '../config/api.js'

const API_BASE_URL = ApiEndpoints.styleProfile()

/**
 * Fetch the signed-in user's style profile.
 * @param {string} token - JWT access token.
 * @returns {Promise<Object|null>} The profile, or null when not authenticated.
 */
export async function fetchStyleProfile(token) {
  if (!token) {
    return null
  }

  const response = await fetch(`${API_BASE_URL}/style-profile`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Unable to load your style profile.')
  }

  return data
}