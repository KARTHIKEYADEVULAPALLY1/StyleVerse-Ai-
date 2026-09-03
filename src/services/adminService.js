import { getStoredToken } from './authService'
import { ApiEndpoints } from '../config/api.js'

const ADMIN_API_BASE_URL = ApiEndpoints.admin()

function authHeaders() {
  const token = getStoredToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function adminFetch(path, options = {}) {
  let response
  try {
    response = await fetch(`${ADMIN_API_BASE_URL}${path}`, {
      headers: authHeaders(),
      ...options,
    })
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network error. Unable to connect to the admin server.')
    }
    throw error
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    // Attach the status so guards can distinguish 401 vs 403.
    const error = new Error(data?.detail || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }
  return data
}

/**
 * All merchants with connector status, counts, and last sync facts.
 * @returns {Promise<Array>}
 */
export function fetchAdminMerchants() {
  return adminFetch('/merchants')
}

/**
 * One merchant with sync/connector facts.
 * @param {number|string} merchantId
 */
export function fetchAdminMerchant(merchantId) {
  return adminFetch(`/merchants/${merchantId}`)
}

/**
 * Recent sync runs for a merchant, newest first.
 * @param {number|string} merchantId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export function fetchMerchantSyncs(merchantId, limit = 20) {
  return adminFetch(`/merchants/${merchantId}/syncs?limit=${limit}`)
}

/**
 * Trigger a manual connector sync for a merchant.
 * @param {number|string} merchantId
 * @returns {Promise<Object>} the recorded MerchantSync run
 */
export function triggerMerchantSync(merchantId) {
  return adminFetch(`/merchants/${merchantId}/sync`, { method: 'POST' })
}

/**
 * Current automated-sync state for a merchant (idle/syncing/disabled).
 * @param {number|string} merchantId
 * @returns {Promise<Object>}
 */
export function fetchMerchantSyncStatus(merchantId) {
  return adminFetch(`/merchants/${merchantId}/sync-status`)
}

/**
 * Validate a merchant's configured feed WITHOUT importing anything.
 * Returns connection status, detected format, record counts and a preview
 * sample marking invalid records.
 * @param {number|string} merchantId
 * @returns {Promise<Object>} { connection, message, format_detected, record_count, valid_count, invalid_count, sample[] }
 */
export function testMerchantFeed(merchantId) {
  return adminFetch(`/merchants/${merchantId}/test-feed`, { method: 'POST' })
}

/**
 * Trigger a full import of the merchant's configured real feed
 * (fetch -> validate -> normalize -> dedupe -> Product/Offer upsert).
 * @param {number|string} merchantId
 * @returns {Promise<Object>} the recorded MerchantSync run incl. result_stats
 */
export function triggerMerchantFeedSync(merchantId) {
  return adminFetch(`/merchants/${merchantId}/feed-sync`, { method: 'POST' })
}

/**
 * Update a merchant's automated-sync settings (enable/disable + interval).
 * Only administrators can call this; intervals are validated server-side.
 * @param {number|string} merchantId
 * @param {{sync_enabled?: boolean, sync_interval_minutes?: number}} payload
 * @returns {Promise<Object>} the refreshed merchant detail
 */
export function updateMerchantSyncConfig(merchantId, payload) {
  return adminFetch(`/merchants/${merchantId}/sync-config`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Real dashboard totals for the summary cards.
 * @returns {Promise<Object>}
 */
export function fetchDashboardSummary() {
  return adminFetch('/dashboard/summary')
}

// ---------------------------------------------------------------------------
// Catalog data-quality endpoints
// ---------------------------------------------------------------------------

function buildQuery(path, params) {
  const query = new URLSearchParams()
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const qs = query.toString()
  return `${path}${qs ? `?${qs}` : ''}`
}

/** Catalog data-quality totals (all real counts from the database). */
export function fetchCatalogSummary() {
  return adminFetch('/catalog/summary')
}

// ---------------------------------------------------------------------------
// Merchant click analytics
// ---------------------------------------------------------------------------

/**
 * Headline click metrics + chart series (totals, by-date, by-merchant).
 * @param {number} days recency window (7 / 30 / 90)
 * @returns {Promise<Object>}
 */
export function fetchClickAnalytics(days = 30) {
  return adminFetch(`/analytics/merchant-clicks?days=${days}`)
}

/**
 * Clicks grouped per merchant, busiest first.
 * @param {number} days
 * @returns {Promise<Array>}
 */
export function fetchMerchantClickAnalytics(days = 30) {
  return adminFetch(`/analytics/merchants?days=${days}`)
}

/**
 * Per-product click performance with best price + freshness.
 * @param {number} days
 * @returns {Promise<Array>} sorted by clicks (desc)
 */
export function fetchProductClickAnalytics(days = 30) {
  return adminFetch(`/analytics/products?days=${days}`)
}

/**
 * User behavior event metrics + chart series (product views, searches,
 * wishlist/cart actions, merchant clicks, AI stylist & try-on sessions,
 * top viewed/wishlisted/carted products, top search terms).
 * @param {number} days recency window (7 / 30 / 90)
 * @returns {Promise<Object>}
 */
export function fetchUserEventAnalytics(days = 30) {
  return adminFetch(`/analytics/user-events?days=${days}`)
}

/**
 * Filtered + paginated catalog listing with quality status per product.
 * @param {Object} params { status, merchant, category, has_image, has_offer,
 *                          stale, duplicate, missing_data, search, page, page_size }
 */
export function fetchCatalogProducts(params = {}) {
  return adminFetch(buildQuery('/catalog/products', params))
}

/** Full inspection payload for one product (offers + quality warnings). */
export function fetchCatalogProduct(productId) {
  return adminFetch(`/catalog/products/${productId}`)
}

/** Distinct categories/merchants for the filter dropdowns. */
export function fetchCatalogFilterOptions() {
  return adminFetch('/catalog/filters')
}
