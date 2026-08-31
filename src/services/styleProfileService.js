const ROOT_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = import.meta.env?.VITE_STYLE_PROFILE_API_URL || `${ROOT_URL}/api`

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