import { useEffect, useState } from 'react'
import { ArrowLeft, CheckCircle2, Package, AlertTriangle, Clock, Loader2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchOrderById } from '../services/orderService'
import { useOrderProductPreviews } from '../services/orderPreviewService'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import ProductImage from './ui/ProductImage'

const statusStyles = {
  pending: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  processing: 'text-primary bg-primary/10 border-primary/20',
  delivered: 'text-green-500 bg-green-500/10 border-green-500/20',
  completed: 'text-green-500 bg-green-500/10 border-green-500/20',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/20',
  shipped: 'text-primary bg-primary/10 border-primary/20',
}

const statusIcons = {
  pending: Clock,
  processing: Clock,
  shipped: Package,
  delivered: CheckCircle2,
  completed: CheckCircle2,
  cancelled: AlertTriangle,
}

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
  const StatusIcon = statusIcons[normalized] || Package
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold capitalize ${statusClass}`}>
      <StatusIcon className="w-3.5 h-3.5" />
      {status || 'Pending'}
    </span>
  )
}

function TimelineStep({ icon: Icon, title, description, active, isLast }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
            active
              ? 'bg-gradient-to-br from-primary to-secondary text-white border-transparent shadow-glow'
              : 'bg-white/5 text-gray-400 border-white/10'
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-gradient-to-b from-primary/40 to-white/10 my-1" />}
      </div>
      <div className="pb-8">
        <p className={`font-semibold ${active ? 'text-white' : 'text-gray-400'}`}>{title}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
    </div>
  )
}

function OrderTimeline({ status }) {
  const normalized = (status || 'pending').toLowerCase()

  // Only render the timeline for statuses the backend actually produces.
  // The backend currently sets 'pending' on creation; delivered/completed/cancelled
  // are styled for forward-compatibility without inventing states.
  const steps = [
    { icon: CheckCircle2, title: 'Order Placed', description: 'Your order has been created' },
    { icon: Clock, title: 'Pending', description: 'Waiting for processing' },
  ]

  if (['delivered', 'completed'].includes(normalized)) {
    steps.push({ icon: CheckCircle2, title: 'Completed', description: 'Your order is complete' })
  }
  if (normalized === 'cancelled') {
    steps.push({ icon: AlertTriangle, title: 'Cancelled', description: 'This order was cancelled' })
  }
  if (normalized === 'processing') {
    steps.push({ icon: Package, title: 'Processing', description: 'Your items are being prepared' })
  }

  const activeIndex =
    normalized === 'pending' ? 1 : ['processing', 'delivered', 'completed', 'shipped'].includes(normalized) ? 2 : normalized === 'cancelled' ? 2 : 0

  return (
    <div className="rounded-4xl glass dark:glass p-6">
      <h3 className="font-display text-lg font-bold mb-6">Order Status</h3>
      <div className="flex flex-col">
        {steps.map((step, i) => (
          <TimelineStep
            key={step.title}
            icon={step.icon}
            title={step.title}
            description={step.description}
            active={i <= activeIndex}
            isLast={i === steps.length - 1}
          />
        ))}
      </div>
    </div>
  )
}

export default function OrderConfirmation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { token, isAuthenticated } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const previews = useOrderProductPreviews(order?.items || [])

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      setError('Please log in to view your order details.')
      return
    }

    let cancelled = false

    async function loadOrder() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchOrderById(token, id)
        if (!cancelled) {
          setOrder(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load order details.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOrder()
    return () => {
      cancelled = true
    }
  }, [id, isAuthenticated, token])

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="rounded-4xl glass dark:glass p-8 text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Loading order</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="rounded-4xl glass dark:glass p-8 text-center max-w-lg">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-500" />
          </div>
          <h3 className="font-display text-xl font-bold mb-2">Unable to load this order</h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <MagneticButton
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-2xl glass dark:glass font-semibold text-sm"
            >
              Try Again
            </MagneticButton>
            <Link to="/orders" className="inline-flex justify-center items-center px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm">
              Back to Orders
            </Link>
          </div>
        </div>
      </section>
    )
  }

  if (!order) {
    return null
  }

  const preview = previews.get(Number(order.items?.[0]?.product_id)) || {}

  return (
    <section className="min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <button
            type="button"
            onClick={() => navigate('/orders')}
            className="inline-flex items-center gap-2 rounded-full glass dark:glass px-4 py-2 text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </button>
        </Reveal>

        <Reveal className="mb-8">
          <div className="rounded-4xl glass dark:glass p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                {preview?.image ? (
                  <ProductImage src={preview.image} alt="" containerClassName="w-full h-full rounded-2xl" className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-6 h-6 text-primary" />
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-primary">Order details</p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1">Order #{order.id}</h1>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 mb-8">
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Date</p>
                <p className="mt-2 text-sm font-medium">{formatDate(order.created_at)}</p>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Status</p>
                <div className="mt-2">
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
              <div className="rounded-3xl bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Total</p>
                <p className="mt-2 text-xl font-bold">{formatPrice(order.total_amount)}</p>
              </div>
            </div>

            <h3 className="font-display text-xl font-bold mb-4">Products</h3>
            <div className="space-y-4">
              {order.items.map((item) => {
                const itemPreview = previews.get(Number(item.product_id)) || {}
                const itemSubtotal = Number(item.price_at_purchase?.replace(/[^\d.]/g, '')) * item.quantity

                return (
                  <div key={`${item.id}-${item.product_id}`} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl bg-white/5 p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-16 shrink-0 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                        {itemPreview.image ? (
                          <ProductImage src={itemPreview.image} alt={item.product_name} containerClassName="w-full h-full" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-primary/60" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{item.product_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          Size: {item.selected_size} · Qty: {item.quantity}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatPrice(item.price_at_purchase)} each
                      </p>
                      <p className="font-semibold mt-0.5">
                        Subtotal: {formatPrice(itemSubtotal)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 flex items-center justify-between">
              <span className="text-sm text-gray-500 dark:text-gray-400">Final Total</span>
              <span className="text-2xl font-bold">{formatPrice(order.total_amount)}</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <OrderTimeline status={order.status} />
        </Reveal>
      </div>
    </section>
  )
}
