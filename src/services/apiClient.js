/**
 * Centralized API client for StyleVerse.
 *
 * Provides a single `apiFetch()` wrapper used by every service file,
 * with typed error classes, timeout handling via AbortController,
 * optional exponential-backoff retries, and user-friendly error
 * messages.
 *
 * All custom errors extend `ApiError` so consumers can do:
 *
 *   import { ApiError, isNetworkError, isRetryable } from './apiClient';
 *   try { await apiFetch(...); } catch (e) {
 *     if (e instanceof ApiError) { ... }
 *   }
 *
 * Conventions:
 *   - `options.baseUrl` overrides the per-call base URL.
 *   - `options.token` attaches `Authorization: Bearer <token>`.
 *   - `options.timeout` defaults to 15 000 ms.
 *   - `options.retries` defaults to 0 (opt-in).  Only retried for
 *     network errors, timeouts, and 5xx / 429 responses.
 *   - On 401, a `styleverse:auth:unauthorized` CustomEvent is
 *     dispatched on `window` so `AuthContext` can react.
 */

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class ApiError extends Error {
    /**
     * @param {string} message
     * @param {Object} [opts]
     * @param {number} [opts.status]   HTTP status (if any)
     * @param {string} [opts.url]      Request URL
     * @param {*}      [opts.detail]   Original backend error body
     * @param {Object} [opts.headers]  Response headers
     */
    constructor(message, opts = {}) {
        super(message)
        this.name = 'ApiError'
        this.status = opts.status ?? null
        this.url = opts.url ?? null
        this.detail = opts.detail ?? null
        this.headers = opts.headers ?? null
    }
}

export class NetworkError extends ApiError {
    constructor(message = 'Network error', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 0 })
        this.name = 'NetworkError'
    }
}

export class TimeoutError extends ApiError {
    constructor(message = 'Request timed out', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 0 })
        this.name = 'TimeoutError'
    }
}

export class AuthError extends ApiError {
    constructor(message = 'Unauthorized', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 401 })
        this.name = 'AuthError'
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'Forbidden', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 403 })
        this.name = 'ForbiddenError'
    }
}

export class NotFoundError extends ApiError {
    constructor(message = 'Not found', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 404 })
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends ApiError {
    constructor(message = 'Conflict', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 409 })
        this.name = 'ConflictError'
    }
}

export class ValidationError extends ApiError {
    constructor(message = 'Validation failed', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 422 })
        this.name = 'ValidationError'
    }
}

export class RateLimitError extends ApiError {
    constructor(message = 'Too many requests', opts = {}) {
        super(message, { ...opts, status: opts.status ?? 429 })
        this.name = 'RateLimitError'
        // honour Retry-After when supplied
        const retryAfter = Number(opts.headers?.get?.('retry-after'))
        this.retryAfter = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
    }
}

export class ServerError extends ApiError {
    constructor(message = 'Server error', opts = {}) {
        super(message, { ...opts })
        this.name = 'ServerError'
    }
}

// Map of HTTP status -> error class.  Defaults to `ApiError` for any
// status we haven't classified (e.g. 400 falls through to a generic
// ApiError because it can mean many things; the backend `detail` is
// still attached so callers get a meaningful message).
const STATUS_ERROR_MAP = {
    401: AuthError,
    403: ForbiddenError,
    404: NotFoundError,
    409: ConflictError,
    422: ValidationError,
    429: RateLimitError,
    500: ServerError,
    502: ServerError,
    503: ServerError,
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Detect a fetch-level network failure (DNS, offline, CORS, etc.). */
export function isNetworkError(error) {
    if (!error) return false
    if (error instanceof NetworkError) return true
    // Browsers raise TypeError("Failed to fetch") / "NetworkError when
    // attempting to fetch resource" on connection problems.
    if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
        return true
    }
    return false
}

/** Whether an error is safe to retry. */
export function isRetryable(error) {
    if (!error) return false
    if (isNetworkError(error)) return true
    if (error instanceof TimeoutError) return true
    if (error instanceof RateLimitError) return true
    if (error instanceof ServerError) return true
    return false
}

/**
 * Best-effort: extract a useful detail string from a backend error body.
 * FastAPI commonly returns `{ "detail": "..." }`, but detail can also be
 * an array of validation errors.
 */
