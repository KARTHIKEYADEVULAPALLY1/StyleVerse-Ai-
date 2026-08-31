import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  ImageOff,
  Layers,
  Loader2,
  Package,
  PackageX,
  Search,
  ShieldAlert,
  Store,
  Tag,
  Timer,
  X,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import Navbar from './Navbar'
import Reveal from './ui/Reveal'
import { useAuth } from '../context/AuthContext'
import {
  fetchCatalogFilterOptions,
  fetchCatalogProduct,
  fetchCatalogProducts,
  fetchCatalogSummary,
} from '../services/adminService'

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatPrice(amount, currency = 'INR') {
  if (amount == null) return '—'
  if (currency === 'INR') {
    return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

function QualityBadge({ status }) {
  const config = {
    healthy: { tone: 'green', icon: CheckCircle2, label: 'Healthy' },
    warning: { tone: 'amber', icon: AlertTriangle, label: 'Warning' },
    critical: { tone: 'red', icon: ShieldAlert, label: 'Critical' },
  }[status] || { tone: 'gray', icon: Tag, label: status || 'Unknown' }
  const Icon = config.icon
  const tones = {
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-red-500/10 text-red-500 dark:text-red-400',
    gray: 'bg-gray-500/10 text-gray-500 dark:text-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tones[config.tone]}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  )
}

const QUALITY_FILTERS = [
  { key: 'all', label: 'All', params: {} },
  { key: 'healthy', label: 'Healthy', params: { status: 'healthy' } },
  { key: 'warning', label: 'Warning', params: { status: 'warning' } },
  { key: 'critical', label: 'Critical', params: { status: 'critical' } },
  { key: 'missing_data', label: 'Missing Data', params: { missing_data: 'true' } },
  { key: 'stale', label: 'Stale', params: { stale: 'true' } },
  { key: 'no_offers', label: 'No Offers', params: { has_offer: 'false' } },
  { key: 'duplicate', label: 'Potential Duplicate', params: { duplicate: 'true' } },
]

function SummaryCard({ icon: Icon, label, value, accent = 'text-primary' }) {
  return (
    <div className="rounded-3xl glass dark:glass p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl bg-white/60 dark:bg-white/5 flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="font-display text-2xl font-bold">{value}</p>
      </div>
    </div>
  )
}

function OfferRow({ offer }) {
  return (
    <div className={`rounded-2xl p-3.5 border ${offer.is_stale ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/40 dark:bg-white/5'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-semibold text-sm flex items-center gap-1.5">
          <Store className="w-4 h-4 text-primary" />
          {offer.merchant_name}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
          offer.is_available
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-red-500/10 text-red-500 dark:text-red-400'
        }`}>
          {offer.availability}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <p className="text-gray-500 dark:text-gray-400">Price</p>
          <p className="font-semibold">{formatPrice(offer.price, offer.currency)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Rating</p>
          <p className="font-semibold">{Number(offer.rating).toFixed(1)}</p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Merchant URL</p>
          <p className={`font-semibold ${offer.has_url ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {offer.has_url ? 'Present' : 'Missing'}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400">Last Updated</p>
          <p className="font-semibold">{formatDateTime(offer.last_updated)}</p>
        </div>
      </div>
      {offer.warnings.length > 0 && (
        <ul className="mt-2 space-y-1">
          {offer.warnings.map((warning) => (
            <li key={warning} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
              {warning}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function InspectionDrawer({ productId, onClose }) {
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchCatalogProduct(productId)
        if (!cancelled) setProduct(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to load product.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [productId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-label={`Inspect product ${productId}`}>
      <button
        type="button"
        aria-label="Close inspection panel"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative w-full sm:w-[520px] h-full overflow-y-auto bg-white dark:bg-gray-950 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-black/10 dark:border-white/10 bg-white/95 dark:bg-gray-950/95 backdrop-blur">
          <h2 className="font-display text-lg font-bold">Product Inspection</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full glass dark:glass flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          {!loading && product && (
            <>
              {/* Product Information */}
              <section aria-label="Product Information">
                <div className="flex gap-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-24 h-24 rounded-2xl object-cover shrink-0 bg-gray-100 dark:bg-gray-900"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-900 flex items-center justify-center shrink-0">
                      <ImageOff className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <QualityBadge status={product.status} />
                    <h3 className="font-display text-lg font-bold mt-1.5 leading-snug">{product.name}</h3>
                    <p className="text-sm text-primary font-semibold">{product.brand}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Category: {product.category || '—'} · Rating: {Number(product.rating).toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Base price: {formatPrice(product.base_price_value)} · ID #{product.id}
                    </p>
                  </div>
                </div>
                {product.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-3 line-clamp-3">{product.description}</p>
                )}
              </section>

              {/* Normalized Metadata */}
              <section aria-label="Normalized Metadata" className="rounded-2xl glass p-4 space-y-3 border border-white/10">
                <h4 className="text-xs uppercase tracking-[0.2em] text-primary font-bold">
                  Normalized Metadata Quality
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Subcategory:</span>{' '}
                    <span className="font-semibold text-white">{product.subcategory || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Gender / Target:</span>{' '}
                    <span className="font-semibold text-white">{product.target_gender || 'Unisex'}</span>
                  </div>
                </div>

                {product.styles?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Styles:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.styles.map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded-md bg-primary/20 text-primary text-[11px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.occasions?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Occasions:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.occasions.map((o) => (
                        <span key={o} className="px-2 py-0.5 rounded-md bg-secondary/20 text-purple-300 text-[11px] font-medium">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.normalized_colors?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Colors:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.normalized_colors.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded-md bg-white/10 text-gray-200 text-[11px] font-medium">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {product.materials?.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-400 block mb-1">Materials:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {product.materials.map((m) => (
                        <span key={m} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 text-[11px] font-medium">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* Data Quality Warnings */}
              {product.warnings.length > 0 && (
                <section aria-label="Data Quality Warnings">
                  <h4 className="text-xs uppercase tracking-[0.2em] text-amber-400 font-bold mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" /> Data Quality Warnings ({product.warnings.length})
                  </h4>
                  <ul className="space-y-1.5">
                    {product.warnings.map((warning) => (
                      <li key={warning} className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-300 flex items-start gap-2 border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                        {warning}
                      </li>
                    ))}
                  </ul>
                </section>
              )}


              {/* Merchant Offers */}
              <section aria-label="Merchant Offers">
                <h4 className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-2">
                  Merchant Offers ({product.offers.length})
                </h4>
                {product.offers.length === 0 ? (
                  <div className="rounded-2xl glass dark:glass p-4 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <PackageX className="w-4 h-4" /> No merchant offers imported.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {product.offers.map((offer) => (
                      <OfferRow key={offer.offer_id} offer={offer} />
                    ))}
                  </div>
                )}
              </section>

              {/* Last Updated + duplicates */}
              <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-4 py-3 flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4 text-primary shrink-0" />
                <span className="text-gray-500 dark:text-gray-400">Last updated:</span>
                <span className="font-semibold">{formatDateTime(product.last_updated)}</span>
              </div>
              {product.duplicate_of.length > 0 && (
                <div className="rounded-2xl bg-red-500/10 px-4 py-3 flex items-start gap-2 text-sm">
                  <Copy className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span className="text-red-600 dark:text-red-400">
                    Potential duplicate of product ID(s): {product.duplicate_of.join(', ')}. Review manually.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function AdminCatalogDashboard() {
  const { user, token, initialising, isAuthenticated } = useAuth()
  const isAdmin = Boolean(user?.is_admin)

  const [summary, setSummary] = useState(null)
  const [items, setItems] = useState([])
  const [total, setPageTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [filterOptions, setFilterOptions] = useState({ categories: [], merchants: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [activeFilter, setActiveFilter] = useState('all')
  const [merchant, setMerchant] = useState('')
  const [category, setCategory] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [inspectingId, setInspectingId] = useState(null)

  const pageSize = 20

  const loadCatalog = useCallback(async () => {
    if (!isAuthenticated || !token || !isAdmin) return
    try {
      setLoading(true)
      setError(null)
      const filterConfig = QUALITY_FILTERS.find((f) => f.key === activeFilter) || QUALITY_FILTERS[0]
      const data = await fetchCatalogProducts({
        ...filterConfig.params,
        merchant,
        category,
        search,
        page,
        page_size: pageSize,
      })
      setItems(Array.isArray(data.items) ? data.items : [])
      setPageTotal(data.total || 0)
      setSummary((prev) => prev)
    } catch (err) {
      setError(err.message || 'Unable to load the catalog.')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token, isAdmin, activeFilter, merchant, category, search, page])

  useEffect(() => {
    if (isAuthenticated && token && isAdmin) {
      loadCatalog()
    } else if (!initialising) {
      setLoading(false)
    }
  }, [isAuthenticated, token, isAdmin, initialising, loadCatalog])

  // Summary + filter options load once per admin session on this page.
  useEffect(() => {
    let cancelled = false
    async function loadMeta() {
      try {
        const [summaryData, options] = await Promise.all([
          fetchCatalogSummary(),
          fetchCatalogFilterOptions(),
        ])
        if (!cancelled) {
          setSummary(summaryData)
          setFilterOptions(options || { categories: [], merchants: [] })
        }
      } catch {
        /* summary errors surface via the table error state */
      }
    }
    if (isAuthenticated && token && isAdmin) loadMeta()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, token, isAdmin])

  // ---- Route guards (same model as the merchant dashboard) ----
  if (initialising) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </section>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: '/admin/catalog' }} replace />
  }
  if (!isAdmin) {
    return (
      <>
        <Navbar />
        <section className="min-h-screen flex items-center justify-center px-4">
          <div className="rounded-4xl glass dark:glass p-10 sm:p-14 text-center max-w-md">
            <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center mx-auto mb-5">
              <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Access Denied</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-6">
              You need administrator permissions to inspect catalog data quality.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow min-h-[44px]">
              Back to Home
            </Link>
          </div>
        </section>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <section className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-primary/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          {/* ===== Header ===== */}
          <Reveal className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass dark:glass text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Database className="w-3.5 h-3.5" />
                Admin Console
              </span>
              <Link
                to="/admin/merchants"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass dark:glass text-xs font-semibold text-gray-500 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <Store className="w-3.5 h-3.5" /> Merchant Integrations
              </Link>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
              Catalog <span className="text-shine">Overview</span>
            </h1>
            <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl">
              Inspect product data quality across every merchant — duplicates,
              missing data, stale offers, and incomplete records.
            </p>
          </Reveal>

          {/* ===== Summary cards (real values) ===== */}
          {summary && (
            <Reveal className="mb-8">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <SummaryCard icon={Package} label="Products" value={summary.total_products} />
                <SummaryCard icon={Layers} label="With Offers" value={summary.products_with_offers} accent="text-blue-500" />
                <SummaryCard icon={ImageOff} label="Missing Data" value={summary.products_with_missing_images + summary.products_with_missing_prices + summary.products_without_offers} accent="text-amber-500" />
                <SummaryCard icon={Timer} label="Stale Offers" value={summary.stale_offers} accent="text-orange-500" />
                <SummaryCard icon={Copy} label="Potential Duplicates" value={summary.potential_duplicates} accent="text-red-500" />
              </div>
            </Reveal>
          )}

          {/* ===== Quality filters ===== */}
          <Reveal className="mb-4">
            <div className="flex flex-wrap items-center gap-2">
              {QUALITY_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => {
                    setActiveFilter(filter.key)
                    setPage(1)
                  }}
                  aria-pressed={activeFilter === filter.key}
                  className={`px-3.5 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors min-h-[38px] ${
                    activeFilter === filter.key
                      ? 'bg-primary text-white border-primary shadow-glow'
                      : 'glass dark:glass border-white/10 hover:border-primary/40'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </Reveal>

          {/* ===== Merchant / category / search ===== */}
          <Reveal className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setSearch(searchInput.trim())
                      setPage(1)
                    }
                  }}
                  placeholder="Search product name, brand, description… (Enter)"
                  aria-label="Search catalog"
                  className="w-full pl-11 pr-4 py-2.5 rounded-2xl glass dark:glass border border-white/10 focus:border-primary/50 outline-none text-sm min-h-[44px]"
                />
              </div>
              <select
                value={merchant}
                onChange={(e) => {
                  setMerchant(e.target.value)
                  setPage(1)
                }}
                aria-label="Filter by merchant"
                className="rounded-2xl glass dark:glass border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-primary/50 min-h-[44px] bg-transparent"
              >
                <option value="">All Merchants</option>
                {filterOptions.merchants.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setPage(1)
                }}
                aria-label="Filter by category"
                className="rounded-2xl glass dark:glass border border-white/10 px-3 py-2.5 text-sm outline-none focus:border-primary/50 min-h-[44px] bg-transparent"
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </Reveal>

          {/* ===== Error ===== */}
          {error && (
            <Reveal>
              <div className="rounded-4xl glass dark:glass p-8 text-center mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300">{error}</p>
              </div>
            </Reveal>
          )}

          {/* ===== Loading ===== */}
          {loading && (
            <div className="space-y-2" aria-busy="true">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-16 rounded-2xl glass dark:glass animate-pulse" />
              ))}
            </div>
          )}

          {/* ===== Empty ===== */}
          {!loading && !error && items.length === 0 && (
            <Reveal>
              <div className="rounded-4xl glass dark:glass p-12 text-center">
                <PackageX className="w-10 h-10 text-primary/50 mx-auto mb-3" />
                <h3 className="font-display text-xl font-bold mb-1">No products match these filters</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Try another quality filter or clear the search.
                </p>
              </div>
            </Reveal>
          )}

          {/* ===== Catalog table (desktop) ===== */}
          {!loading && !error && items.length > 0 && (
            <Reveal>
              <div className="hidden md:block overflow-hidden rounded-4xl glass dark:glass">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 border-b border-white/10">
                      <th className="py-3.5 pl-5 pr-3 font-medium">Product</th>
                      <th className="py-3.5 pr-3 font-medium">Brand</th>
                      <th className="py-3.5 pr-3 font-medium">Category</th>
                      <th className="py-3.5 pr-3 font-medium">Offers</th>
                      <th className="py-3.5 pr-3 font-medium">Best Price</th>
                      <th className="py-3.5 pr-3 font-medium">Merchant</th>
                      <th className="py-3.5 pr-3 font-medium">Updated</th>
                      <th className="py-3.5 pr-5 font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => setInspectingId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setInspectingId(item.id)
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Inspect ${item.name}`}
                        className="border-b border-white/5 cursor-pointer hover:bg-primary/5 transition-colors focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <td className="py-3 pl-5 pr-3 max-w-[220px]">
                          <span className="font-semibold line-clamp-1">{item.name}</span>
                        </td>
                        <td className="py-3 pr-3 text-primary font-medium">{item.brand}</td>
                        <td className="py-3 pr-3 text-gray-500 dark:text-gray-400">{item.category || '—'}</td>
                        <td className="py-3 pr-3">{item.active_offer_count}/{item.offer_count}</td>
                        <td className="py-3 pr-3 font-semibold">{formatPrice(item.best_price)}</td>
                        <td className="py-3 pr-3">{item.best_merchant || '—'}</td>
                        <td className="py-3 pr-3 whitespace-nowrap text-gray-500 dark:text-gray-400">
                          {formatDateTime(item.last_updated)}
                        </td>
                        <td className="py-3 pr-5"><QualityBadge status={item.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ===== Mobile cards ===== */}
              <div className="md:hidden grid gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setInspectingId(item.id)}
                    aria-label={`Inspect ${item.name}`}
                    className="w-full text-left rounded-3xl glass dark:glass p-4 space-y-2 border border-transparent hover:border-primary/40 transition-colors min-h-[44px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm line-clamp-2">{item.name}</span>
                      <QualityBadge status={item.status} />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.brand} · {item.category || '—'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>Offers: <b>{item.active_offer_count}/{item.offer_count}</b></span>
                      <span>Best: <b>{formatPrice(item.best_price)}</b></span>
                      <span>{item.best_merchant || '—'}</span>
                      <span className="text-gray-400">{formatDateTime(item.last_updated)}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination */}
              {total > pageSize && (
                <div className="flex items-center justify-between mt-5 px-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass dark:glass text-sm font-semibold disabled:opacity-40 min-h-[44px]"
                  >
                    <ChevronLeft className="w-4 h-4" /> Prev
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Page {page} of {Math.ceil(total / pageSize)} · {total} products
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= Math.ceil(total / pageSize)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl glass dark:glass text-sm font-semibold disabled:opacity-40 min-h-[44px]"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </Reveal>
          )}
        </div>
      </section>

      {inspectingId != null && (
        <InspectionDrawer productId={inspectingId} onClose={() => setInspectingId(null)} />
      )}
    </>
  )
}
