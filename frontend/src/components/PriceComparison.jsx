import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Truck,
  Tag,
  BadgePercent,
  Crown,
  Loader2,
  AlertTriangle,
  SearchX,
  Star,
} from 'lucide-react'
import Reveal from './ui/Reveal'
import { fetchProductPrices } from '../services/productService'

const STORE_COLORS = {
  Amazon: '#FF9900',
  Myntra: '#FF3F6C',
  Ajio: '#2E5BFF',
  Flipkart: '#2874F0',
}

function formatPrice(amount, currency = 'INR') {
  if (amount == null) return '—'
  if (currency === 'INR') {
    return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export default function PriceComparison({ productId }) {
  const [priceData, setPriceData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPrices() {
      if (!productId) {
        setPriceData(null)
        setError(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const data = await fetchProductPrices(productId)
        if (!cancelled) {
          setPriceData(data)
        }
      } catch (err) {
        if (!cancelled) {
          setPriceData(null)
          setError(err.message || 'Unable to load price comparison.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadPrices()
    return () => {
      cancelled = true
    }
  }, [productId])

  const offers = useMemo(() => {
    if (!priceData?.offers?.length) return []

    return priceData.offers.map((offer) => ({
      ...offer,
      cheapest:
        priceData.best_price != null &&
        offer.availability.toLowerCase() === 'in stock' &&
        offer.price === priceData.best_price,
      color: STORE_COLORS[offer.store] || '#6366F1',
    }))
  }, [priceData])

  const savingsLabel = priceData?.savings
    ? formatPrice(priceData.savings, priceData.currency || 'INR')
    : null

  return (
    <section id="compare" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            Smart <span className="text-shine">Price Comparison</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
            We scan every store to find you the best deal
          </p>
        </Reveal>

        {loading && (
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">Loading store prices…</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Comparing offers across partner stores.
              </p>
            </div>
          </Reveal>
        )}

        {!loading && error && (
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">Unable to load prices</h3>
              <p className="text-gray-600 dark:text-gray-300">{error}</p>
            </div>
          </Reveal>
        )}

        {!loading && !error && !offers.length && (
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <SearchX className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">No store offers available</h3>
              <p className="text-gray-600 dark:text-gray-300">
                This product does not have comparable store pricing yet.
              </p>
            </div>
          </Reveal>
        )}

        {!loading && !error && offers.length > 0 && (
          <div className="grid gap-4">
            {offers.map((store, i) => (
              <Reveal key={`${store.store}-${i}`} delay={i * 0.1}>
                <motion.div
                  whileHover={{ scale: 1.02, x: 10 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`relative rounded-4xl p-6 flex items-center gap-6 transition-all duration-300 ${
                    store.cheapest
                      ? 'glass dark:glass glow-border shadow-glow'
                      : 'glass dark:glass'
                  }`}
                >
                  {store.cheapest && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5, type: 'spring' }}
                      className="absolute -top-3 -right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold shadow-lg"
                    >
                      <Crown className="w-3 h-3" />
                      BEST PRICE
                    </motion.div>
                  )}

                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-white text-sm shrink-0"
                    style={{ backgroundColor: store.color }}
                  >
                    {store.store.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{store.store}</h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm">
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <Truck className="w-4 h-4" />
                        {store.availability}
                      </span>
                      <span className="flex items-center gap-1 text-green-500">
                        <Star className="w-4 h-4 fill-green-500" />
                        {store.rating}
                      </span>
                      {store.cheapest && savingsLabel ? (
                        <span className="flex items-center gap-1 text-primary">
                          <Tag className="w-4 h-4" />
                          Save {savingsLabel}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <BadgePercent className="w-4 h-4" />
                          Compare offers
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-display text-2xl font-bold ${store.cheapest ? 'gradient-text' : ''}`}>
                      {formatPrice(store.price, store.currency)}
                    </div>
                    {store.cheapest && savingsLabel && (
                      <div className="text-xs text-green-500 font-semibold mt-1 flex items-center gap-1 justify-end">
                        <Check className="w-3 h-3" />
                        Save {savingsLabel}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
