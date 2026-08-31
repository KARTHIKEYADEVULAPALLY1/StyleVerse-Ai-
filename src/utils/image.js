/**
 * Centralized image utility for StyleVerse.
 *
 * Provides URL validation, normalization, type detection, fallback handling
 * and safe rendering helpers used by ProductImage.jsx and other components.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Image categories supported by the application. */
export const IMAGE_TYPES = Object.freeze({
    PRODUCT: 'product',
    MERCHANT: 'merchant',
    USER_UPLOAD: 'user-upload',
    TRYON_RESULT: 'tryon-result',
})

const VALID_TYPES = new Set(Object.values(IMAGE_TYPES))

/** Default base URL for relative paths (browser context). */
const DEFAULT_BASE_URL =
    typeof window !== 'undefined' && window.location
        ? `${window.location.protocol}//${window.location.host}`
        : ''

/** Inline placeholder SVGs (data URIs) used as the last-resort fallback. */
const FALLBACK_SOURCES = Object.freeze({
    [IMAGE_TYPES.PRODUCT]:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Product image placeholder">' +
            '<rect width="400" height="400" fill="#f3f4f6" />' +
            '<g fill="none" stroke="#9ca3af" stroke-width="2">' +
            '<path d="M120 140l40-40 80 80-40 40z" />' +
            '<circle cx="160" cy="160" r="14" />' +
            '</g>' +
            '<text x="200" y="330" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#6b7280">Product</text>' +
            '</svg>'
        ),
    [IMAGE_TYPES.MERCHANT]:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Merchant logo placeholder">' +
            '<rect width="400" height="400" fill="#eef2ff" />' +
            '<rect x="120" y="150" width="160" height="100" rx="12" fill="none" stroke="#6366f1" stroke-width="3" />' +
            '<text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#4338ca" font-weight="600">STORE</text>' +
            '<text x="200" y="330" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#6366f1">Merchant</text>' +
            '</svg>'
        ),
    [IMAGE_TYPES.USER_UPLOAD]:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="User upload placeholder">' +
            '<rect width="400" height="400" fill="#ecfdf5" />' +
            '<circle cx="200" cy="170" r="50" fill="none" stroke="#10b981" stroke-width="3" />' +
            '<path d="M140 290c20-40 60-60 60-60s40 20 60 60" fill="none" stroke="#10b981" stroke-width="3" />' +
            '<text x="200" y="345" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#047857">Your photo</text>' +
            '</svg>'
        ),
    [IMAGE_TYPES.TRYON_RESULT]:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Try-on result placeholder">' +
            '<rect width="400" height="400" fill="#fdf2f8" />' +
            '<path d="M170 120l60 0 0 50 30 0 0 130 -120 0 0 -130 30 0z" fill="none" stroke="#db2777" stroke-width="3" />' +
            '<text x="200" y="345" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#9d174d">Try-on result</text>' +
            '</svg>'
        ),
})

/** Generic fallback when the type is unknown. */
const GENERIC_FALLBACK =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="Image placeholder">' +
        '<rect width="400" height="400" fill="#f9fafb" />' +
        '<text x="200" y="210" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#6b7280">No image</text>' +
        '</svg>'
    )

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Coerce any value into a trimmed string ('' for nullish/non-strings). */
function toString(value) {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value.trim()
    return String(value).trim()
}

/**
 * Extract a protocol prefix (lowercased) from a URL.
 * Returns '' for protocol-relative URLs and null for relative paths.
 */
function getProtocol(url) {
    const match = /^([a-z][a-z0-9+.-]*:)\/\//i.exec(url)
    return match ? match[1].toLowerCase() : null
}

/** Returns true if the string looks like an absolute path on the local filesystem. */
function looksLikeFilesystemPath(url) {
    // Windows: C:\foo, C:/foo, \\server\share
    if (/^[a-zA-Z]:[\\/]/.test(url)) return true
    if (url.startsWith('\\\\')) return true
    // Unix absolute paths like /etc/passwd - only treat as filesystem when
    // the path has no scheme AND we are not in a browser environment.
    if (url.startsWith('/') && typeof window === 'undefined') return true
    return false
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate that an image URL is safe to load.
 * Accepts only http/https URLs (including protocol-relative `//host/...`).
 * Rejects: javascript:, data:, file://, vbscript:, ftp:, relative filesystem
 * paths and other unsafe schemes.
 *
 * @param {unknown} url
 * @returns {boolean}
 */
export function isValidImageUrl(url) {
    const value = toString(url)
    if (!value) return false
    if (looksLikeFilesystemPath(value)) return false

    const protocol = getProtocol(value)
    if (protocol === null) {
        // No scheme - must be a same-origin path (starts with `/` or is relative)
        return value.startsWith('/') || value.startsWith('./') || value.startsWith('../')
    }

    return protocol === 'http:' || protocol === 'https:'
}

/**
 * Normalize an image URL - handle relative paths, missing protocols and
 * trim whitespace. Returns `null` if the result would be unsafe.
 *
 * @param {unknown} url
 * @param {string} [baseUrl]
 * @returns {string|null}
 */
export function normalizeImageUrl(url, baseUrl = DEFAULT_BASE_URL) {
    const value = toString(url)
    if (!value) return null

    const protocol = getProtocol(value)

    // Already absolute http/https - just return it
    if (protocol === 'http:' || protocol === 'https:') {
        return value
    }

    // Protocol-relative (`//cdn.example.com/x.jpg`)
    if (value.startsWith('//')) {
        const base = toString(baseUrl)
        const baseProtocol = base ? getProtocol(base) || 'https:' : 'https:'
        return `${baseProtocol}${value}`
    }

    // Relative path - resolve against the base URL when provided
    if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
        if (!baseUrl) return value.startsWith('/') ? value : null
        try {
            return new URL(value, baseUrl).toString()
        } catch {
            return value.startsWith('/') ? value : null
        }
    }

    // Anything else (data:, blob:, javascript:, file://, ...) is rejected
    return null
}

