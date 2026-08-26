import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Layers,
  Heart,
  Palette,
  BadgePercent,
  Gauge,
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { fetchStyleProfile } from '../services/styleProfileService'
import Reveal from './ui/Reveal'

// Friendly labels for the style slugs the recommendation engine infers.
const STYLE_LABELS = {
  formal: 'Formal',
  casual: 'Casual',
  minimal: 'Minimalist',
  winter: 'Winter',
  summer: 'Summer',
  athleisure: 'Athleisure',
  office: 'Office',
  travel: 'Travel',
  street: 'Streetwear',
}

// Map known colour names to swatch hex values for visual chips.
const COLOR_HEX = {
  Black: '#111827',
  Gray: '#6b7280',
  Cream: '#f5f0e6',
  White: '#ffffff',
  'Off White': '#f9f9f6',
  Olive: '#6a7a45',
  Stone: '#a8a29e',
  Silver: '#c0c0c0',
  Gold: '#d4af37',
  Sand: '#c2b280',
  Navy: '#1e2a4a',
  Charcoal: '#374151',
  Tan: '#d2a679',
  Espresso: '#5d4037',
}

const LIGHT_COLORS = new Set(['White', 'Cream', 'Off White', 'Gold', 'Sand', 'Silver'])

// Subtle entrance shared by each preference card.
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

function formatInr(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return '—'
  return `₹${Math.round(num).toLocaleString('en-IN')}`
}

