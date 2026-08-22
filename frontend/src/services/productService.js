const API_BASE_URL = import.meta.env.VITE_PRODUCTS_API_URL || 'http://127.0.0.1:8000/api/products'

async function apiFetch(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.detail || `Request failed (${response.status})`)
    }

    return response.json()
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the products server.')
    }
    throw error
  }
}

/**
 * Fetch all products from the API.
 * @returns {Promise<Array>}
 */
export async function fetchProducts() {
  return apiFetch('')
}

/**
 * Search products by keyword against the real product database.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchProducts(query = '') {
  const trimmed = String(query || '').trim()
  return apiFetch(`/search?q=${encodeURIComponent(trimmed)}`)
}

/**
 * Fetch a single product by its ID.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function fetchProductById(id) {
  return apiFetch(`/${id}`)
}

/**
 * Fetch store-specific pricing for a product.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function fetchProductPrices(id) {
  return apiFetch(`/${id}/prices`)
}