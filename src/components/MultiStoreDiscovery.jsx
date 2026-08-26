import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Globe,
  Search,
  Store,
  Layers,
  Star,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Reveal from './ui/Reveal'
import ProductSkeleton from './ui/ProductSkeleton'
import { EmptyState, ErrorState } from './ui/ProductState'
import { fetchDiscovery } from '../services/productService'

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Lowest Price' },
  { value: 'rating_desc', label: 'Highest Rating' },
]

const EXAMPLE_QUERIES = [
  'black formal dress',
  'casual outfit under ₹3000',
  'party wear',
  'minimalist jacket',
]

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
 * "casual outfit under ₹3000" -> { text: 'casual outfit', maxPrice: 3000 }.
 * Budget phrases are turned into the API's max_price filter so semantic
 * search only receives the fashion intent, not the price clause.
 */
function parseBudgetFromQuery(rawQuery) {
  const query = String(rawQuery || '')
  const match = query.match(/\bunder\s*(?:₹|rs\.?|inr)?\s*([\d,]+)\b/i)
  if (!match) return { text: query.trim(), maxPrice: null }
  const maxPrice = Number(match[1].replace(/,/g, ''))
  const text = query.replace(match[0], '').trim()
  return { text, maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null }
}

function DiscoveryCard({ product, index }) {
  const navigate = useNavigate()
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  if (!product) return null

  const best = product.best_offer
  const offerCount = Number(product.offer_count || 0)

  const openComparison = () => {
    navigate(`/product/${product.id}`)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.06, 0.4), duration: 0.5 }}
      className="h-full"
    >
      <div
        className="group relative cursor-pointer rounded-4xl overflow-hidden glass dark:glass h-full flex flex-col transition-all duration-500 hover:shadow-glow hover:-translate-y-1.5"
        onClick={openComparison}
        role="button"
        tabIndex={0}
        aria-label={`Compare prices for ${product.name} across ${offerCount} stores`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openComparison()
          }
        }}
      >
        {/* ===== Image ===== */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-900">
          {!imageError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
              <Store className="w-10 h-10 text-primary/40" />
            </div>
          )}
          {offerCount > 0 && (
            <div className="absolute bottom-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[11px] font-semibold">
              <Layers className="w-3 h-3" />
              {offerCount} {offerCount === 1 ? 'store' : 'stores'}
            </div>
          )}
        </div>

        {/* ===== Content ===== */}
        <div className="p-4 sm:p-5 flex flex-col flex-1">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs sm:text-sm font-semibold text-primary truncate">
              {product.brand}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">{Number(product.rating).toFixed(1)}</span>
            </div>
          </div>

          <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1">{product.name}</h3>
          {product.category && (
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              {product.category}
            </p>
          )}

          {/* Best available multi-store price */}
          <div className="mt-auto pt-2 mb-3">
            {best ? (
              <>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-0.5">
                  Best price at {best.merchant_name}
                </p>
                <span className="font-display text-xl sm:text-2xl font-bold gradient-text">
                  {formatPrice(best.price, best.currency)}
                </span>
              </>
            ) : (
              <p className="text-sm text-red-500 dark:text-red-400 font-medium">Out of stock everywhere</p>
            )}
          </div>

          {/* Primary discovery action -> existing Product Details + Price Comparison */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openComparison()
            }}
            disabled={!best}
            aria-label={`Compare prices for ${product.name}`}
            className={`inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl text-sm font-semibold min-h-[44px] transition-colors ${
              best
                ? 'btn-fashion text-white shadow-glow'
                : 'glass dark:glass text-gray-400 cursor-not-allowed'
            }`}
          >
            Compare Prices
            {best && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function MultiStoreDiscovery() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [merchant, setMerchant] = useState('')
  const [sort, setSort] = useState('relevance')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Bumped by "Try Again" to force a reload of the current query.
  const [reloadKey, setReloadKey] = useState(0)

  // Debounce typing so we do not hammer the discovery API on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false

    async function loadDiscovery() {
      try {
        setLoading(true)
        setError(null)
        // Budget phrases ("under ₹3000") become a max_price filter; the rest
        // of the text goes to semantic search as-is.
        const { text, maxPrice } = parseBudgetFromQuery(debouncedQuery)
        const result = await fetchDiscovery({
          q: text,
          merchant,
          sort,
          ...(maxPrice != null ? { max_price: maxPrice } : {}),
        })
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load discovery results.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDiscovery()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, merchant, sort, reloadKey])

  // Merchant chips only show stores that actually exist in the API response.
  const merchants = useMemo(() => data?.merchants || [], [data])
  const products = useMemo(() => data?.products || [], [data])

  return (
    <section className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-primary/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* ===== Header ===== */}
        <Reveal className="text-center mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass dark:glass text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-5">
            <Globe className="w-3.5 h-3.5" />
            Multi-Store Discovery
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight">
            Discover <span className="text-shine">Fashion Everywhere</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            Find products, compare stores, and discover the best available offer in one place.
          </p>
        </Reveal>

        {/* ===== Search ===== */}
        <Reveal className="mb-6">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search black dresses, jackets, party wear…"
                aria-label="Search products across all stores"
                className="w-full pl-14 pr-5 py-4 rounded-3xl glass dark:glass border border-white/10 focus:border-primary/50 outline-none text-base placeholder:text-gray-400 transition-colors"
              />
            </div>
            {/* Example queries */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setQuery(example)}
                  className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors min-h-[32px] ${
                    query === example
                      ? 'bg-primary text-white border-primary'
                      : 'glass dark:glass border-white/10 hover:border-primary/40'
                  }`}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {/* ===== Merchant filters (only stores present in the response) ===== */}
        <Reveal className="mb-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setMerchant('')}
              aria-pressed={merchant === ''}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-colors min-h-[40px] ${
                merchant === ''
                  ? 'bg-primary text-white border-primary shadow-glow'
                  : 'glass dark:glass border-white/10 hover:border-primary/40'
              }`}
            >
              <Store className="w-4 h-4" />
              All Stores
            </button>
            {merchants.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setMerchant(name)}
                aria-pressed={merchant === name}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors min-h-[40px] ${
                  merchant === name
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'glass dark:glass border-white/10 hover:border-primary/40'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </Reveal>

        {/* ===== Sort controls ===== */}
        <Reveal className="mb-10">
          <div className="flex flex-wrap items-center justify-center sm:justify-between gap-3 max-w-5xl mx-auto">
            <div
              className="flex items-center gap-1 p-1 rounded-2xl glass dark:glass"
              role="group"
              aria-label="Sort results"
            >
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSort(option.value)}
                  aria-pressed={sort === option.value}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors min-h-[36px] ${
                    sort === option.value
                      ? 'bg-gradient-to-r from-primary to-secondary text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:text-primary'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {!loading && !error && (
              <p className="text-sm text-gray-500 dark:text-gray-400" aria-live="polite">
                {products.length} {products.length === 1 ? 'product' : 'products'} found
                {merchant ? ` at ${merchant}` : ' across all stores'}
              </p>
            )}
          </div>
        </Reveal>

        {/* ===== Loading state ===== */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6" aria-busy="true" aria-label="Loading discovery results">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ===== Error state ===== */}
        {!loading && error && (
          <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
        )}

        {/* ===== Empty state ===== */}
        {!loading && !error && products.length === 0 && (
          <EmptyState
            icon={Search}
            title="No matching products found."
            message="Try another search or remove a filter."
            actionLabel="Clear search & filters"
            onAction={() => {
              setQuery('')
              setMerchant('')
              setSort('relevance')
            }}
          />
        )}

        {/* ===== Results grid ===== */}
        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {products.map((product, i) => (
              <DiscoveryCard key={`${product.id}-${merchant}-${sort}`} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
