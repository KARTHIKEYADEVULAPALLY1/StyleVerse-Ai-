import { ApiEndpoints } from '../config/api.js'

const API_BASE_URL = ApiEndpoints.wishlist()

async function apiFetch(path, token, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(data?.detail || `Request failed (${response.status})`)
    }

    return data
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the wishlist server.')
    }
    throw error
  }
}

export async function fetchWishlist(token) {
  return apiFetch('', token, { method: 'GET' })
}

export async function addProductToWishlist(token, productId) {
  return apiFetch(`/${productId}`, token, { method: 'POST' })
}

export async function removeProductFromWishlist(token, productId) {
  return apiFetch(`/${productId}`, token, { method: 'DELETE' })
}
