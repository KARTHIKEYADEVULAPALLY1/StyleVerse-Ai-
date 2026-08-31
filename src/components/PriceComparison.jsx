import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Check,
  Truck,
  Tag,
  Crown,
  Loader2,
  AlertTriangle,
  SearchX,
  Star,
  ExternalLink,
  Clock,
} from 'lucide-react'
import Reveal from './ui/Reveal'
import { fetchProductPrices, buildMerchantRedirectUrl } from '../services/productService'

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

/**
 * Human-friendly "last synced" label. No price history is stored yet, so we
 * only ever show the current price + when it was last updated — never a chart.
 */
function formatLastUpdated(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000)
  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  const hours = Math.floor(diffMinutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function MerchantLogo({ name, logoUrl, color }) {
  return (
    <div
      className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-display font-bold text-white text-sm shrink-0 overflow-hidden"
      style={{ backgroundColor: color }}
    >
      <span>{(name || '?').slice(0, 2).toUpperCase()}</span>
      {logoUrl && (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-contain p-1.5 bg-white"
          onError={(e) => {
            e.currentTarget.style.display = 'none'
          }}
        />
      )}
    </div>
  )
}

function AvailabilityChip({ available }) {
  return available ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold">
      <Truck className="w-3.5 h-3.5" />
      In Stock
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 dark:text-red-400 text-xs font-semibold">
      <AlertTriangle className="w-3.5 h-3.5" />
      Out of Stock
    </span>
  )
}

