import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  MousePointerClick,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Trophy,
  Boxes,
  Wand2,
} from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Reveal from './ui/Reveal'
import { useAuth } from '../context/AuthContext'
import {
  fetchClickAnalytics,
  fetchMerchantClickAnalytics,
  fetchProductClickAnalytics,
  fetchUserEventAnalytics,
} from '../services/adminService'

const RANGE_OPTIONS = [7, 30, 90]

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

function formatPrice(amount) {
  if (amount == null) return '—'
  return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-3xl glass dark:glass p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-2xl bg-white/60 dark:bg-white/5 flex items-center justify-center shrink-0 text-primary">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 truncate">{label}</p>
        <p className="font-display text-2xl font-bold truncate" title={String(value ?? '—')}>{value ?? '—'}</p>
      </div>
    </div>
  )
}

/**
 * Dependency-free horizontal bar chart (no heavy charting library needed).
 * rows: [{label, value}], accent: tailwind color class for the bars.
 */
function HBarChart({ rows, accent = 'bg-primary' }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
        No click data in this range yet.
      </p>
    )
  }
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label} className="text-xs">
          <div className="flex items-center justify-between mb-1 gap-2">
            <span className="font-semibold text-gray-700 dark:text-gray-200 truncate">{row.label}</span>
            <span className="text-gray-500 dark:text-gray-400 shrink-0">{row.value}</span>
          </div>
          <div
            className="h-2.5 rounded-full bg-gray-200/70 dark:bg-white/10 overflow-hidden"
            role="img"
            aria-label={`${row.label}: ${row.value} clicks`}
          >
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(4, Math.round((row.value / max) * 100))}%` }}
              transition={{ duration: 0.5 }}
              className={`h-full rounded-full ${accent}`}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Dependency-free vertical bar chart for metrics-over-time. */
function TimeBars({ rows, unit = 'clicks' }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400 py-6 text-center">
        No {unit} data in this range yet.
      </p>
    )
  }
  const values = rows.map((r) => r.clicks ?? r.events)
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-40 overflow-x-auto pb-1">
      {rows.map((row) => {
        const value = row.clicks ?? row.events
        return (
          <div key={row.date} className="flex flex-col items-center gap-1 min-w-[36px] flex-1">
            <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">{value}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(8, Math.round((value / max) * 100))}%` }}
              transition={{ duration: 0.5 }}
              className="w-full max-w-[38px] rounded-t-lg bg-gradient-to-t from-primary/60 to-primary"
              style={{ minHeight: 8 }}
              role="img"
              aria-label={`${row.date}: ${value} ${unit}`}
            />
            <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {row.date.slice(5)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export default function AdminAnalyticsDashboard() {
  const { user, token, initialising, isAuthenticated } = useAuth()
  const location = useLocation()
  const isAdmin = Boolean(user?.is_admin)

  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)
  const [merchantRows, setMerchantRows] = useState([])
  const [productRows, setProductRows] = useState([])
  const [behavior, setBehavior] = useState(null)
  // Product table sorting: descending by default, toggles to ascending.
  const [clicksAsc, setClicksAsc] = useState(false)

  const loadAnalytics = useCallback(async (range) => {
    try {
      setLoading(true)
      setError(null)
      const [summaryData, merchantsData, productsData, behaviorData] = await Promise.all([
        fetchClickAnalytics(range),
        fetchMerchantClickAnalytics(range),
        fetchProductClickAnalytics(range),
        fetchUserEventAnalytics(range).catch(() => null), // behavior section degrades gracefully
      ])
      setSummary(summaryData)
      setMerchantRows(Array.isArray(merchantsData) ? merchantsData : [])
      setProductRows(Array.isArray(productsData) ? productsData : [])
      setBehavior(behaviorData && typeof behaviorData === 'object' ? behaviorData : null)
    } catch (err) {
      setError(err.message || 'Unable to load click analytics.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && token && isAdmin) {
      loadAnalytics(days)
    } else if (!initialising) {
      setLoading(false)
    }
  }, [isAuthenticated, token, isAdmin, initialising, days, loadAnalytics])

  // Admin gate mirrors the other admin dashboards.
  if (!initialising && (!isAuthenticated || !isAdmin)) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const sortedProducts = useMemo(() => {
    const rows = [...productRows]
    rows.sort((a, b) => (clicksAsc ? a.clicks - b.clicks : b.clicks - a.clicks))
    return rows
  }, [productRows, clicksAsc])

  return (
    <>
      <Navbar />
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <Reveal className="mb-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-primary mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Admin · Click Analytics
                </p>
                <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
                  Merchant <span className="text-shine">Performance</span>
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  Real outbound clicks recorded by StyleVerse redirect endpoints.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to="/admin/merchants"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass dark:glass text-xs font-semibold text-gray-500 dark:text-gray-300 hover:text-primary transition-colors"
                >
                  <Store className="w-3.5 h-3.5" /> Merchants
                </Link>
                <Link
                  to="/admin/catalog"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass dark:glass text-xs font-semibold text-gray-500 dark:text-gray-300 hover:text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Catalog Overview
                </Link>
              </div>
            </div>

            {/* Date range filter */}
            <div className="mt-6 inline-flex items-center gap-1 rounded-full glass dark:glass p-1" role="group" aria-label="Date range">
              <CalendarRange className="w-4 h-4 text-primary ml-2 mr-1 shrink-0" />
              {RANGE_OPTIONS.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setDays(range)}
                  aria-pressed={days === range}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    days === range
                      ? 'bg-primary text-white'
                      : 'text-gray-500 dark:text-gray-300 hover:text-primary'
                  }`}
                >
                  {range} days
                </button>
              ))}
              <button
                type="button"
                onClick={() => loadAnalytics(days)}
                aria-label="Refresh analytics"
                className="p-2 rounded-full text-gray-500 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </Reveal>

          {error && (
            <Reveal className="mb-8">
              <div className="rounded-4xl glass dark:glass p-8 text-center">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300">{error}</p>
                <button
                  type="button"
                  onClick={() => loadAnalytics(days)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-fashion text-white font-semibold min-h-[44px]"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            </Reveal>
          )}

          {loading && !summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-3xl glass dark:glass p-5 animate-pulse h-24" />
              ))}
            </div>
          ) : summary ? (
            <>
              {/* ===== Summary cards ===== */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
                <SummaryCard icon={MousePointerClick} label="Merchant Clicks" value={summary.total_clicks} />
                <SummaryCard icon={Boxes} label="Unique Products Clicked" value={summary.unique_products} />
                <SummaryCard icon={Store} label="Active Merchants" value={summary.active_merchants} />
                <SummaryCard icon={Trophy} label="Top Merchant" value={summary.top_merchant || '—'} />
              </div>

              {/* ===== Charts ===== */}
              <div className="grid gap-4 lg:grid-cols-2 mb-10">
                <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6">
                  <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                    Clicks Over Time
                  </h2>
                  <TimeBars rows={summary.clicks_by_date || []} />
                </Reveal>
                <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6">
                  <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                    Clicks by Merchant
                  </h2>
                  <HBarChart
                    rows={(summary.clicks_by_merchant || []).map((row) => ({
                      label: row.merchant,
                      value: row.clicks,
                    }))}
                  />
                </Reveal>
              </div>

              {/* ===== User Behavior Analytics (real event data) ===== */}
              {behavior ? (
                <>
                  <Reveal className="mb-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-secondary mb-1 flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" /> Privacy-Conscious · Anonymous-Friendly
                        </p>
                        <h2 className="font-display text-3xl sm:text-4xl font-normal tracking-tight">
                          User <span className="text-shine">Behavior</span>
                        </h2>
                        <p className="mt-1 text-gray-600 dark:text-gray-300 text-sm">
                          Real interaction events recorded by StyleVerse ({behavior.total_events ?? 0} total in range).
                        </p>
                      </div>
                    </div>
                  </Reveal>

                  {/* Behavior summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-10">
                    <SummaryCard icon={Eye} label="Product Views" value={behavior.total_product_views} />
                    <SummaryCard icon={Search} label="Searches" value={behavior.total_searches} />
                    <SummaryCard icon={Heart} label="Wishlist Actions" value={behavior.wishlist_actions} />
                    <SummaryCard icon={ShoppingBag} label="Cart Actions" value={behavior.cart_actions} />
                    <SummaryCard icon={MousePointerClick} label="Merchant Clicks" value={behavior.merchant_clicks} />
                    <SummaryCard icon={Wand2} label="AI Stylist Sessions" value={behavior.ai_stylist_sessions} />
                    <SummaryCard icon={Sparkles} label="Try-On Sessions" value={behavior.try_on_sessions} />
                    <SummaryCard icon={Boxes} label="Orders Created" value={behavior.orders_created} />
                  </div>

                  {/* Behavior charts */}
                  <div className="grid gap-4 lg:grid-cols-2 mb-10">
                    <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6 lg:col-span-2">
                      <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                        Events Over Time
                      </h2>
                      <TimeBars rows={behavior.events_by_date || []} unit="events" />
                    </Reveal>

                    <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6">
                      <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                        Top Viewed Products
                      </h2>
                      <HBarChart
                        accent="bg-primary/80"
                        rows={(behavior.top_viewed_products || []).map((row) => ({
                          label: row.product,
                          value: row.count,
                        }))}
                      />
                    </Reveal>

                    <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6">
                      <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                        Top Wishlisted Products
                      </h2>
                      <HBarChart
                        accent="bg-secondary/80"
                        rows={(behavior.top_wishlisted_products || []).map((row) => ({
                          label: row.product,
                          value: row.count,
                        }))}
                      />
                    </Reveal>

                    <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6">
                      <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                        Top Added-to-Cart Products
                      </h2>
                      <HBarChart
                        accent="bg-accent-cyan/80"
                        rows={(behavior.top_carted_products || []).map((row) => ({
                          label: row.product,
                          value: row.count,
                        }))}
                      />
                    </Reveal>

                    <Reveal className="rounded-4xl glass dark:glass p-5 sm:p-6">
                      <h2 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-4">
                        Top Searched Terms
                      </h2>
                      <HBarChart
                        accent="bg-yellow-500/80"
                        rows={(behavior.top_search_terms || []).map((row) => ({
                          label: row.term,
                          value: row.count,
                        }))}
                      />
                    </Reveal>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    </>
  )
}
