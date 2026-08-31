import { useEffect, useState } from 'react'
import { fetchProductById } from './productService'

// Module-level cache so the Product API is only hit once per product.
const productPreviewCache = new Map()

/**
 * Resolve a single product preview (image + name) via the existing Product API.
 * Failures resolve to null so order views never crash — just fall back to a placeholder.
 */
export async function resolveProductPreview(productId) {
  const key = Number(productId)
  if (productPreviewCache.has(key)) {
    return productPreviewCache.get(key)
  }

  const fallback = { image: null, name: null }
  try {
    const product = await fetchProductById(key)
    const preview = {
      image: product?.image || null,
      name: product?.name || null,
    }
    productPreviewCache.set(key, preview)
    return preview
  } catch {
    productPreviewCache.set(key, fallback)
    return fallback
  }
}

/**
 * React hook that resolves previews for every unique productId appearing in order items.
 * Returns a Map<productId, {image, name}>.
 */
export function useOrderProductPreviews(orderItems = []) {
  const productIds = [...new Set(orderItems.map((item) => Number(item.product_id)).filter(Boolean))]
  const [previews, setPreviews] = useState(() => new Map())

  useEffect(() => {
    let cancelled = false
    async function load() {
      const entries = await Promise.all(
        productIds.map(async (id) => [id, await resolveProductPreview(id)])
      )
      if (!cancelled) {
        setPreviews(new Map(entries))
      }
    }
    load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productIds.join(','), orderItems.length])

  return previews
}