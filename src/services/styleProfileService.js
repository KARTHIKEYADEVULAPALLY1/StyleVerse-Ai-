import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

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

  return apiFetch('', {
    baseUrl: API_BASE_URL,
    method: 'GET',
    token,
  })
}