function extractDetail(body) {
    if (body == null) return null
    if (typeof body === 'string') return body
    if (typeof body.detail === 'string') return body.detail
    if (Array.isArray(body.detail)) {
        return body.detail
            .map((d) => {
                if (typeof d === 'string') return d
                const loc = Array.isArray(d.loc) ? d.loc.join('.') : ''
                const msg = d.msg || d.message || ''
                return loc ? `${loc}: ${msg}` : msg
            })
            .filter(Boolean)
            .join('; ')
    }
    if (typeof body.message === 'string') return body.message
    if (typeof body.error === 'string') return body.error
    return null
}

/** Custom-event name for 401s.  AuthContext listens for this. */
export const AUTH_UNAUTHORIZED_EVENT = 'styleverse:auth:unauthorized'

function dispatchUnauthorized(url) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
        return
    }
    try {
        window.dispatchEvent(
            new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: { url } }),
        )
    } catch {
        /* SSR / old browser — best-effort */
    }
}

/** Sleep helper for exponential backoff. */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Resolve the effective base URL.  Priority:
 *   1. options.baseUrl (per-call override)
 *   2. import.meta.env.VITE_API_BASE_URL (global)
 *   3. sensible localhost default
 */
function resolveBaseUrl(options) {
    if (options.baseUrl) return options.baseUrl
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        const envBase = import.meta.env.VITE_API_BASE_URL
        if (envBase) return envBase
    }
    return 'http://127.0.0.1:8000'
}

// ---------------------------------------------------------------------------
// Core request function
// ---------------------------------------------------------------------------

/**
 * Perform a single (non-retried) HTTP request.
 *
 * Throws one of the typed ApiError subclasses.  Returns the parsed
 * JSON body on success, or `null` for empty 204 responses.
 *
 * @param {string} path     e.g. "/api/products"
 * @param {Object} [options]
 * @returns {Promise<any>}
 */
