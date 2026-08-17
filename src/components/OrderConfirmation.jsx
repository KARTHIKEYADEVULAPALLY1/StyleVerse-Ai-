import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fetchOrderById } from '../services/orderService'

export default function OrderConfirmation() {
  const { id } = useParams()
  const { token, isAuthenticated } = useAuth()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      setError('Please log in to view your order details.')
      return
    }

    let cancelled = false

    async function loadOrder() {
      try {
        const data = await fetchOrderById(token, id)
        if (!cancelled) {
          setOrder(data)
          setError(null)
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
          <p className="text-sm uppercase tracking-[0.2em] text-primary">Loading order</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4 py-16">
        <div className="rounded-4xl glass dark:glass p-8 text-center max-w-lg">
          <p className="text-red-400 font-medium">{error}</p>
          <Link to="/" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-3 text-white font-semibold">
            Continue Shopping
          </Link>
        </div>
      </section>
    )
  }

  if (!order) {
    return null
  }

  return (
    <section className="min-h-screen py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-4xl glass dark:glass p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Order confirmed</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold">Thank you for your purchase</h1>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Order ID</p>
              <p className="mt-2 text-xl font-semibold">#{order.id}</p>
            </div>
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Status</p>
              <p className="mt-2 text-xl font-semibold capitalize">{order.status}</p>
            </div>
            <div className="rounded-3xl bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Total</p>
              <p className="mt-2 text-xl font-semibold">{order.total_amount}</p>
            </div>
          </div>

          <div className="space-y-4">
            {order.items.map((item) => (
              <div key={`${item.id}-${item.product_id}`} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-3xl bg-white/5 p-4">
                <div>
                  <p className="text-lg font-semibold">{item.product_name}</p>
                  <p className="text-sm text-gray-400">Size: {item.selected_size} · Qty: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Unit price</p>
                  <p className="font-semibold">{item.price_at_purchase}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-3 border-t border-white/10 pt-6">
            <p className="text-sm text-gray-400">Ordered on {new Date(order.created_at).toLocaleString()}</p>
            <Link to="/" className="inline-flex justify-center rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-3 text-white font-semibold">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
