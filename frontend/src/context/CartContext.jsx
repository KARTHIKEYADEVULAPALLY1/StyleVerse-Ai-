import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { addCartItem, fetchCart, removeCartItem, updateCartItem } from '../services/cartService'
import { createOrder } from '../services/orderService'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { token, isAuthenticated } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [placingOrder, setPlacingOrder] = useState(false)
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
      setItems([])
      setError(err.message || 'Unable to load cart.')
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
    } catch (err) {
      setError(err.message || 'Unable to add product to cart.')
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
      setError(err.message || 'Unable to update quantity.')
    }
  }

  const removeFromCart = async (productId, size) => {
    if (!isAuthenticated || !token) return

    try {
      await removeCartItem(token, Number(productId), { selected_size: size })
      setItems((prev) =>
        prev.filter(
          (item) => !(Number(item.product_id) === Number(productId) && item.selected_size === size)
        )
      )
      setError(null)
    } catch (err) {
      setError(err.message || 'Unable to remove product from cart.')
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
    } catch (err) {
      setError(err.message || 'Unable to clear cart.')
    }
  }

  const placeOrder = async () => {
    if (!isAuthenticated || !token) return null

    try {
      setPlacingOrder(true)
      setError(null)
      const createdOrder = await createOrder(token)
      setItems([])
      return createdOrder
    } catch (err) {
      setError(err.message || 'Unable to place order.')
      return null
    } finally {
      setPlacingOrder(false)
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
    placingOrder,
    error,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)

  if (!context) {
    throw new Error('useCart must be used within CartProvider')
  }

  return context
}