// Freshness grades come from the backend (derived from last_updated) so the
// UI never invents timestamps or implies live certainty about stale data.
const FRESHNESS_LABELS = {
  fresh: { label: 'Fresh', tone: 'bg-green-500/10 text-green-600 dark:text-green-400' },
  aging: { label: 'Aging', tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  stale: { label: 'Stale — verify before buying', tone: 'bg-red-500/10 text-red-500 dark:text-red-400' },
  unknown: { label: 'Unverified', tone: 'bg-gray-500/10 text-gray-500 dark:text-gray-400' },
}

function FreshnessChip({ freshness }) {
  const info = FRESHNESS_LABELS[freshness] || FRESHNESS_LABELS.unknown
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${info.tone}`}>
      <Clock className="w-3.5 h-3.5" />
      {info.label}
    </span>
  )
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

    return priceData.offers.map((offer) => {
      const merchantName = offer.merchant_name || offer.store
      const available = String(offer.availability || '').toLowerCase() === 'in stock'
      // Best price must always come from a currently available offer.
      const cheapest =
        available &&
        priceData.best_price != null &&
        Number(offer.price) === Number(priceData.best_price)
      // Always route through the tracked backend redirect (/api/redirect/{id})
      // so clicks are recorded; the backend forwards to the merchant's own
      // trusted product URL. Raw product_url is only a last-resort fallback.
      const outboundUrl = buildMerchantRedirectUrl(offer.visit_url) || offer.product_url

      return {
        ...offer,
        merchantName,
        available,
        cheapest,
        color: STORE_COLORS[offer.store] || '#6366F1',
        logoUrl: offer.merchant_logo || null,
        updatedLabel: formatLastUpdated(offer.last_updated),
        freshness: offer.freshness_status || 'unknown',
        outboundUrl,
        ctaLabel: offer.product_url ? `Buy from ${merchantName}` : `View on ${merchantName}`,
      }
    })
  }, [priceData])

  const inStockCount = offers.filter((offer) => offer.available).length
  const bestOffer = offers.find((offer) => offer.cheapest) || null
  // A single total offer gets neutral language - no comparison, no savings.
  const singleOfferMode = offers.length === 1

  // Only surface savings when there is an actual price difference.
  const savingsAmount =
    !singleOfferMode && priceData?.savings != null && Number(priceData.savings) > 0
      ? Number(priceData.savings)
      : null
  const savingsLabel =
    savingsAmount != null ? formatPrice(savingsAmount, priceData.currency || 'INR') : null

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
            {singleOfferMode
              ? 'This product is currently available at one store'
              : 'We scan every store to find you the best deal'}
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

        {/* Best Price summary - the decision step between product details and
            the full store-by-store comparison. */}
        {!loading && !error && bestOffer && (
          <Reveal>
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative rounded-4xl p-6 sm:p-8 mb-8 glass dark:glass glow-border shadow-glow overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-8">
                <MerchantLogo
                  name={bestOffer.merchantName}
                  logoUrl={bestOffer.logoUrl}
                  color={bestOffer.color}
                />

                <div className="flex-1 min-w-0">
                  {!singleOfferMode && (
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold">
                        <Crown className="w-3 h-3" />
                        BEST PRICE
                      </span>
                      {savingsLabel && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold">
                          <Tag className="w-3 h-3" />
                          Save {savingsLabel}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    {singleOfferMode
                      ? 'Current Price'
                      : `Lowest available · ${inStockCount} store${inStockCount > 1 ? 's' : ''} in stock`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-display text-4xl sm:text-5xl font-bold gradient-text">
                      {formatPrice(bestOffer.price, bestOffer.currency)}
                    </span>
                    <span className="text-base font-semibold text-gray-700 dark:text-gray-200">
                      at {bestOffer.merchantName}
                    </span>
                  </div>
                  {/* Never claim live certainty about stale data. */}
                  {(priceData?.best_price_verified === false || bestOffer.freshness === 'stale') && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      This price was last confirmed {bestOffer.updatedLabel || 'a while ago'} — availability may need verification.
                    </p>
                  )}
                </div>

                {bestOffer.outboundUrl && (
                  <a
                    href={bestOffer.outboundUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3.5 rounded-2xl btn-fashion text-white font-semibold shadow-glow min-h-[48px]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {singleOfferMode ? bestOffer.ctaLabel : `Buy from ${bestOffer.merchantName}`}
                  </a>
                )}
              </div>
            </motion.div>
          </Reveal>
        )}

        {!loading && !error && !bestOffer && inStockCount === 0 && offers.length > 0 && (
          <Reveal>
            <div className="rounded-4xl glass dark:glass px-6 py-4 mb-8 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                This product is currently out of stock across all listed stores.
              </p>
            </div>
          </Reveal>
        )}

        {!loading && !error && offers.length > 0 && (
          <div className="grid gap-4">
            {!singleOfferMode && (
              <Reveal>
                <h3 className="text-sm uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400 px-1">
                  Compare Stores
                </h3>
              </Reveal>
            )}
            {offers.map((store, i) => (
              <Reveal key={`${store.store}-${i}`} delay={i * 0.08}>
                <motion.div
                  whileHover={{ scale: store.available ? 1.02 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`relative rounded-4xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 transition-all duration-300 ${
                    store.cheapest
                      ? 'glass dark:glass glow-border shadow-glow'
                      : 'glass dark:glass'
                  } ${!store.available ? 'opacity-60 saturate-50' : ''}`}
                >
                  {store.cheapest && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.35, type: 'spring' }}
                      className="absolute -top-3 right-4 sm:-top-3 sm:-right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold shadow-lg"
                    >
                      <Crown className="w-3 h-3" />
                      BEST PRICE
                    </motion.div>
                  )}

                  <MerchantLogo name={store.merchantName} logoUrl={store.logoUrl} color={store.color} />

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg">{store.merchantName}</h3>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm">
                      <AvailabilityChip available={store.available} />
                      <FreshnessChip freshness={store.freshness} />
                      <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        {Number(store.rating).toFixed(1)}
                      </span>
                      {store.updatedLabel && (
                        <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          <Clock className="w-4 h-4" />
                          Updated {store.updatedLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-3">
                    <div>
                      <div
                        className={`font-display text-2xl font-bold ${
                          store.cheapest ? 'gradient-text' : ''
                        }`}
                      >
                        {formatPrice(store.price, store.currency)}
                      </div>
                      {store.cheapest && savingsLabel && (
                        <div className="text-xs text-green-500 font-semibold mt-1 flex items-center gap-1 sm:justify-end">
                          <Check className="w-3 h-3" />
                          Save {savingsLabel}
                        </div>
                      )}
                    </div>

                    {store.outboundUrl && store.available ? (
                      <a
                        href={store.outboundUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${store.ctaLabel} (opens in a new tab)`}
                        className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors min-h-[44px] ${
                          store.cheapest
                            ? 'btn-fashion text-white shadow-glow'
                            : 'glass dark:glass border border-white/10 hover:border-primary/40'
                        }`}
                      >
                        <ExternalLink className="w-4 h-4" />
                        {store.ctaLabel}
                      </a>
                    ) : (
                      <span
                        aria-disabled="true"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-red-500/10 text-red-500 dark:text-red-400 cursor-not-allowed min-h-[44px]"
                      >
                        <AlertTriangle className="w-4 h-4" />
                        Out of Stock
                      </span>
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

