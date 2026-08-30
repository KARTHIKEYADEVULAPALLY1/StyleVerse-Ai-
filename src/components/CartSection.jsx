import { useState } from 'react'
import { Minus, Plus, ShoppingBag, Trash2, ArrowRight, Package, Loader2, ShoppingBasket } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import ProductImage from './ui/ProductImage'

export default function CartSection() {
  const navigate = useNavigate()
  const {
    cartItems,
    totalItems,
    grandTotal,
    updateQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
    placingOrder,
    error,
  } = useCart()

  const [updatingKey, setUpdatingKey] = useState(null)

  const handleUpdateQuantity = async (item, delta) => {
    // Disable this item's controls while the API request is in-flight.
    setUpdatingKey(`${item.productId}-${item.size}`)
    try {
      await updateQuantity(item.productId, item.size, delta)
    } finally {
      setUpdatingKey(null)
    }
  }

  const handleRemoveItem = async (item) => {
    setUpdatingKey(`${item.productId}-${item.size}`)
    try {
      await removeFromCart(item.productId, item.size)
    } finally {
      setUpdatingKey(null)
    }
  }

  const handlePlaceOrder = async () => {
    if (placingOrder) return
    const createdOrder = await placeOrder()
    if (createdOrder?.id) {
      navigate(`/order/${createdOrder.id}`)
    }
  }

  const handleContinueShopping = () => {
    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
  }

  const subtotal = grandTotal

  // Empty cart state
  if (!cartItems.length) {
    return (
      <section id="cart" className="relative py-24 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-10 sm:p-16 text-center relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 blur-3xl" />
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                  className="w-24 h-24 rounded-4xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-8"
                >
                  <ShoppingBag className="w-10 h-10 text-primary" />
                </motion.div>
                <h3 className="font-display text-3xl font-bold mb-3">Your cart is empty</h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">
                  Add some pieces you love and they will appear here ready for checkout.
                </p>
                <MagneticButton
                  onClick={handleContinueShopping}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  return (
    <section id="cart" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ===== Cart Header ===== */}
        <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
                Your <span className="text-shine">Cart</span>
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 font-light">
              Review your selections and complete your order.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MagneticButton
              onClick={handleContinueShopping}
              className="inline-flex items-center gap-2 rounded-full glass dark:glass px-4 py-2 text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
            >
              <ShoppingBasket className="w-4 h-4" />
              Continue Shopping
            </MagneticButton>
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center gap-2 rounded-full glass dark:glass px-4 py-2 text-sm font-medium hover:bg-red-500/10 hover:text-red-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label="Clear the entire cart"
            >
              <Trash2 className="w-4 h-4" />
              Clear cart
            </button>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-[1.5fr_0.7fr] gap-6 lg:items-start">
          {/* ===== Cart Items ===== */}
          <div className="space-y-4">
            <AnimatePresence initial={false}>
              {cartItems.map((item, index) => {
                const key = `${item.productId}-${item.size}`
                const isUpdating = updatingKey === key

                return (
                  <motion.div
                    key={key}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -40, transition: { duration: 0.3 } }}
                    transition={{ delay: index * 0.05, duration: 0.4 }}
                    className={`rounded-4xl glass dark:glass p-4 sm:p-5 transition-opacity duration-300 ${isUpdating ? 'opacity-60 pointer-events-none' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Image */}
                      <div className="relative w-full sm:w-32 h-44 sm:h-32 overflow-hidden rounded-3xl bg-white/5 shrink-0">
                        <ProductImage src={item.product.image} alt={item.product.name} containerClassName="w-full h-full" className="w-full h-full object-cover" />
                      </div>

                      {/* Details */}
                      <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1.5">
                              {item.product.brand}
                              {item.product.category ? ` · ${item.product.category}` : ''}
                            </p>
                            <h3 className="text-lg font-semibold leading-snug">{item.product.name}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item)}
                            disabled={isUpdating || placingOrder}
                            className="inline-flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 disabled:opacity-40 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shrink-0"
                            aria-label={`Remove ${item.product.name} from cart`}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </div>

                        <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            <span>Size:</span>
                            <span className="font-semibold px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              {item.size}
                            </span>
                          </div>
                          <p>
                            Price: <span className="font-semibold">{item.product.price}</span>
                          </p>
                        </div>

                        <div className="mt-auto pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          {/* Quantity selector */}
                          <div className="inline-flex items-center gap-2 self-start sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item, -1)}
                              disabled={isUpdating || placingOrder || item.quantity <= 1}
                              className="w-9 h-9 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              aria-label={`Decrease quantity of ${item.product.name}`}
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <AnimatePresence mode="popLayout" initial={false}>
                              <motion.span
                                key={item.quantity}
                                initial={{ opacity: 0, y: -8, scale: 0.8 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.8 }}
                                transition={{ duration: 0.2 }}
                                className="min-w-[2.5rem] text-center text-lg font-semibold"
                              >
                                {item.quantity}
                              </motion.span>
                            </AnimatePresence>
                            <button
                              type="button"
                              onClick={() => handleUpdateQuantity(item, 1)}
                              disabled={isUpdating || placingOrder}
                              className="w-9 h-9 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              aria-label={`Increase quantity of ${item.product.name}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Subtotal */}
                          <div className="text-left sm:text-right">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                              Subtotal
                            </p>
                            <p className="mt-1 text-xl font-bold">
                              ₹{item.subtotal.toLocaleString('en-IN')}
                            </p>
                            {item.quantity > 1 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {item.unitPrice.toLocaleString('en-IN')} each
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>

          {/* ===== Order Summary ===== */}
          <div className="lg:sticky lg:top-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-4xl glass dark:glass p-6"
            >
              <h3 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                Order Summary
              </h3>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                  <span className="font-semibold text-white">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-green-500">Free</span>
                </div>
                {/* No discount row — we never invent discounts. */}
              </div>

              {error && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="mt-6 border-t border-white/10 pt-5">
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                  <span className="font-medium">Total</span>
                  <div className="text-right">
                    <span className="text-3xl font-bold text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
                    {subtotal !== grandTotal && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">including shipping</p>
                    )}
                  </div>
                </div>
              </div>

              <MagneticButton
                onClick={handlePlaceOrder}
                className="mt-6 w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow disabled:opacity-70"
                disabled={placingOrder}
              >
                {placingOrder ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Placing Order…
                  </>
                ) : (
                  <>
                    Place Order
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </MagneticButton>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
