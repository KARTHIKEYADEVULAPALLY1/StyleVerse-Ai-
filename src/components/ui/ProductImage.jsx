import { useEffect, useState, useCallback, useRef } from 'react'
import { ImageOff } from 'lucide-react'

// ---------------------------------------------------------------------------
// Image utility import with graceful fallback
// ---------------------------------------------------------------------------

import { resolveImageUrl, getFallbackImage } from '../../utils/image'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3
const RETRY_DELAY_BASE = 500 // ms - base delay before retry

const VALID_TYPES = new Set(['product', 'merchant', 'user-upload', 'tryon-result'])
const DEFAULT_TYPE = 'product'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Calculate delay for exponential backoff retry.
 * Adds jitter to prevent thundering herd on multiple failed images.
 */
function getRetryDelay(attemptIndex) {
  const baseDelay = RETRY_DELAY_BASE * Math.pow(2, attemptIndex)
  const jitter = Math.random() * 200
  return baseDelay + jitter
}

/**
 * Validate and normalize the type prop.
 */
function normalizeType(type) {
  if (VALID_TYPES.has(type)) return type
  return DEFAULT_TYPE
}

/**
 * Get Tailwind aspect ratio class from various input formats.
 * Accepts: '1/1', '4/5', '16:9', '3/4', etc.
 */
function getAspectRatioClass(aspectRatio) {
  if (!aspectRatio) return ''
  const match = String(aspectRatio).match(/^(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)$/)
  if (!match) return ''
  const [, w, h] = match
  return `aspect-[${w}/${h}]`
}

// ---------------------------------------------------------------------------
// ProductImage Component
// ---------------------------------------------------------------------------

/**
 * Consistent loading, failure handling, dimensions, lazy-loading and retry
 * logic for catalog media. Uses the centralized image utility for URL
 * validation and SVG fallbacks.
 *
 * @param {object} props
 * @param {string} [props.src] - Image URL (raw, may be relative/invalid)
 * @param {string} [props.alt=''] - Alt text for accessibility
 * @param {string} [props.className=''] - Additional classes for the img element
 * @param {string} [props.containerClassName=''] - Additional classes for the wrapper
 * @param {boolean} [props.eager=false] - Load immediately (above-fold images)
 * @param {boolean} [props.priority=false] - Alias for `eager` (industry standard)
 * @param {'product'|'merchant'|'user-upload'|'tryon-result'} [props.type='product'] - Image type for fallback selection
 * @param {string} [props.aspectRatio] - Reserve space (e.g., '1/1', '4/5', '3/4')
 * @param {number} [props.width] - Native width attribute
 * @param {number} [props.height] - Native height attribute
 */
export default function ProductImage({
  src,
  alt = '',
  className = '',
  containerClassName = '',
  eager = false,
  priority = false,
  type = DEFAULT_TYPE,
  aspectRatio,
  width,
  height,
  ...imgProps
}) {
  const [loadState, setLoadState] = useState(src ? 'loading' : 'error')
  const [retryCount, setRetryCount] = useState(0)
  const [resolvedSrc, setResolvedSrc] = useState(null)
  const [fallbackSrc, setFallbackSrc] = useState(null)
  const retryTimeoutRef = useRef(null)

  // Normalize props
  const safeType = normalizeType(type)
  const shouldLoadEagerly = priority || eager
  const aspectRatioClass = getAspectRatioClass(aspectRatio)

  // Resolve image URL on mount or when src/type changes
  useEffect(() => {
    if (!src) {
      setLoadState('error')
      setResolvedSrc(null)
      setFallbackSrc(getFallbackImage ? getFallbackImage(safeType) : null)
      return
    }

    // Use utility if available
    if (resolveImageUrl) {
      const result = resolveImageUrl(src, safeType)
      setResolvedSrc(result?.src || null)
      setFallbackSrc(result?.fallback || (getFallbackImage ? getFallbackImage(safeType) : null))
    } else {
      // Degraded mode: use src directly, generate simple fallback
      setResolvedSrc(src)
      setFallbackSrc(getFallbackImage ? getFallbackImage(safeType) : null)
    }

    setLoadState('loading')
    setRetryCount(0)
  }, [src, safeType])

  // Load image with retry logic
  const handleLoad = useCallback(() => {
    setLoadState('loaded')
  }, [])

  const handleError = useCallback(() => {
    if (retryCount < MAX_RETRIES - 1) {
      // Schedule retry with exponential backoff
      const delay = getRetryDelay(retryCount)
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1)
        // Force image reload by toggling state briefly
        setLoadState('retrying')
        setTimeout(() => setLoadState('loading'), 50)
      }, delay)
    } else {
      // Max retries reached - show fallback
      setLoadState('error')
    }
  }, [retryCount])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  // Determine image source to display
  const imageSrc = loadState === 'error' ? fallbackSrc : resolvedSrc

  const positionClass = /absolute|fixed|relative|sticky/.test(containerClassName) ? '' : 'relative'

  // Don't render img if no source
  if (!imageSrc) {
    return (
      <div
        className={`${positionClass} overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 ${containerClassName} ${aspectRatioClass}`}
        style={{ width, height }}
      >
        <div role="img" aria-label="Image unavailable" className="absolute inset-0 grid place-items-center text-center p-3 text-gray-500 dark:text-gray-400">
          <div>
            <ImageOff className="w-6 h-6 mx-auto mb-1" />
            <span className="text-xs font-medium">Image unavailable</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${positionClass} overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 ${containerClassName} ${aspectRatioClass}`}
      style={{ width, height }}
    >
      {/* Loading skeleton — visible only while image is still downloading */}
      {(loadState === 'loading' || loadState === 'retrying') && (
        <div
          aria-label="Loading product image"
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          {/* Shimmer skeleton */}
          <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
          </div>
          {/* Spinner */}
          <span className="relative z-10 w-7 h-7 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
        </div>
      )}

      {/* Image with fade-in transition */}
      <img
        src={imageSrc}
        alt={alt}
        loading={shouldLoadEagerly ? 'eager' : 'lazy'}
        decoding="async"
        fetchpriority={shouldLoadEagerly ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        width={width}
        height={height}
        className={`
                    ${className}
                    absolute inset-0 w-full h-full object-cover
                    transition-opacity duration-500 ease-out
                    ${loadState === 'loaded' ? 'opacity-100' : 'opacity-0'}
                `}
        {...imgProps}
      />

      {/* Error state with fallback (no spinner needed since fallback is shown) */}
      {loadState === 'error' && (
        <div
          role="img"
          aria-label={alt || 'Image unavailable'}
          className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 text-gray-500 dark:text-gray-400 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
        >
          <ImageOff className="w-8 h-8 mb-2 opacity-60" />
          <span className="text-xs font-medium opacity-60">Image unavailable</span>
        </div>
      )}
    </div>
  )
}
