const API_BASE_URL = import.meta.env.VITE_ORDER_API_URL || 'http://127.0.0.1:8000/api/orders'

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
      throw new Error('Network error. Unable to connect to the order server.')
    }
    throw error
  }
}

export async function createOrder(token) {
  return apiFetch('', token, { method: 'POST' })
}

export async function fetchOrders(token) {
  return apiFetch('', token, { method: 'GET' })
}

export async function fetchOrderById(token, orderId) {
  return apiFetch(`/${orderId}`, token, { method: 'GET' })
}
