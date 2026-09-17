import { ApiEndpoints, getApiBaseUrl } from '../config/api.js'
import { apiFetch } from './apiClient.js'

const API_BASE_URL = ApiEndpoints.products()

// Discovery API - construct from base
const DISCOVERY_API_URL = `${getApiBaseUrl()}/api/discovery`


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
  const data = await apiFetch(queryString ? `?${queryString}` : '', { baseUrl: API_BASE_URL })
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
  return apiFetch(queryString ? `?${queryString}` : '', { baseUrl: API_BASE_URL })
}


/**
 * Search products by keyword against the real product database.
 * @param {string} query
 * @returns {Promise<Array>}
 */
export async function searchProducts(query = '') {
  const trimmed = String(query || '').trim()
  return apiFetch(`/search?q=${encodeURIComponent(trimmed)}`, { baseUrl: API_BASE_URL })
}

/**
 * Fetch a single product by its ID.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function fetchProductById(id) {
  return apiFetch(`/${id}`, { baseUrl: API_BASE_URL })
}

/**
 * Fetch store-specific pricing for a product.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
export async function fetchProductPrices(id) {
  return apiFetch(`/${id}/prices`, { baseUrl: API_BASE_URL })
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
  return apiFetch(queryString ? `?${queryString}` : '', { baseUrl: DISCOVERY_API_URL })
}