import { ApiEndpoints } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.auth()
const TOKEN_KEY = 'styleverse-token'

// ---------------------------------------------------------------------------
// Token storage helpers (sessionStorage — cleared when tab/window is closed)
// ---------------------------------------------------------------------------

export function getStoredToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY) || null
  } catch {
    return null
  }
}

export function storeToken(token) {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token)
  } catch {
    /* storage unavailable */
  }
}

export function removeToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

// ---------------------------------------------------------------------------
// Auth API calls
// ---------------------------------------------------------------------------

/**
 * Register a new user.
 * @returns {{ access_token, token_type, user }}
 */
export async function signupUser({ name, email, password }) {
  return apiFetch('/signup', {
    baseUrl: API_BASE_URL,
    method: 'POST',
    body: { name, email, password },
  })
}

/**
 * Authenticate an existing user.
 * @returns {{ access_token, token_type, user }}
 */
export async function loginUser({ email, password }) {
  return apiFetch('/login', {
    baseUrl: API_BASE_URL,
    method: 'POST',
    body: { email, password },
  })
}

/**
 * Fetch the authenticated user using a stored JWT.
 * Throws on 401 (invalid/expired token) or network error.
 * @returns {UserResponse}
 */
export async function getCurrentUser(token) {
  return apiFetch('/me', {
    baseUrl: API_BASE_URL,
    method: 'GET',
    token,
  })
}

