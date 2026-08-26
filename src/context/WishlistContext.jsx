import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import {
  addProductToWishlist,
  fetchWishlist,
  removeProductFromWishlist,
} from '../services/wishlistService'
import { trackWishlistAdded, trackWishlistRemoved } from '../services/analyticsService'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const [wishlistProducts, setWishlistProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshWishlist = async (currentToken) => {
    if (!currentToken) {
      setWishlistProducts([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await fetchWishlist(currentToken)
      setWishlistProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setWishlistProducts([])
      setError(err.message || 'Unable to load wishlist.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setWishlistProducts([])
      setError(null)
      return
    }

    refreshWishlist(token)
  }, [isAuthenticated, token])

  const wishlistIds = useMemo(
    () => wishlistProducts.map((product) => Number(product.id)).filter(Number.isFinite),
    [wishlistProducts]
  )

  const isInWishlist = (productId) => wishlistIds.includes(Number(productId))

  const addToWishlist = async (product) => {
    if (!product || !isAuthenticated || !token) {
      return
    }

    try {
      const savedProduct = await addProductToWishlist(token, Number(product.id))
      trackWishlistAdded(savedProduct.id)
      setWishlistProducts((prev) => {
        if (prev.some((item) => Number(item.id) === Number(savedProduct.id))) {
          return prev
        }
        return [...prev, savedProduct]
      })
      setError(null)
    } catch (err) {
      setError(err.message || 'Unable to add product to wishlist.')
    }
  }

  const removeFromWishlist = async (productId) => {
    if (!isAuthenticated || !token) {
      return
    }

    try {
      await removeProductFromWishlist(token, Number(productId))
      trackWishlistRemoved(productId)
      setWishlistProducts((prev) => prev.filter((item) => Number(item.id) !== Number(productId)))
      setError(null)
    } catch (err) {
      setError(err.message || 'Unable to remove product from wishlist.')
    }
  }

  const toggleWishlist = async (product) => {
    if (!product || !isAuthenticated || !token) {
      return
    }

    if (isInWishlist(product.id)) {
      await removeFromWishlist(product.id)
      return
    }

    await addToWishlist(product)
  }

  const value = {
    wishlistIds,
    wishlistProducts,
    loading,
    error,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
  }

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const context = useContext(WishlistContext)

  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }

  return context
}