/**
 * Get a fallback image (data URI) for a given image type.
 * Returns `null` only when the type is unknown AND no generic fallback is
 * desired. By default an unknown type returns the generic placeholder.
 *
 * @param {string} type
 * @returns {string|null}
 */
export function getFallbackImage(type) {
    if (!type) return GENERIC_FALLBACK
    return FALLBACK_SOURCES[type] || GENERIC_FALLBACK
}

/**
 * Determine if a URL points to a local upload (served by our backend).
 * Catches `/api/try-on/...`, `/uploads/...` and equivalent paths.
 *
 * @param {unknown} url
 * @returns {boolean}
 */
export function isLocalUpload(url) {
    const value = toString(url)
    if (!value) return false
    // Strip query string and hash before checking
    const path = value.split(/[?#]/)[0]
    return (
        path.startsWith('/api/try-on') ||
        path.startsWith('/api/uploads') ||
        path.startsWith('/uploads/') ||
        path.startsWith('/api/tryon/') ||
        path.startsWith('/api/user-uploads')
    )
}

/**
 * Resolve a raw image reference from the backend into a fully-formed,
 * safe-to-render object.
 *
 * @param {unknown} imageRef
 * @param {string} type
 * @returns {{ src: (string|null), isValid: boolean, isLocal: boolean, fallback: string|null, type: string }}
 */
export function resolveImageUrl(imageRef, type = IMAGE_TYPES.PRODUCT) {
    const safeType = VALID_TYPES.has(type) ? type : IMAGE_TYPES.PRODUCT
    const fallback = getFallbackImage(safeType)
    const raw = toString(imageRef)

    if (!raw) {
        return { src: fallback, isValid: false, isLocal: false, fallback, type: safeType }
    }

    const sanitized = sanitizeImageUrl(raw)
    if (!sanitized) {
        return { src: fallback, isValid: false, isLocal: false, fallback, type: safeType }
    }

    const isLocal = isLocalUpload(sanitized)
    const normalized = normalizeImageUrl(sanitized) || sanitized
    const isValid = isValidImageUrl(normalized) || isDataUrl(normalized)

    return {
        src: isValid ? normalized : fallback,
        isValid,
        isLocal,
        fallback,
        type: safeType,
    }
}

/**
 * Strip dangerous protocols from a URL. Returns a safe URL string or `null`
 * if the value cannot be made safe.
 *
 * @param {unknown} url
 * @returns {string|null}
 */
export function sanitizeImageUrl(url) {
    const value = toString(url)
    if (!value) return null

    // Explicitly allow data: URLs (placeholders, inline images)
    if (value.startsWith('data:image/')) return value

    const protocol = getProtocol(value)
    if (protocol === null) {
        // Protocol-less - only safe when it looks like a same-origin path
        if (value.startsWith('/') || value.startsWith('./') || value.startsWith('../')) {
            return value
        }
        return null
    }

    if (protocol === 'http:' || protocol === 'https:') return value

    // Any other scheme (javascript:, vbscript:, file://, ftp://, blob:, etc.) is rejected
    return null
}

/**
 * Check whether the given value is a `data:` URL (e.g. inline placeholder).
 *
 * @param {unknown} url
 * @returns {boolean}
 */
export function isDataUrl(url) {
    const value = toString(url)
    return value.startsWith('data:')
}

// ---------------------------------------------------------------------------
// Default export - convenient namespace
// ---------------------------------------------------------------------------

export default {
    IMAGE_TYPES,
    isValidImageUrl,
    normalizeImageUrl,
    getFallbackImage,
    isLocalUpload,
    resolveImageUrl,
    sanitizeImageUrl,
    isDataUrl,
}
