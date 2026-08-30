const ROOT_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '')
const API_BASE_URL = import.meta.env?.VITE_PRODUCTS_API_URL || `${ROOT_URL}/api/products`

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
 * Fetch products from the API with optional pagination and filters.
 * @param {Object} params { page, limit, sort, category, brand }
 * @returns {Promise<Array|Object>}
 */
export async function fetchProducts(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const queryString = search.toString()
  const data = await apiFetch(queryString ? `?${queryString}` : '')
  if (Array.isArray(data)) return data
  return data?.items || data?.products || []
}

export async function fetchPaginatedProducts(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const queryString = search.toString()
  return apiFetch(queryString ? `?${queryString}` : '')
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

/**
 * Resolve an offer's backend redirect path against the API origin.
 * @param {string|null} visitUrl e.g. "/api/products/1/offers/2/visit"
 * @returns {string|null} absolute URL on the StyleVerse backend
 */
export function buildMerchantRedirectUrl(visitUrl) {
  if (!visitUrl) return null
  try {
    return new URL(visitUrl, API_BASE_URL).toString()
  } catch {
    return visitUrl
  }
}

const DISCOVERY_API_URL =
  import.meta.env.VITE_DISCOVERY_API_URL ||
  `${API_BASE_URL.replace(/\/api\/products\/?$/, '')}/api/discovery`

/**
 * Multi-store discovery: search across merchants and get each product's
 * best currently-available offer in one call.
 * @param {Object} params { q, category, brand, min_price, max_price, merchant, sort }
 * @returns {Promise<{products:Array, total:number, merchants:Array, sort:string}>}
 */
export async function fetchDiscovery(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const queryString = search.toString()

  try {
    const response = await fetch(
      `${DISCOVERY_API_URL}${queryString ? `?${queryString}` : ''}`,
      { headers: { 'Content-Type': 'application/json' } }
    )
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      throw new Error(data?.detail || `Request failed (${response.status})`)
    }
    return response.json()
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the discovery server.')
    }
    throw error
  }
}