import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, ChevronRight, Calendar, AlertTriangle, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchOrders } from '../services/orderService'
import { resolveProductPreview } from '../services/orderPreviewService'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

const statusStyles = {
  pending: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  processing: 'text-primary bg-primary/10 border-primary/20',
  delivered: 'text-green-500 bg-green-500/10 border-green-500/20',
  completed: 'text-green-500 bg-green-500/10 border-green-500/20',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/20',
  shipped: 'text-primary bg-primary/10 border-primary/20',
}

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatPrice(value) {
  if (value === null || value === undefined) return '—'
  const num = Number(String(value).replace(/[^\d.]/g, ''))
  if (isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

function OrderStatusBadge({ status }) {
  const normalized = (status || 'pending').toLowerCase()
  const statusClass = statusStyles[normalized] || 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold capitalize ${statusClass}`}>
      {status || 'Pending'}
    </span>
  )
}

function OrderCardSkeleton({ index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="rounded-4xl glass dark:glass p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse shrink-0" />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-3 w-56 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="space-y-2">
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
            <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
        </div>
      </div>
    </motion.div>
  )
}

export default function OrderHistory() {
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [previews, setPreviews] = useState({})

  // Load real orders from the existing Orders API
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      setError('Please log in to view your orders.')
      return
    }

    let cancelled = false

    async function loadOrders() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchOrders(token)
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load your orders.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOrders()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, token])

  // Fetch product preview images (first item per order) using the existing Product API.
  useEffect(() => {
    if (!orders.length) return
    let cancelled = false
    const seen = new Set()

    async function loadPreviews() {
      const nextPreviews = {}
      await Promise.all(
        orders.map(async (order) => {
          const firstItem = order.items?.[0]
          if (!firstItem) return
          const productId = Number(firstItem.product_id)
          if (seen.has(productId)) return
          seen.add(productId)
          const preview = await resolveProductPreview(productId)
          if (!cancelled && preview?.image) {
            nextPreviews[order.id] = preview.image
          }
        })
      )
      if (!cancelled) {
        setPreviews(nextPreviews)
      }
    }

    loadPreviews()
    return () => {
      cancelled = true
    }
  }, [orders])

  if (loading) {
    return (
      <section className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-10">
            <div className="h-10 w-56 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
            <div className="mt-3 h-4 w-72 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <OrderCardSkeleton key={i} index={i} />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-10 text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Unable to load orders</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm max-w-md mx-auto mb-6">{error}</p>
              <MagneticButton
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-2xl glass dark:glass font-semibold text-sm"
              >
                Try Again
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  if (!orders.length) {
    return (
      <section className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
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
                  <Package className="w-10 h-10 text-primary" />
                </motion.div>
                <h3 className="font-display text-3xl font-bold mb-3">No orders yet</h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8">
                  Start exploring your style. When you place an order, it will appear here.
                </p>
                <MagneticButton
                  onClick={() => navigate('/')}
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
    <section className="min-h-screen pt-28 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Reveal className="mb-10">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-4xl sm:text-5xl font-bold">
              Order <span className="text-shine">History</span>
            </h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold">
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            View and track all your past purchases.
          </p>
        </Reveal>

        <div className="space-y-4">
          {orders.map((order, i) => {
            const itemCount = Array.isArray(order.items)
              ? order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
              : 0
            const previewImage = previews[order.id]

            return (
              <motion.button
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                onClick={() => navigate(`/order/${order.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/order/${order.id}`)
                  }
                }}
                className="w-full text-left rounded-4xl glass dark:glass p-5 sm:p-6 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-300 group cursor-pointer"
                aria-label={`View details for order ${order.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Product image preview */}
                    <div className="w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                      {previewImage ? (
                        <img src={previewImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-primary/60" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-2">
                        Order #{order.id}
                        <span className="lg:hidden">
                          <OrderStatusBadge status={order.status} />
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(order.created_at)} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <div className="font-bold text-base sm:text-lg">{formatPrice(order.total_amount)}</div>
                      <div className="mt-1 hidden sm:block">
                        <OrderStatusBadge status={order.status} />
                      </div>
                    </div>
                    <div className="inline-flex items-center text-xs font-semibold text-primary gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </section>
  )
}