const API_BASE_URL = import.meta.env.VITE_AUTH_API_URL || 'http://127.0.0.1:8000/api/auth'
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
// Shared fetch helper
// ---------------------------------------------------------------------------

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.detail || `Request failed (${response.status})`)
    }

    return data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the authentication server.')
    }
    throw error
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
  const data = await apiFetch('/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  })
  return data // { access_token, token_type, user }
}

/**
 * Authenticate an existing user.
 * @returns {{ access_token, token_type, user }}
 */
export async function loginUser({ email, password }) {
  const data = await apiFetch('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
  return data // { access_token, token_type, user }
}

/**
 * Fetch the authenticated user using a stored JWT.
 * Throws on 401 (invalid/expired token) or network error.
 * @returns {UserResponse}
 */
export async function getCurrentUser(token) {
  return apiFetch('/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
}