function styleLabel(slug) {
  if (!slug) return ''
  if (STYLE_LABELS[slug]) return STYLE_LABELS[slug]
  return slug.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function colorSwatchHex(name) {
  return COLOR_HEX[name] || null
}

function Chip({ label }) {
  return (
    <span className="px-3 py-1.5 rounded-full glass dark:glass text-sm text-gray-700 dark:text-gray-200 border border-white/10">
      {label}
    </span>
  )
}

function ColorSwatch({ name }) {
  const hex = colorSwatchHex(name)
  const isLight = LIGHT_COLORS.has(name)
  return (
    <div className="flex flex-col items-center gap-1.5" title={name}>
      <span
        className={`w-9 h-9 rounded-full border shadow-sm ${isLight ? 'border-gray-300 dark:border-white/40' : 'border-white/20'}`}
        style={hex ? { backgroundColor: hex } : { background: 'conic-gradient(#f472b6,#fbbf24,#60a5fa,#a78bfa,#f472b6)' }}
      />
      <span className="text-[11px] text-gray-500 dark:text-gray-400 text-center leading-tight">{name}</span>
    </div>
  )
}

function SectionFrame({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <motion.div
      variants={cardVariants}
      className={`rounded-4xl glass dark:glass p-5 sm:p-6 relative overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-display font-bold">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  )
}

function StrengthBar({ strength }) {
  const percent = Math.max(0, Math.min(100, Number(strength) || 0))
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Profile Strength</span>
        <span className="font-display font-bold text-primary">{percent}%</span>
      </div>
      <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  )
}

function EmptyProfile() {
  return (
    <motion.div
      variants={cardVariants}
      className="rounded-4xl glass dark:glass p-8 sm:p-10 text-center"
    >
      <div className="mx-auto w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/15 to-secondary/15 flex items-center justify-center mb-5">
        <Sparkles className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-display text-xl sm:text-2xl font-bold">Your style profile is just getting started</h3>
      <p className="mt-2 max-w-md mx-auto text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
        Browse, wishlist, and shop products to personalize it. As you interact,
        StyleVerse will learn your categories, colours, brands and typical price range
        — always from your real activity, never guessed.
      </p>
    </motion.div>
  )
}

export default function StyleProfile({ token, authenticated }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(Boolean(token) && !authenticated)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token || authenticated) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchStyleProfile(token)
      .then((data) => {
        if (!cancelled) setProfile(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Unable to load your style profile.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, authenticated])

  const isEmpty =
    !loading &&
    !error &&
    profile &&
    profile.profile_strength === 0 &&
    !(
      profile.favorite_categories?.length ||
      profile.favorite_brands?.length ||
      profile.favorite_colors?.length ||
      profile.preferred_styles?.length
    )

  return (
    <section id="style-profile" className="relative py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8">
          <h2 className="font-display text-2xl sm:text-3xl font-bold">
            My Style <span className="text-shine">Profile</span>
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
            A visual summary of your preferences, learned from the things you actually
            browse, wishlist and buy.
          </p>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-pulse" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-4xl glass dark:glass p-6 h-36" />
            ))}
          </div>
        ) : error ? (
          <motion.div variants={cardVariants} className="rounded-4xl glass dark:glass p-8 sm:p-10 text-center">
            <p className="text-sm text-red-500 dark:text-red-400 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                setError(null)
                fetchStyleProfile(token)
                  .then(setProfile)
                  .catch((err) => setError(err.message || 'Unable to reload.'))
                  .finally(() => setLoading(false))
              }}
              className="mt-4 px-4 py-2 rounded-2xl glass dark:glass font-semibold text-sm"
            >
              Retry
            </button>
          </motion.div>
        ) : isEmpty ? (
          <EmptyProfile />
        ) : (
          profile && (
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-80px' }}
              variants={{ show: { transition: { staggerChildren: 0.08 } } }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
            >
              <SectionFrame icon={Layers} title="Your Style" subtitle="Only what your real activity supports">
                <div className="flex flex-wrap gap-2">
                  {(profile.preferred_styles || []).map((slug) => (
                    <Chip key={slug} label={styleLabel(slug)} />
                  ))}
                </div>
              </SectionFrame>

              <SectionFrame icon={Layers} title="Favorite Categories" subtitle="Categories you actually interact with">
                <div className="flex flex-wrap gap-2">
                  {(profile.favorite_categories || []).map((category) => (
                    <Chip key={category} label={category} />
                  ))}
                </div>
              </SectionFrame>

              <SectionFrame icon={Palette} title="Favorite Colors" subtitle="From the products you engage with">
                <div className="flex flex-wrap gap-4">
                  {(profile.favorite_colors || []).map((color) => (
                    <ColorSwatch key={color} name={color} />
                  ))}
                </div>
              </SectionFrame>

              <SectionFrame icon={Heart} title="Favorite Brands" subtitle="Your most interacted-with brands">
                <div className="flex flex-wrap gap-2">
                  {(profile.favorite_brands || []).map((brand) => (
                    <Chip key={brand} label={brand} />
                  ))}
                </div>
              </SectionFrame>

              <SectionFrame icon={TrendingUp} title="Price Preference" subtitle="Typical price range">
                {profile.average_price_range ? (
                  <div className="py-2">
                    <div className="font-display text-xl sm:text-2xl font-bold gradient-text">
                      {formatInr(profile.average_price_range.min)} — {formatInr(profile.average_price_range.max)}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Average {formatInr(profile.average_price_range.average)}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Keep engaging with products to reveal your typical price range.
                  </p>
                )}
              </SectionFrame>

              <SectionFrame icon={Gauge} title="Profile Strength" subtitle="Building your style profile">
                <StrengthBar strength={profile.profile_strength} />
              </SectionFrame>
            </motion.div>
          )
        )}

        {profile && !isEmpty && !loading && !error && (
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6"
          >
            <SectionFrame icon={Sparkles} title="Improve My Recommendations">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Every product you view, wishlist, add to cart or purchase adds a real
                signal to the recommendation engine. The more you interact, the more
                tailored your suggestions become — this page updates automatically from
                that activity.
              </p>
            </SectionFrame>

            <SectionFrame icon={ShieldCheck} title="How StyleVerse learns your style">
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Recommendations are driven by interactions like products viewed, wishlist
                items, cart activity and purchases. We never expose raw analytics records
                and never collect new sensitive information — your preferences stay
                derived from your own behaviour.
              </p>
              <a href="#privacy-notice" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                See how your data is protected
              </a>
            </SectionFrame>
          </motion.div>
        )}
      </div>
    </section>
  )
}