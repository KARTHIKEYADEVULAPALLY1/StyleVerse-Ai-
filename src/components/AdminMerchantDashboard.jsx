import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Clock,
  Database,
  FlaskConical,
  Globe,
  Loader2,
  Package,
  PauseCircle,
  PlayCircle,
  Plug,
  RefreshCw,
  Save,
  ShieldAlert,
  Store,
  Timer,
  XCircle,
} from 'lucide-react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Reveal from './ui/Reveal'
import { useAuth } from '../context/AuthContext'
import {
  fetchAdminMerchants,
  fetchDashboardSummary,
  fetchMerchantSyncs,
  testMerchantFeed,
  triggerMerchantFeedSync,
  triggerMerchantSync,
  updateMerchantSyncConfig,
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

function formatDuration(ms) {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

const CONNECTOR_LABELS = {
  available: 'Connected',
  unavailable: 'Source Unavailable',
  not_registered: 'No Connector',
  inactive: 'Inactive',
  connected: 'Connected',
  disabled: 'Disabled',
  not_connected: 'Not Connected',
}

// Safe cadence choices for automated syncing (minutes). The backend rejects
// anything below its own minimum, so these options are all valid values.
const SYNC_INTERVAL_OPTIONS = [
  { value: 15, label: 'Every 15 minutes' },
  { value: 30, label: 'Every 30 minutes' },
  { value: 60, label: 'Every hour' },
  { value: 180, label: 'Every 3 hours' },
  { value: 360, label: 'Every 6 hours' },
  { value: 720, label: 'Every 12 hours' },
  { value: 1440, label: 'Every day' },
]

function FreshnessPill({ tone, count }) {
  const tones = {
    fresh: 'bg-green-500/10 text-green-600 dark:text-green-400',
    aging: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    stale: 'bg-red-500/10 text-red-500 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${tones[tone]}`}>
      {count}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Real merchant feed configuration + preview
// ---------------------------------------------------------------------------

function FeedPreviewTable({ sample }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400 bg-white/30 dark:bg-white/5">
            <th className="py-2 px-2 font-medium">Status</th>
            <th className="py-2 px-2 font-medium">Name</th>
            <th className="py-2 px-2 font-medium">Brand</th>
            <th className="py-2 px-2 font-medium">Category</th>
            <th className="py-2 px-2 font-medium">Price</th>
            <th className="py-2 px-2 font-medium">Cur</th>
            <th className="py-2 px-2 font-medium">Availability</th>
            <th className="py-2 px-2 font-medium">Image</th>
            <th className="py-2 px-2 font-medium">Product URL</th>
          </tr>
        </thead>
        <tbody>
          {sample.map((row, i) => (
            <tr
              key={`${row.row_index}-${i}`}
              className={`border-t border-white/10 ${row.is_valid ? '' : 'bg-red-500/10'}`}
              title={row.errors?.length ? row.errors.join(' · ') : undefined}
            >
              <td className="py-1.5 px-2">
                {row.is_valid ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" aria-label="Valid record" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-500" aria-label="Invalid record" />
                )}
              </td>
              <td className="py-1.5 px-2 max-w-[160px] truncate">{row.name || '—'}</td>
              <td className="py-1.5 px-2">{row.brand || '—'}</td>
              <td className="py-1.5 px-2">{row.category || '—'}</td>
              <td className="py-1.5 px-2">{row.price != null ? Number(row.price).toLocaleString('en-IN') : '—'}</td>
              <td className="py-1.5 px-2">{row.currency || '—'}</td>
              <td className="py-1.5 px-2">{row.availability || '—'}</td>
              <td className="py-1.5 px-2 max-w-[120px] truncate text-gray-500">{row.image_url || '—'}</td>
              <td className="py-1.5 px-2 max-w-[140px] truncate text-gray-500">{row.product_url || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ tone, children }) {
  const tones = {
    green: 'bg-green-500/10 text-green-600 dark:text-green-400',
    red: 'bg-red-500/10 text-red-500 dark:text-red-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    blue: 'bg-primary/10 text-primary',
    gray: 'bg-gray-500/10 text-gray-500 dark:text-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  )
}

function SyncStatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <StatusPill tone="green">
        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
      </StatusPill>
    )
  }
  if (status === 'failed') {
    return (
      <StatusPill tone="red">
        <XCircle className="w-3.5 h-3.5" /> Failed
      </StatusPill>
    )
  }
  if (status === 'running' || status === 'pending') {
    return (
      <StatusPill tone="blue">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing…
      </StatusPill>
    )
  }
  return <StatusPill tone="gray">{status || 'Unknown'}</StatusPill>
}

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

function FeedConfigSection({ merchant, draft, savingConfig, testing, feedTest, onDraftChange, onSave, onTest }) {
  const hasFeed =
    draft.feed_type === 'etsy' ||
    (draft.feed_type === 'url' && Boolean(draft.feed_url) && Boolean(draft.feed_format))
  return (
    <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-3 space-y-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Globe className="w-4 h-4 text-primary shrink-0" />
        <h4 className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Feed Configuration</h4>
        {merchant.has_feed_configured && <StatusPill tone="green">Feed Ready</StatusPill>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_110px] gap-2">
        <select
          value={draft.feed_type ?? 'mock'}
          onChange={(e) => onDraftChange(merchant, { feed_type: e.target.value })}
          disabled={savingConfig}
          aria-label={`Feed type for ${merchant.name}`}
          className="rounded-xl bg-white/70 dark:bg-white/10 border border-white/10 px-2.5 py-2 text-sm font-semibold focus:outline-none focus:border-primary/50 disabled:opacity-50"
        >
          <option value="mock">Mock data</option>
          <option value="url">Real feed (URL)</option>
          <option value="etsy">Etsy API (real)</option>
        </select>
        {draft.feed_type === 'etsy' ? (
          <input
            type="text"
            placeholder="Search keywords, e.g. linen dress (key from ETSY_API_KEY)"
            value={draft.feed_query ?? ''}
            onChange={(e) => onDraftChange(merchant, { feed_query: e.target.value })}
            disabled={savingConfig}
            aria-label={`Etsy search keywords for ${merchant.name}`}
            className="min-w-0 rounded-xl bg-white/70 dark:bg-white/10 border border-white/10 px-2.5 py-2 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
        ) : (
          <input
            type="url"
            inputMode="url"
            placeholder="https://merchant.example.com/products.csv"
            value={draft.feed_url ?? ''}
            onChange={(e) => onDraftChange(merchant, { feed_url: e.target.value })}
            disabled={savingConfig || draft.feed_type !== 'url'}
            aria-label={`Feed URL for ${merchant.name}`}
            className="min-w-0 rounded-xl bg-white/70 dark:bg-white/10 border border-white/10 px-2.5 py-2 text-sm focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
        )}
        <select
          value={draft.feed_format ?? 'csv'}
          onChange={(e) => onDraftChange(merchant, { feed_format: e.target.value })}
          disabled={savingConfig || draft.feed_type !== 'url'}
          aria-label={`Feed format for ${merchant.name}`}
          className="rounded-xl bg-white/70 dark:bg-white/10 border border-white/10 px-2.5 py-2 text-sm font-semibold focus:outline-none focus:border-primary/50 disabled:opacity-50"
        >
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(merchant)}
          disabled={savingConfig}
          aria-label={`Save feed configuration for ${merchant.name}`}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold glass dark:glass border border-white/10 hover:border-primary/40 transition-colors min-h-[40px] disabled:opacity-60"
        >
          {savingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Configuration
        </button>
        <button
          type="button"
          onClick={() => onTest(merchant)}
          disabled={!hasFeed || testing}
          aria-label={`Test feed for ${merchant.name}`}
          className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors ${
            hasFeed && !testing
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
              : 'bg-gray-500/10 text-gray-400 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <FlaskConical className="w-4 h-4" /> Test Feed
            </>
          )}
        </button>
      </div>

      <FeedTestResults merchant={merchant} feedTest={feedTest} />
    </div>
  )
}

function FeedTestResults({ merchant, feedTest }) {
  if (!feedTest && !(merchant.history?.[0]?.result_stats)) return null
  return (
    <div className="space-y-2 pt-1" role="region" aria-label={`Feed results for ${merchant.name}`}>
      {feedTest && (
        feedTest.connection === 'ok' ? (
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 flex items-center gap-1.5 flex-wrap">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> Feed Valid —{' '}
            {feedTest.record_count} record(s) · {feedTest.valid_count} valid ·{' '}
            {feedTest.invalid_count} invalid · format {String(feedTest.format_detected || '?').toUpperCase()}
          </p>
        ) : (
          <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Feed check failed —{' '}
            {feedTest.message || 'unable to reach the feed.'}
          </p>
        )
      )}
      {feedTest?.sample?.length > 0 && (
        <>
          <p className="text-[11px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">
            Preview (first {feedTest.sample.length}) — nothing is imported until you run Sync Now
          </p>
          <FeedPreviewTable sample={feedTest.sample} />
        </>
      )}
      {merchant.history?.[0]?.result_stats && (() => {
        const stats = merchant.history[0].result_stats
        const chips = [
          ['Records Received', stats.records_received],
          ['Products Created', stats.products_created],
          ['Products Updated', stats.products_updated],
          ['Offers Created', stats.offers_created],
          ['Offers Updated', stats.offers_updated],
          ['Duplicates', stats.duplicates_detected],
          ['Invalid Records', stats.records_invalid],
        ]
        return (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">
            {chips.map(([label, value]) => (
              <span key={label}>
                {label}: <b className="text-gray-700 dark:text-gray-200">{value ?? 0}</b>
              </span>
            ))}
          </div>
        )
      })()}
    </div>
  )
}

function MerchantCard({ merchant, syncState, expanded, savingConfig, testingFeed, feedDraft, feedTest, onToggleHistory, onSync, onToggleSync, onIntervalChange, onFeedDraftChange, onSaveFeed, onTestFeed }) {
  const history = merchant.history || []
  const isSyncing = syncState === 'running'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-4xl glass dark:glass p-5 sm:p-6 flex flex-col gap-4"
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg font-bold truncate">{merchant.name}</h3>
            {merchant.is_active ? (
              <StatusPill tone="green">Active</StatusPill>
            ) : (
              <StatusPill tone="gray">Inactive</StatusPill>
            )}
            {merchant.sync_enabled ? (
              <StatusPill tone="blue">Sync Enabled</StatusPill>
            ) : (
              <StatusPill tone="gray">Sync Disabled</StatusPill>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Plug className="w-3.5 h-3.5" />
            Connector: {CONNECTOR_LABELS[merchant.connector_status] || merchant.connector_status}
          </p>
        </div>
        {syncState === 'completed' ? (
          <StatusPill tone="green"><CheckCircle2 className="w-3.5 h-3.5" /> Completed</StatusPill>
        ) : syncState === 'failed' ? (
          <StatusPill tone="red"><XCircle className="w-3.5 h-3.5" /> Failed</StatusPill>
        ) : null}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
        <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Products</p>
          <p className="font-semibold">{merchant.product_count}</p>
        </div>
        <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Offers</p>
          <p className="font-semibold">{merchant.offer_count}</p>
        </div>
        <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Last Successful Sync</p>
          <p className="font-semibold truncate">{formatDateTime(merchant.last_successful_sync || merchant.last_sync_at)}</p>
        </div>
        <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400">Next Sync</p>
          <p className="font-semibold truncate">
            {merchant.sync_enabled ? formatDateTime(merchant.next_scheduled_sync) : 'Paused'}
          </p>
        </div>
        <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-2 col-span-2 sm:col-span-4">
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 dark:text-gray-400 mb-1.5">Offer Freshness</p>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 dark:text-gray-400">
            <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Fresh <FreshnessPill tone="fresh" count={merchant.fresh_offers ?? 0} /></span>
            <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> Aging <FreshnessPill tone="aging" count={merchant.aging_offers ?? 0} /></span>
            <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5 text-red-500" /> Stale <FreshnessPill tone="stale" count={merchant.stale_offers ?? 0} /></span>
          </div>
        </div>
      </div>

      {/* Last error */}
      {merchant.last_sync_error && (
        <div className="rounded-2xl bg-red-500/10 px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 dark:text-red-400 break-words">{merchant.last_sync_error}</p>
        </div>
      )}

      {/* Automated-sync configuration controls */}
      <div className="rounded-2xl bg-white/40 dark:bg-white/5 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2.5">
        <button
          type="button"
          onClick={() => onToggleSync(merchant)}
          disabled={savingConfig}
          aria-pressed={Boolean(merchant.sync_enabled)}
          aria-label={`${merchant.sync_enabled ? 'Disable' : 'Enable'} automated syncing for ${merchant.name}`}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold min-h-[40px] transition-colors ${
            merchant.sync_enabled
              ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
              : 'bg-gray-500/10 text-gray-500 dark:text-gray-400 hover:bg-gray-500/20'
          } disabled:opacity-60`}
        >
          {savingConfig ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : merchant.sync_enabled ? (
            <PauseCircle className="w-4 h-4" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          {merchant.sync_enabled ? 'Sync Enabled' : 'Sync Disabled'}
        </button>
        <label className="inline-flex items-center gap-2 flex-1 min-w-[180px]">
          <Timer className="w-4 h-4 text-primary shrink-0" />
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Interval</span>
          <select
            value={merchant.sync_interval_minutes ?? 60}
            onChange={(e) => onIntervalChange(merchant, Number(e.target.value))}
            disabled={savingConfig || !merchant.sync_enabled}
            aria-label={`Sync interval for ${merchant.name}`}
            className="flex-1 min-w-0 rounded-xl bg-white/70 dark:bg-white/10 border border-white/10 px-2.5 py-2 text-sm font-semibold focus:outline-none focus:border-primary/50 disabled:opacity-50"
          >
            {!SYNC_INTERVAL_OPTIONS.some((opt) => opt.value === (merchant.sync_interval_minutes ?? 60)) && (
              <option value={merchant.sync_interval_minutes}>
                Every {merchant.sync_interval_minutes} minutes
              </option>
            )}
            {SYNC_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Real merchant feed configuration */}
      <FeedConfigSection
        merchant={merchant}
        draft={feedDraft}
        savingConfig={savingConfig}
        testing={testingFeed}
        feedTest={feedTest}
        onDraftChange={onFeedDraftChange}
        onSave={onSaveFeed}
        onTest={onTestFeed}
      />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSync(merchant)}
          disabled={isSyncing || !merchant.is_active}
          aria-label={`Sync ${merchant.name} now`}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold min-h-[44px] transition-colors ${
            isSyncing
              ? 'bg-primary/20 text-primary cursor-wait'
              : 'btn-fashion text-white shadow-glow'
          } disabled:opacity-70`}
        >
          {isSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Syncing…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Sync Now
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => onToggleHistory(merchant.id)}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Hide' : 'Show'} sync history for ${merchant.name}`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold glass dark:glass border border-white/10 min-h-[44px] hover:border-primary/40 transition-colors"
        >
          History
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Sync history */}
      {expanded && (
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">
            Recent Sync Runs
          </h4>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No sync runs recorded yet.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.12em] text-gray-500 dark:text-gray-400">
                      <th className="py-2 pr-3 font-medium">Date</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Products</th>
                      <th className="py-2 pr-3 font-medium">Offers</th>
                      <th className="py-2 pr-3 font-medium">Duration</th>
                      <th className="py-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((run) => (
                      <tr key={run.id} className="border-t border-white/5">
                        <td className="py-2.5 pr-3 whitespace-nowrap">{formatDateTime(run.started_at || run.created_at)}</td>
                        <td className="py-2.5 pr-3"><SyncStatusBadge status={run.status} /></td>
                        <td className="py-2.5 pr-3">{run.products_processed}</td>
                        <td className="py-2.5 pr-3">{run.offers_processed}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">{formatDuration(run.duration_ms)}</td>
                        <td className="py-2.5 max-w-[220px]">
                          <span className="text-xs text-red-500 dark:text-red-400 line-clamp-2 break-words">
                            {run.error_message || '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="sm:hidden grid gap-3">
                {history.map((run) => (
                  <div key={run.id} className="rounded-2xl bg-white/40 dark:bg-white/5 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDateTime(run.started_at || run.created_at)}
                      </span>
                      <SyncStatusBadge status={run.status} />
                    </div>
                    <p className="text-sm font-semibold">
                      {run.products_processed} products · {run.offers_processed} offers · {formatDuration(run.duration_ms)}
                    </p>
                    {run.error_message && (
                      <p className="text-xs text-red-500 dark:text-red-400 break-words">{run.error_message}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function AdminMerchantDashboard() {
  const { user, token, initialising, isAuthenticated } = useAuth()
  const location = useLocation()

  const [merchants, setMerchants] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState({})
  const [historyByMerchant, setHistoryByMerchant] = useState({})
  const [loadingHistory, setLoadingHistory] = useState({})
  const [syncStates, setSyncStates] = useState({}) // merchant_id -> running|completed|failed
  const [syncErrors, setSyncErrors] = useState({})
  const [savingConfigIds, setSavingConfigIds] = useState({}) // merchant_id -> boolean
  const [feedDrafts, setFeedDrafts] = useState({}) // merchant_id -> {feed_type, feed_url, feed_format}
  const [feedTests, setFeedTests] = useState({}) // merchant_id -> test-feed API result
  const [testingFeedIds, setTestingFeedIds] = useState({}) // merchant_id -> boolean

  const isAdmin = Boolean(user?.is_admin)

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [merchantList, summaryData] = await Promise.all([
        fetchAdminMerchants(),
        fetchDashboardSummary(),
      ])
      setMerchants(Array.isArray(merchantList) ? merchantList : [])
      setSummary(summaryData)
    } catch (err) {
      setError(err.message || 'Unable to load the merchant dashboard.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && token && isAdmin) {
      loadDashboard()
    } else if (!initialising) {
      setLoading(false)
    }
  }, [isAuthenticated, token, isAdmin, initialising, loadDashboard])

  const toggleHistory = async (merchantId) => {
    const isOpen = Boolean(expandedIds[merchantId])
    setExpandedIds((prev) => ({ ...prev, [merchantId]: !isOpen }))
    if (!isOpen && !historyByMerchant[merchantId]) {
      try {
        setLoadingHistory((prev) => ({ ...prev, [merchantId]: true }))
        const runs = await fetchMerchantSyncs(merchantId)
        setHistoryByMerchant((prev) => ({ ...prev, [merchantId]: Array.isArray(runs) ? runs : [] }))
      } catch {
        setHistoryByMerchant((prev) => ({ ...prev, [merchantId]: [] }))
      } finally {
        setLoadingHistory((prev) => ({ ...prev, [merchantId]: false }))
      }
    }
  }

  const handleSync = async (merchant) => {
    // Guard against double-clicks while a sync is in flight.
    setSyncStates((prev) => ({ ...prev, [merchant.id]: 'running' }))
    setSyncErrors((prev) => ({ ...prev, [merchant.id]: null }))
    try {
      // Real feed merchants import through the feed pipeline; everyone else
      // keeps using their registered mock connector.
      const importer = merchant.has_feed_configured
        ? triggerMerchantFeedSync
        : triggerMerchantSync
      await importer(merchant.id)
      setSyncStates((prev) => ({ ...prev, [merchant.id]: 'completed' }))
      // Refresh card facts + summary so counts reflect the fresh sync.
      await loadDashboard()
      if (expandedIds[merchant.id]) {
        const runs = await fetchMerchantSyncs(merchant.id)
        setHistoryByMerchant((prev) => ({ ...prev, [merchant.id]: Array.isArray(runs) ? runs : [] }))
      }
      setTimeout(() => {
        setSyncStates((prev) => ({ ...prev, [merchant.id]: undefined }))
      }, 4000)
    } catch (err) {
      setSyncStates((prev) => ({ ...prev, [merchant.id]: 'failed' }))
      setSyncErrors((prev) => ({ ...prev, [merchant.id]: err.message || 'Sync failed.' }))
    }
  }

  const applyConfig = async (merchant, payload) => {
    // Guard against double-submits while the PATCH is in flight.
    setSavingConfigIds((prev) => ({ ...prev, [merchant.id]: true }))
    try {
      const updated = await updateMerchantSyncConfig(merchant.id, payload)
      if (updated && updated.id) {
        setMerchants((prev) =>
          prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
        )
        // Reset the feed draft so the form reflects the saved configuration.
        setFeedDrafts((prev) => ({
          ...prev,
          [merchant.id]: {
            feed_type: updated.feed_type ?? 'mock',
            feed_url: updated.feed_url ?? '',
            feed_format: updated.feed_format ?? 'csv',
            feed_query: updated.feed_query ?? '',
          },
        }))
        return updated
      }
      await loadDashboard()
      return null
    } catch (err) {
      setSyncErrors((prev) => ({
        ...prev,
        [merchant.id]: err.message || 'Unable to update sync settings.',
      }))
      await loadDashboard()
      throw err
    } finally {
      setSavingConfigIds((prev) => ({ ...prev, [merchant.id]: false }))
    }
  }

  const handleToggleSync = (merchant) => {
    applyConfig(merchant, { sync_enabled: !merchant.sync_enabled })
  }

  const handleIntervalChange = (merchant, minutes) => {
    applyConfig(merchant, { sync_interval_minutes: minutes })
  }

  const getFeedDraft = (merchant) =>
    feedDrafts[merchant.id] ?? {
      feed_type: merchant.feed_type ?? 'mock',
      feed_url: merchant.feed_url ?? '',
      feed_format: merchant.feed_format ?? 'csv',
      feed_query: merchant.feed_query ?? '',
    }

  const handleFeedDraftChange = (merchant, patch) => {
    setFeedDrafts((prev) => ({
      ...prev,
      [merchant.id]: { ...getFeedDraft(merchant), ...patch },
    }))
  }

  const handleSaveFeed = async (merchant) => {
    const draft = getFeedDraft(merchant)
    try {
      await applyConfig(merchant, {
        feed_type: draft.feed_type || 'mock',
        feed_url: draft.feed_type === 'url' ? (draft.feed_url || null) : null,
        feed_format: draft.feed_type === 'url' ? (draft.feed_format || 'csv') : null,
        feed_query: draft.feed_type === 'etsy' ? (draft.feed_query || null) : null,
      })
    } catch {
      // Error already surfaced via applyConfig; keep the draft editable.
    }
  }

  const handleTestFeed = async (merchant) => {
    setTestingFeedIds((prev) => ({ ...prev, [merchant.id]: true }))
    setFeedTests((prev) => ({ ...prev, [merchant.id]: null }))
    try {
      const result = await testMerchantFeed(merchant.id)
      setFeedTests((prev) => ({ ...prev, [merchant.id]: result }))
    } catch (err) {
      setFeedTests((prev) => ({
        ...prev,
        [merchant.id]: { connection: 'failed', message: err.message || 'Test Feed failed.' },
      }))
    } finally {
      setTestingFeedIds((prev) => ({ ...prev, [merchant.id]: false }))
    }
  }

  // ---- Route guards ----
  if (initialising) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </section>
    )
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
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
              You need administrator permissions to view merchant integrations.
              If you believe this is a mistake, contact the StyleVerse team.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow min-h-[44px]"
            >
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-secondary/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
          {/* ===== Header ===== */}
          <Reveal className="mb-10">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass dark:glass text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-5">
              <Activity className="w-3.5 h-3.5" />
              Admin Console
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
              Merchant <span className="text-shine">Integrations</span>
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl">
                Manage product sources, monitor synchronization, and maintain marketplace data.
              </p>
              <Link
                to="/admin/catalog"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass dark:glass text-xs font-semibold text-gray-500 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <Database className="w-3.5 h-3.5" /> Catalog Overview
              </Link>
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full glass dark:glass text-xs font-semibold text-gray-500 dark:text-gray-300 hover:text-primary transition-colors"
              >
                <BarChart3 className="w-3.5 h-3.5" /> Click Analytics
              </Link>
            </div>
          </Reveal>

          {/* ===== Dashboard summary (real values) ===== */}
          {summary && (
            <Reveal className="mb-10">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <SummaryCard icon={Store} label="Active Merchants" value={summary.active_merchants} />
                <SummaryCard icon={Package} label="Total Products" value={summary.total_products} accent="text-blue-500" />
                <SummaryCard icon={Database} label="Total Offers" value={summary.total_offers} accent="text-purple-500" />
                <SummaryCard icon={CheckCircle2} label="Successful Syncs" value={summary.successful_syncs} accent="text-green-500" />
                <SummaryCard icon={XCircle} label="Failed Syncs" value={summary.failed_syncs} accent="text-red-500" />
              </div>
            </Reveal>
          )}

          {/* ===== Error / loading ===== */}
          {error && (
            <Reveal>
              <div className="rounded-4xl glass dark:glass p-8 text-center mb-8">
                <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-300">{error}</p>
                <button
                  type="button"
                  onClick={loadDashboard}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-fashion text-white font-semibold min-h-[44px]"
                >
                  <RefreshCw className="w-4 h-4" /> Retry
                </button>
              </div>
            </Reveal>
          )}

          {loading && !merchants.length && (
            <div className="grid gap-4 sm:grid-cols-2" aria-busy="true">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-4xl glass dark:glass p-6 animate-pulse space-y-3">
                  <div className="h-5 w-32 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-48 rounded-full bg-gray-200 dark:bg-gray-700" />
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                    <div className="h-12 rounded-2xl bg-gray-200 dark:bg-gray-700" />
                  </div>
                  <div className="h-11 rounded-xl bg-gray-200 dark:bg-gray-700" />
                </div>
              ))}
            </div>
          )}

          {/* ===== Merchant cards ===== */}
          {!loading && !error && merchants.length > 0 && (
            <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
              {merchants.map((merchant) => {
                const enriched = {
                  ...merchant,
                  history: historyByMerchant[merchant.id] || [],
                }
                return (
                  <MerchantCard
                    key={merchant.id}
                    merchant={enriched}
                    syncState={syncStates[merchant.id]}
                    expanded={Boolean(expandedIds[merchant.id])}
                    savingConfig={Boolean(savingConfigIds[merchant.id])}
                    testingFeed={Boolean(testingFeedIds[merchant.id])}
                    feedDraft={getFeedDraft(merchant)}
                    feedTest={feedTests[merchant.id]}
                    onToggleHistory={toggleHistory}
                    onSync={handleSync}
                    onToggleSync={handleToggleSync}
                    onIntervalChange={handleIntervalChange}
                    onFeedDraftChange={handleFeedDraftChange}
                    onSaveFeed={handleSaveFeed}
                    onTestFeed={handleTestFeed}
                  />
                )
              })}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
