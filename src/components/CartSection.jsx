import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

export default function CartSection() {
  const navigate = useNavigate()
  const { cartItems, totalItems, grandTotal, updateQuantity, removeFromCart, clearCart, placeOrder, placingOrder } = useCart()

  const handlePlaceOrder = async () => {
    const createdOrder = await placeOrder()
    if (createdOrder?.id) {
      navigate(`/order/${createdOrder.id}`)
    }
  }

  if (!cartItems.length) {
    return (
      <section id="cart" className="relative py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">Your cart is empty</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Add some pieces you love and they will appear here.
              </p>
              <MagneticButton
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow"
              >
                Continue Shopping
              </MagneticButton>
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
        <Reveal className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
              Your <span className="text-shine">Cart</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
              {totalItems} item{totalItems === 1 ? '' : 's'} selected
            </p>
          </div>
          <button
            type="button"
            onClick={clearCart}
            className="hidden sm:inline-flex items-center gap-2 rounded-full glass dark:glass px-4 py-2 text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear cart
          </button>
        </Reveal>

        <div className="grid lg:grid-cols-[1.5fr_0.7fr] gap-6">
          <div className="space-y-4">
            <AnimatePresence>
              {cartItems.map((item) => (
                <motion.div
                  key={`${item.productId}-${item.size}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="rounded-4xl glass dark:glass p-4 sm:p-5"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-32 h-32 overflow-hidden rounded-3xl">
                      <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-primary mb-1">{item.product.brand}</p>
                          <h3 className="text-xl font-semibold text-white">{item.product.name}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.productId, item.size)}
                          className="inline-flex items-center gap-2 text-sm text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <p>Price: <span className="font-semibold text-gray-900 dark:text-white">{item.product.price}</span></p>
                          <p>Size: <span className="font-semibold text-gray-900 dark:text-white">{item.size}</span></p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.size, -1)}
                            className="w-9 h-9 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="min-w-[2rem] text-center text-lg font-semibold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.productId, item.size, 1)}
                            className="w-9 h-9 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Subtotal</p>
                          <p className="mt-1 text-2xl font-bold text-white">₹{item.subtotal.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="rounded-4xl glass dark:glass p-6 h-fit">
            <h3 className="font-display text-2xl font-bold mb-6">Order Summary</h3>

            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimated Tax</span>
                <span>₹0</span>
              </div>
            </div>

            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                <span>Grand Total</span>
                <span className="text-3xl font-bold text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <MagneticButton
              onClick={handlePlaceOrder}
              className="mt-6 w-full px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow disabled:opacity-70"
              disabled={placingOrder}
            >
              {placingOrder ? 'Placing Order...' : 'Place Order'}
            </MagneticButton>
          </div>
        </div>
      </div>
    </section>
  )
}
