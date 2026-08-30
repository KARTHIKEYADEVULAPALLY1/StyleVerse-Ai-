import { useEffect, useMemo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Globe,
  Search,
  Store,
  Layers,
  Star,
  Sparkles,
  Tag,
  Palette,
  Shirt,
  X,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Reveal from './ui/Reveal'
import ProductSkeleton from './ui/ProductSkeleton'
import { EmptyState, ErrorState } from './ui/ProductState'
import { fetchDiscovery } from '../services/productService'
import ProductImage from './ui/ProductImage'

const PAGE_SIZE = 20

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_low', label: 'Price: Low → High' },
  { value: 'price_high', label: 'Price: High → Low' },
  { value: 'rating', label: 'Highest Rating' },
  { value: 'newest', label: 'Newest' },
]

const EXAMPLE_QUERIES = [
  'black formal dress',
  'office outfit',
  'casual outfit under ₹3000',
  'party wear',
  'minimalist jacket',
]

const COLOR_SWATCH_MAP = {
  Black: '#111827',
  White: '#ffffff',
  'Off White': '#f9f9f6',
  Navy: '#1e2a4a',
  Gray: '#6b7280',
  Charcoal: '#374151',
  Cream: '#f5f0e6',
  Olive: '#6a7a45',
  Stone: '#a8a29e',
  Tan: '#d2a679',
  Camel: '#c19a6b',
  Silver: '#c0c0c0',
  Gold: '#d4af37',
  Red: '#dc2626',
  Wine: '#722f37',
  Espresso: '#5d4037',
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

  if (!product) return null

  const best = product.best_offer
  const offerCount = Number(product.offer_count || 0)

  const openComparison = () => {
    navigate(`/product/${product.id}`)
  }

  const primaryStyle = product.styles?.[0]
  const primaryOccasion = product.occasions?.[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min((index % PAGE_SIZE) * 0.04, 0.3), duration: 0.4 }}
      className="h-full"
    >
      <div
        className="group relative cursor-pointer rounded-4xl overflow-hidden glass dark:glass h-full flex flex-col transition-all duration-500 hover:shadow-glow hover:-translate-y-1.5 border border-white/10"
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
          <ProductImage src={product.image} alt={product.name} containerClassName="absolute inset-0" className="w-full h-full object-cover group-hover:scale-105" />

          {/* Style & Occasion Badges */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 max-w-[80%]">
            {primaryStyle && (
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold border border-white/20">
                {primaryStyle}
              </span>
            )}
            {primaryOccasion && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/70 backdrop-blur-md text-white text-[10px] font-semibold">
                {primaryOccasion}
              </span>
            )}
          </div>

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
          
          <div className="flex items-center gap-2 mb-2">
            {product.category && (
              <span className="text-[11px] text-gray-400 uppercase tracking-wide">
                {product.category}
              </span>
            )}
          </div>

          {/* Best available multi-store price */}
          <div className="mt-auto pt-2 mb-3">
            {best ? (
              <>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] text-gray-400 mb-0.5">
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
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStyle, setSelectedStyle] = useState('')
  const [selectedOccasion, setSelectedOccasion] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [merchant, setMerchant] = useState('')
  const [sort, setSort] = useState('relevance')

  // Pagination state
  const [page, setPage] = useState(1)
  const [products, setProducts] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [availableFilters, setAvailableFilters] = useState({})
  const [merchants, setMerchants] = useState([])

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Debounce typing for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [query])

  // Reset page to 1 whenever search, filters, or sort change
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, selectedCategory, selectedStyle, selectedOccasion, selectedColor, merchant, sort])

  // Fetch discovery results
  useEffect(() => {
    let cancelled = false

    async function loadData() {
      const isFirstPage = page === 1
      if (isFirstPage) {
        setLoadingInitial(true)
      } else {
        setLoadingMore(true)
      }
      setError(null)

      try {
        const { text, maxPrice } = parseBudgetFromQuery(debouncedQuery)
        const result = await fetchDiscovery({
          q: text,
          category: selectedCategory || undefined,
          style: selectedStyle || undefined,
          occasion: selectedOccasion || undefined,
          color: selectedColor || undefined,
          merchant: merchant || undefined,
          sort,
          page,
          limit: PAGE_SIZE,
          ...(maxPrice != null ? { max_price: maxPrice } : {}),
        })

        if (!cancelled) {
          const newItems = result.items || result.products || []
          const resultTotal = Number(result.total || 0)
          const resultHasNext = result.has_next ?? (page * PAGE_SIZE < resultTotal)

          if (isFirstPage) {
            setProducts(newItems)
          } else {
            // Append while avoiding duplicate IDs
            setProducts((prev) => {
              const existingIds = new Set(prev.map((p) => p.id))
              const uniqueNew = newItems.filter((p) => !existingIds.has(p.id))
              return [...prev, ...uniqueNew]
            })
          }

          setTotal(resultTotal)
          setHasNext(resultHasNext)
          if (result.available_filters) {
            setAvailableFilters(result.available_filters)
          }
          if (result.merchants) {
            setMerchants(result.merchants)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Unable to load discovery results.')
        }
      } finally {
        if (!cancelled) {
          setLoadingInitial(false)
          setLoadingMore(false)
        }
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, selectedCategory, selectedStyle, selectedOccasion, selectedColor, merchant, sort, page, reloadKey])

  const categories = availableFilters.categories || ['Hoodies', 'Sneakers', 'Jackets', 'Accessories', 'Pants', 'Bags', 'Tops', 'Dresses', 'Outerwear', 'Blazers']
  const styles = availableFilters.styles || ['Formal', 'Casual', 'Minimalist', 'Streetwear', 'Vintage', 'Bohemian', 'Athleisure', 'Winter', 'Summer']
  const occasions = availableFilters.occasions || ['Office', 'Casual Day', 'Date Night', 'Party', 'Wedding', 'Workout', 'Travel']
  const colors = availableFilters.colors || ['Black', 'White', 'Navy', 'Gray', 'Cream', 'Olive', 'Stone', 'Tan', 'Silver', 'Gold', 'Red', 'Wine']

  const hasActiveFilters = selectedCategory || selectedStyle || selectedOccasion || selectedColor || merchant

  const clearFilters = () => {
    setSelectedCategory('')
    setSelectedStyle('')
    setSelectedOccasion('')
    setSelectedColor('')
    setMerchant('')
  }

  const handleLoadMore = () => {
    if (!loadingMore && hasNext) {
      setPage((prev) => prev + 1)
    }
  }

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
          <p className="mt-4 text-lg text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            Find products, compare stores, and discover normalized catalog items with rich metadata filters.
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
                placeholder="Search black dresses, office outfit, party wear…"
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

        {/* ===== Metadata Filters ===== */}
        <Reveal className="mb-8 space-y-4">
          {/* Style Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
              <Shirt className="w-3.5 h-3.5 text-primary" /> Style:
            </span>
            <button
              type="button"
              onClick={() => setSelectedStyle('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedStyle === '' ? 'bg-primary text-white border-primary' : 'glass border-white/10 hover:border-primary/30 text-gray-300'
              }`}
            >
              All Styles
            </button>
            {styles.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStyle(selectedStyle === st ? '' : st)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selectedStyle.toLowerCase() === st.toLowerCase()
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'glass border-white/10 hover:border-primary/30 text-gray-300'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Occasion Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Occasion:
            </span>
            <button
              type="button"
              onClick={() => setSelectedOccasion('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedOccasion === '' ? 'bg-primary text-white border-primary' : 'glass border-white/10 hover:border-primary/30 text-gray-300'
              }`}
            >
              All Occasions
            </button>
            {occasions.map((occ) => (
              <button
                key={occ}
                type="button"
                onClick={() => setSelectedOccasion(selectedOccasion === occ ? '' : occ)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selectedOccasion.toLowerCase() === occ.toLowerCase()
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'glass border-white/10 hover:border-primary/30 text-gray-300'
                }`}
              >
                {occ}
              </button>
            ))}
          </div>

          {/* Color Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
              <Palette className="w-3.5 h-3.5 text-primary" /> Color:
            </span>
            <button
              type="button"
              onClick={() => setSelectedColor('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedColor === '' ? 'bg-primary text-white border-primary' : 'glass border-white/10 hover:border-primary/30 text-gray-300'
              }`}
            >
              All Colors
            </button>
            {colors.map((col) => (
              <button
                key={col}
                type="button"
                onClick={() => setSelectedColor(selectedColor === col ? '' : col)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selectedColor.toLowerCase() === col.toLowerCase()
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'glass border-white/10 hover:border-primary/30 text-gray-300'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-white/30"
                  style={{ backgroundColor: COLOR_SWATCH_MAP[col] || '#888' }}
                />
                {col}
              </button>
            ))}
          </div>

          {/* Categories & Clear */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-white/5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 mr-2 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-primary" /> Category:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === '' ? 'bg-primary text-white border-primary' : 'glass border-white/10 hover:border-primary/30 text-gray-300'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(selectedCategory === cat ? '' : cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  selectedCategory.toLowerCase() === cat.toLowerCase()
                    ? 'bg-primary text-white border-primary shadow-glow'
                    : 'glass border-white/10 hover:border-primary/30 text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 ml-2"
              >
                <X className="w-3 h-3" />
                Clear Filters
              </button>
            )}
          </div>
        </Reveal>

        {/* ===== Toolbar: Dynamic Result count, Store filter, Sort dropdown ===== */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            {loadingInitial ? (
              <span className="text-gray-400 animate-pulse">Searching catalog…</span>
            ) : (
              <span className="font-medium">
                Showing <span className="font-bold text-white">{products.length}</span> of{' '}
                <span className="font-bold text-white">{total}</span> product{total === 1 ? '' : 's'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            {/* Merchant filter dropdown */}
            {merchants.length > 0 && (
              <select
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                aria-label="Filter by merchant store"
                className="px-3 py-2 rounded-2xl glass border border-white/10 text-xs sm:text-sm font-medium outline-none bg-black/40 text-gray-200"
              >
                <option value="">All Stores ({merchants.length})</option>
                {merchants.map((m) => (
                  <option key={m} value={m} className="bg-gray-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            )}

            {/* Compact sort selector */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort products"
              className="px-3 py-2 rounded-2xl glass border border-white/10 text-xs sm:text-sm font-medium outline-none bg-black/40 text-gray-200"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-gray-900 text-white">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== Loading Initial Skeleton State ===== */}
        {loadingInitial ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-busy="true" aria-label="Loading discovery results">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <ProductSkeleton key={n} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching products found"
            message={
              hasActiveFilters
                ? 'Try broadening your filters or clearing search filters to see more fashion items.'
                : 'Try adjusting your search keywords to find what you are looking for.'
            }
            actionLabel={hasActiveFilters ? 'Clear search & filters' : undefined}
            onAction={hasActiveFilters ? clearFilters : undefined}
          />
        ) : (
          <>
            {/* ===== Results Grid ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <DiscoveryCard
                  key={`${product.id}-${index}`}
                  product={product}
                  index={index}
                />
              ))}
            </div>

            {/* ===== Load More Progress Button ===== */}
            {hasNext && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  aria-label="Load more products"
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl glass hover:bg-primary/20 text-sm font-semibold text-white border border-white/15 transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 min-h-[48px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span>Loading additional products…</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Products</span>
                      <ChevronDown className="w-4 h-4 text-primary" />
                    </>
                  )}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  Showing {products.length} of {total} products
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}
