import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from '../services/cartService'
import { trackCartAdded, trackCartRemoved } from '../services/analyticsService'
import { useToast } from '../components/ui/Toast'
import { getErrorMessage } from '../services/apiClient'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refreshCart = async (currentToken) => {
    if (!currentToken) {
      setItems([])
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await fetchCart(currentToken)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      // Silent failure on initial load — don't spam toasts
      setItems([])
      setError(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setItems([])
      setError(null)
      return
    }

    refreshCart(token)
  }, [isAuthenticated, token])

  const cartItems = useMemo(
    () =>
      items.map((item) => {
        const product = item.product
        if (!product) return null

        const productId = Number(item.product_id ?? product.id)
        const size = item.selected_size ?? item.size ?? 'One Size'
        const quantity = Number(item.quantity ?? 1)
        const unitPrice = Number(String(product.price).replace(/[^\d]/g, '')) || 0

        return {
          ...item,
          productId,
          size,
          quantity,
          product,
          unitPrice,
          subtotal: unitPrice * quantity,
        }
      }).filter(Boolean),
    [items]
  )

  const addToCart = async (product, size, quantity = 1) => {
    if (!product || !size || !isAuthenticated || !token) return

    try {
      const payload = { product_id: Number(product.id), quantity: Number(quantity), selected_size: size }
      const savedItem = await addCartItem(token, payload)
      trackCartAdded(savedItem.product_id, { quantity: Number(quantity), size })
      setItems((prev) => {
        const matchIndex = prev.findIndex(
          (item) => Number(item.product_id) === Number(savedItem.product_id) && item.selected_size === savedItem.selected_size
        )

        if (matchIndex >= 0) {
          const next = [...prev]
          next[matchIndex] = savedItem
          return next
        }

        return [...prev, savedItem]
      })
      setError(null)
      toast.success('Added to cart')
    } catch (err) {
      setError(getErrorMessage(err))
      toast.error(getErrorMessage(err))
    }
  }

  const updateQuantity = async (productId, size, delta) => {
    if (!isAuthenticated || !token) return

    const currentItem = items.find(
      (item) => Number(item.product_id) === Number(productId) && item.selected_size === size
    )

    if (!currentItem) return

    const nextQuantity = Number(currentItem.quantity) + Number(delta)
    if (nextQuantity <= 0) {
      await removeFromCart(productId, size)
      return
    }

    try {
      const updatedItem = await updateCartItem(token, Number(productId), {
        quantity: nextQuantity,
        selected_size: size,
      })
      setItems((prev) =>
        prev.map((item) =>
          Number(item.product_id) === Number(productId) && item.selected_size === size ? updatedItem : item
        )
      )
      setError(null)
    } catch (err) {
      setError(getErrorMessage(err))
      toast.error(getErrorMessage(err))
    }
  }

  const removeFromCart = async (productId, size) => {
    if (!isAuthenticated || !token) return

    try {
      await removeCartItem(token, Number(productId), { selected_size: size })
      trackCartRemoved(productId)
      setItems((prev) =>
        prev.filter(
          (item) => !(Number(item.product_id) === Number(productId) && item.selected_size === size)
        )
      )
      setError(null)
      toast.success('Removed from cart')
    } catch (err) {
      setError(getErrorMessage(err))
      toast.error(getErrorMessage(err))
    }
  }

  const clearCart = async () => {
    if (!isAuthenticated || !token || !items.length) return

    try {
      await Promise.all(
        items.map((item) =>
          removeCartItem(token, Number(item.product_id), { selected_size: item.selected_size })
        )
      )
      setItems([])
      setError(null)
      toast.success('Cart cleared')
    } catch (err) {
      setError(getErrorMessage(err))
      toast.error(getErrorMessage(err))
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const grandTotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0)

  const value = {
    items,
    cartItems,
    totalItems,
    grandTotal,
    loading,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    return {
      items: [],
      cartItems: [],
      totalItems: 0,
      grandTotal: 0,
      loading: false,
      error: null,
      addToCart: async () => {},
      updateQuantity: async () => {},
      removeFromCart: async () => {},
      clearCart: async () => {},
    }
  }
  return context
}
