import { ApiEndpoints } from '../config/api.js'

const API_BASE_URL = ApiEndpoints.cart()

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
      throw new Error('Network error. Unable to connect to the cart server.')
    }
    throw error
  }
}

export async function fetchCart(token) {
  return apiFetch('', token, { method: 'GET' })
}

export async function addCartItem(token, payload) {
  return apiFetch('', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateCartItem(token, productId, payload) {
  return apiFetch(`/${productId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function removeCartItem(token, productId, payload = {}) {
  return apiFetch(`/${productId}`, token, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  })
}
