// ---------------------------------------------------------------------------
// StyleVerse privacy-conscious analytics client
// ---------------------------------------------------------------------------
//
// Fire-and-forget event reporting for meaningful fashion interactions only
// (product views, searches, wishlist/cart actions, AI feature usage). Never
// called with passwords, payment data, uploaded images or device
// fingerprints; the backend additionally sanitizes every payload.
//
// Anonymous visitors get a random, non-identifying session identifier stored
// in sessionStorage - it is a random uuid-style string tied to nothing.
//
// Every function is best-effort: analytics failures NEVER break the UI.
// ---------------------------------------------------------------------------

import { getStoredToken } from './authService'

import { ApiEndpoints, getApiBaseUrl } from '../config/api.js'

const EVENTS_API_URL = ApiEndpoints.events()

const SESSION_KEY = 'styleverse-sid'

/** Supported event types (mirrors backend EVENT_TYPES). */
export const EVENT_TYPES = {
  PRODUCT_VIEWED: 'product_viewed',
  PRODUCT_SEARCHED: 'product_searched',
  WISHLIST_ADDED: 'wishlist_added',
  WISHLIST_REMOVED: 'wishlist_removed',
  CART_ADDED: 'cart_added',
  CART_REMOVED: 'cart_removed',
  ORDER_CREATED: 'order_created',
  MERCHANT_CLICKED: 'merchant_clicked',
  AI_STYLIST_USED: 'ai_stylist_used',
  VIRTUAL_TRY_ON_USED: 'virtual_try_on_used',
}

/**
 * Random per-browser session identifier (uuid4-style hex). Non-identifying:
 * it is generated locally and never derived from any personal attribute.
 */
export function getSessionId() {
  try {
    let sid = window.sessionStorage.getItem(SESSION_KEY)
    if (!sid) {
      sid =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID().replace(/-/g, '')
          : `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 14)}`
      window.sessionStorage.setItem(SESSION_KEY, sid)
    }
    return sid
  } catch {
    // Storage unavailable - server falls back to its own random id.
    return null
  }
}

/**
 * Track one user interaction event. Fire-and-forget: resolves silently even
 * when offline or when the backend rejects/scrubs the payload.
 *
 * @param {string} eventType one of EVENT_TYPES
 * @param {Object} [options]
 * @param {number|string} [options.productId]
 * @param {number|string} [options.merchantId]
 * @param {Object} [options.metadata] small non-sensitive context only
 * @returns {Promise<void>}
 */
export async function track(eventType, options = {}) {
  try {
    const payload = {
      event_type: eventType,
      session_id: getSessionId(),
    }
    if (options.productId !== undefined && options.productId !== null) {
      payload.product_id = Number(options.productId)
    }
    if (options.merchantId !== undefined && options.merchantId !== null) {
      payload.merchant_id = Number(options.merchantId)
    }
    if (options.metadata && typeof options.metadata === 'object') {
      payload.metadata = options.metadata
    }

    const token = getStoredToken()
    await fetch(EVENTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    /* analytics must never surface errors in the UI */
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers used across flows
// ---------------------------------------------------------------------------

/** Product Details page opened. */
export function trackProductView(productId) {
  return track(EVENT_TYPES.PRODUCT_VIEWED, { productId })
}

/** One completed search (never per keystroke). */
export function trackSearch(query, resultCount) {
  const trimmed = String(query || '').trim()
  if (!trimmed) return Promise.resolve()
  const metadata = Number.isFinite(resultCount) ? { result_count: resultCount } : undefined
  return track(EVENT_TYPES.PRODUCT_SEARCHED, { metadata })
}

export function trackWishlistAdded(productId) {
  return track(EVENT_TYPES.WISHLIST_ADDED, { productId })
}

export function trackWishlistRemoved(productId) {
  return track(EVENT_TYPES.WISHLIST_REMOVED, { productId })
}

export function trackCartAdded(productId, metadata) {
  return track(EVENT_TYPES.CART_ADDED, { productId, metadata })
}

export function trackCartRemoved(productId) {
  return track(EVENT_TYPES.CART_REMOVED, { productId })
}

/**
 * AI Stylist session. Metadata example: { occasion: 'date_night', style: 'minimalist' }.
 * Never include uploaded images here.
 */
export function trackAiStylistUsed(metadata) {
  return track(EVENT_TYPES.AI_STYLIST_USED, { metadata })
}

/** Virtual Try-On session. No image data is ever sent to analytics. */
export function trackVirtualTryOnUsed(productId) {
  return track(EVENT_TYPES.VIRTUAL_TRY_ON_USED, { productId })
}
