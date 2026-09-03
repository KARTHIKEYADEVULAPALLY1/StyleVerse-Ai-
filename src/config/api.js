/**
 * Centralized API Configuration
 * 
 * This module provides a single source of truth for all API URLs.
 * All service files should import from here instead of hardcoding URLs.
 * 
 * IMPORTANT: VITE_API_URL must be set in environment files.
 * There is NO hardcoded fallback - production builds MUST have this configured.
 */

/**
 * Get the API base URL from environment.
 * Throws an error if not set (fails fast in production).
 */
export function getApiBaseUrl() {
    const url = import.meta.env?.VITE_API_URL;

    if (!url) {
        throw new Error(
            'VITE_API_URL environment variable is not set. ' +
            'Set VITE_API_URL to your FastAPI backend URL (e.g., https://api.yourdomain.com).'
        );
    }

    // Normalize: remove trailing slashes
    return url.replace(/\/+$/, '');
}

/**
 * Build a full API URL for a specific endpoint path.
 * @param {string} path - API path (e.g., "/api/products")
 */
export function buildApiUrl(path) {
    const base = getApiBaseUrl();
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
}

/**
 * Get the API base URL (legacy name for backward compatibility).
 * Prefer getApiBaseUrl() for new code.
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Endpoint-specific URL getters
 * These build URLs relative to the base API URL
 */
export const ApiEndpoints = {
    auth: (path = '') => buildApiUrl(`/api/auth${path}`),
    products: (path = '') => buildApiUrl(`/api/products${path}`),
    cart: (path = '') => buildApiUrl(`/api/cart${path}`),
    wishlist: (path = '') => buildApiUrl(`/api/wishlist${path}`),
    orders: (path = '') => buildApiUrl(`/api/orders${path}`),
    stylist: (path = '') => buildApiUrl(`/api/stylist${path}`),
    tryOn: (path = '') => buildApiUrl(`/api/try-on${path}`),
    events: (path = '') => buildApiUrl(`/api/events${path}`),
    admin: (path = '') => buildApiUrl(`/api/admin${path}`),
    recommendations: (path = '') => buildApiUrl(`/api/recommendations${path}`),
    styleProfile: (path = '') => buildApiUrl(`/api/style-profile${path}`),
    preferences: (path = '') => buildApiUrl(`/api/preferences${path}`),
    discovery: (path = '') => buildApiUrl(`/api/discovery${path}`),
};