async function executeRequest(path, options = {}) {
    const {
        method = 'GET',
        body,
        token,
        headers: extraHeaders = {},
        timeout = 15000,
        baseUrl,
        signal: externalSignal,
    } = options

    const url = `${resolveBaseUrl(options)}${path}`

    // Compose headers
    const headers = {
        Accept: 'application/json',
        ...extraHeaders,
    }
    if (body !== undefined && !(body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    // Set up timeout via AbortController.  Chain with any caller-provided
    // signal so a caller can cancel our timeout too.
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = setTimeout(() => {
        timedOut = true
        controller.abort()
    }, timeout)

    if (externalSignal) {
        if (externalSignal.aborted) {
            clearTimeout(timeoutId)
            const err = new Error('Request aborted')
            err.name = 'AbortError'
            throw err
        }
        externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }

    let response
    try {
        response = await fetch(url, {
            method,
            headers,
            body: body === undefined || body === null
                ? undefined
                : body instanceof FormData
                    ? body
                    : typeof body === 'string'
                        ? body
                        : JSON.stringify(body),
            signal: controller.signal,
        })
    } catch (err) {
        clearTimeout(timeoutId)
        if (timedOut) {
            throw new TimeoutError('Request timed out. Please try again.', { url })
        }
        if (err && (err.name === 'AbortError' || err.name === 'The user aborted a request')) {
            // Caller-driven cancel — preserve as ApiError so callers can ignore.
            throw new ApiError('Request aborted', { url })
        }
        if (isNetworkError(err)) {
            throw new NetworkError('Unable to connect. Please check your internet connection.', {
                url,
                detail: err.message,
            })
        }
        // Re-throw unknown errors wrapped in ApiError for consistency.
        throw new ApiError(err.message || 'Unknown fetch error', { url, detail: err })
    } finally {
        clearTimeout(timeoutId)
    }

    // Parse body (may be empty for 204 No Content)
    let data = null
    const contentLength = response.headers.get('content-length')
    const hasBody = response.status !== 204 && contentLength !== '0'
    if (hasBody) {
        const contentType = response.headers.get('content-type') || ''
        try {
            if (contentType.includes('application/json')) {
                data = await response.json()
            } else {
                const text = await response.text()
                data = text || null
            }
        } catch {
            // Body wasn't valid JSON — leave data as null and fall back to status text.
            data = null
        }
    }

    if (response.ok) {
        return data
    }

    // ----- error path -----
    const detail = extractDetail(data)
    const message = detail || response.statusText || `Request failed (${response.status})`
    const opts = {
        status: response.status,
        url,
        detail: data ?? detail,
        headers: response.headers,
    }

    const ErrorClass = STATUS_ERROR_MAP[response.status] || ApiError
    const err = new ErrorClass(message, opts)

    if (err instanceof AuthError) {
        dispatchUnauthorized(url)
    }

    return Promise.reject(err)
}

/**
 * Public API: `apiFetch(path, options)`.
 *
 * Performs a request with optional retry / exponential backoff.
 * Returns the parsed JSON response.
 *
 * @param {string} path
 * @param {Object} [options]
 * @param {string} [options.method]
 * @param {*}      [options.body]
 * @param {string} [options.token]
 * @param {Object} [options.headers]
 * @param {number} [options.timeout]    Default 15000 (ms)
 * @param {number} [options.retries]    Default 0
 * @param {number} [options.retryDelay] Initial backoff in ms (default 500)
 * @param {AbortSignal} [options.signal] Caller-supplied cancellation signal
 * @param {string} [options.baseUrl]    Override base URL for this call
 * @returns {Promise<any>}
 */
export async function apiFetch(path, options = {}) {
    const {
        retries = 0,
        retryDelay = 500,
        ...requestOptions
    } = options

    let attempt = 0
    let lastError

    while (attempt <= retries) {
        try {
            return await executeRequest(path, requestOptions)
        } catch (err) {
            lastError = err

            // Don't retry non-retryable errors (e.g. 400, 401, 404, 422).
            if (!isRetryable(err) || attempt === retries) {
                throw err
            }

            const backoff = retryDelay * Math.pow(2, attempt)
            // Add a small jitter (10%) to avoid thundering herd.
            const jitter = backoff * 0.1 * Math.random()
            await sleep(backoff + jitter)
            attempt += 1
        }
    }

    // Should be unreachable, but just in case:
    throw lastError
}

// ---------------------------------------------------------------------------
// User-friendly message mapping
// ---------------------------------------------------------------------------

/**
 * Map any error to a string suitable for showing to end users.
 * Backend `detail` is preferred when available.
 */
export function getErrorMessage(error) {
    if (error == null) return 'Something went wrong. Please try again.'

    // Backend-supplied detail always wins (most accurate).
    const backendDetail = typeof error.detail === 'string' ? error.detail : null

    if (error instanceof ValidationError) {
        return backendDetail || 'The data you provided is invalid. Please check and try again.'
    }
    if (error instanceof AuthError) {
        return backendDetail || 'Session expired. Please log in again.'
    }
    if (error instanceof ForbiddenError) {
        return backendDetail || "You don't have permission to perform this action."
    }
    if (error instanceof NotFoundError) {
        return backendDetail || "We couldn't find what you were looking for."
    }
    if (error instanceof ConflictError) {
        return backendDetail || 'This action conflicts with the current state. Please refresh and try again.'
    }
    if (error instanceof RateLimitError) {
        if (error.retryAfter) {
            return `Too many requests. Please wait ${error.retryAfter} seconds and try again.`
        }
        return backendDetail || 'Too many requests. Please slow down and try again.'
    }
    if (error instanceof ServerError) {
        return backendDetail || 'Our servers are having trouble. Please try again in a moment.'
    }
    if (error instanceof TimeoutError) {
        return backendDetail || 'Request timed out. Please try again.'
    }
    if (error instanceof NetworkError) {
        return backendDetail || 'Unable to connect. Please check your internet connection.'
    }
    if (error instanceof ApiError) {
        return backendDetail || error.message || 'Something went wrong. Please try again.'
    }

    // Unknown error — return its message if it has one.
    if (typeof error.message === 'string' && error.message) {
        return error.message
    }
    return 'Something went wrong. Please try again.'
}

export default {
    apiFetch,
    getErrorMessage,
    isNetworkError,
    isRetryable,
    ApiError,
    NetworkError,
    TimeoutError,
    AuthError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    ValidationError,
    RateLimitError,
    ServerError,
    AUTH_UNAUTHORIZED_EVENT,
}
