import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Layers,
  Heart,
  Palette,
  BadgePercent,
  Gauge,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Tag,
  ShoppingBag,
  Sliders,
  Edit3,
  CheckCircle2,
} from 'lucide-react'
import { fetchStyleProfile } from '../services/styleProfileService'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

// Friendly labels for the style slugs the recommendation engine infers.
const STYLE_LABELS = {
  formal: 'Formal',
  casual: 'Casual',
  minimal: 'Minimalist',
  minimalist: 'Minimalist',
  winter: 'Winter',
  summer: 'Summer',
  athleisure: 'Athleisure',
  office: 'Office',
  travel: 'Travel',
  street: 'Streetwear',
  streetwear: 'Streetwear',
  vintage: 'Vintage',
  bohemian: 'Bohemian',
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
  Red: '#dc2626',
  Wine: '#722f37',
  Camel: '#c19a6b',
}

const LIGHT_COLORS = new Set(['White', 'Cream', 'Off White', 'Gold', 'Sand', 'Silver', 'Stone', 'Tan'])

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
  const key = slug.toLowerCase()
  if (STYLE_LABELS[key]) return STYLE_LABELS[key]
  return slug.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function colorSwatchHex(name) {
  return COLOR_HEX[name] || null
}

function Chip({ label, color }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass dark:glass text-xs sm:text-sm font-medium text-gray-200 border border-white/10">
      {color && (
        <span
          className="w-3 h-3 rounded-full border border-white/30"
          style={{ backgroundColor: color }}
        />
      )}
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
      <span className="text-[11px] text-gray-400 text-center leading-tight">{name}</span>
    </div>
  )
}

function SectionFrame({ icon: Icon, title, subtitle, badge, children, className = '' }) {
  return (
    <motion.div
      variants={cardVariants}
      className={`rounded-4xl glass dark:glass p-5 sm:p-6 relative overflow-hidden ${className}`}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow shrink-0">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-display font-bold text-white text-base sm:text-lg">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/15 text-primary border border-primary/30 shrink-0">
            {badge}
          </span>
        )}
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
        <span className="text-sm font-medium text-gray-300">Activity Score</span>
        <span className="font-display font-bold text-primary">{percent}%</span>
      </div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden">
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

export default function StyleProfile({ token, authenticated }) {
  const navigate = useNavigate()
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

  const onboardingPrefs = profile?.onboarding_preferences
  const hasExplicitPrefs =
    onboardingPrefs &&
    !onboardingPrefs.skipped &&
    (
      (Array.isArray(onboardingPrefs.preferred_styles) && onboardingPrefs.preferred_styles.length > 0) ||
      (Array.isArray(onboardingPrefs.preferred_categories) && onboardingPrefs.preferred_categories.length > 0) ||
      (Array.isArray(onboardingPrefs.preferred_colors) && onboardingPrefs.preferred_colors.length > 0) ||
      (Array.isArray(onboardingPrefs.preferred_brands) && onboardingPrefs.preferred_brands.length > 0) ||
      onboardingPrefs.preferred_price_min != null ||
      onboardingPrefs.preferred_price_max != null ||
      onboardingPrefs.style ||
      onboardingPrefs.occasion ||
      onboardingPrefs.color_palette ||
      onboardingPrefs.budget
    )

  return (
    <section id="style-profile" className="relative py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold">
              My Style <span className="text-shine">Profile</span>
            </h2>
            <p className="mt-2 text-gray-300 text-sm">
              Your personalized fashion identity, combining your explicit preferences with real shopping activity.
            </p>
          </div>
          <MagneticButton
            onClick={() => navigate('/onboarding')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl glass hover:bg-white/10 text-xs sm:text-sm font-semibold text-primary border border-primary/30 w-fit"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Preferences</span>
          </MagneticButton>
        </Reveal>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-pulse" aria-busy="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-4xl glass dark:glass p-6 h-36" />
            ))}
          </div>
        ) : error ? (
          <motion.div variants={cardVariants} className="rounded-4xl glass dark:glass p-8 sm:p-10 text-center">
            <p className="text-sm text-red-400 font-medium">{error}</p>
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
              className="mt-4 px-4 py-2 rounded-2xl glass font-semibold text-sm"
            >
              Retry
            </button>
          </motion.div>
        ) : (
          profile && (
            <div className="space-y-10">
              {/* ========================================================= */}
              {/* SECTION 1: YOUR PREFERENCES (Explicit Choices)           */}
              {/* ========================================================= */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-xl font-bold text-white">Your Preferences</h3>
                  <span className="text-xs text-gray-400 ml-2">
                    (Set directly during onboarding or updated by you)
                  </span>
                </div>

                {hasExplicitPrefs ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Styles */}
                    <div className="rounded-3xl glass p-5 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Preferred Styles</span>
                        <Shirt className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(onboardingPrefs.preferred_styles?.length
                          ? onboardingPrefs.preferred_styles
                          : onboardingPrefs.style
                          ? [styleLabel(onboardingPrefs.style)]
                          : []
                        ).map((st) => (
                          <Chip key={st} label={styleLabel(st)} />
                        ))}
                      </div>
                    </div>

                    {/* Categories */}
                    <div className="rounded-3xl glass p-5 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Preferred Categories</span>
                        <ShoppingBag className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(onboardingPrefs.preferred_categories?.length
                          ? onboardingPrefs.preferred_categories
                          : []
                        ).map((cat) => (
                          <Chip key={cat} label={cat} />
                        ))}
                        {!onboardingPrefs.preferred_categories?.length && (
                          <span className="text-xs text-gray-400">No categories specified yet</span>
                        )}
                      </div>
                    </div>

                    {/* Colors */}
                    <div className="rounded-3xl glass p-5 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Preferred Colors</span>
                        <Palette className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(onboardingPrefs.preferred_colors?.length
                          ? onboardingPrefs.preferred_colors
                          : onboardingPrefs.color_palette
                          ? [styleLabel(onboardingPrefs.color_palette)]
                          : []
                        ).map((color) => (
                          <Chip key={color} label={color} color={colorSwatchHex(color)} />
                        ))}
                      </div>
                    </div>

                    {/* Brands */}
                    <div className="rounded-3xl glass p-5 border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Preferred Brands</span>
                        <Tag className="w-4 h-4 text-gray-400" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(onboardingPrefs.preferred_brands?.length
                          ? onboardingPrefs.preferred_brands
                          : []
                        ).map((brand) => (
                          <Chip key={brand} label={brand} />
                        ))}
                        {!onboardingPrefs.preferred_brands?.length && (
                          <span className="text-xs text-gray-400">No specific brands selected</span>
                        )}
                      </div>
                    </div>

                    {/* Budget Range */}
                    <div className="rounded-3xl glass p-5 border border-white/10 space-y-3 md:col-span-2 lg:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary">Preferred Price Range</span>
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                      </div>
                      <div>
                        {onboardingPrefs.preferred_price_min != null || onboardingPrefs.preferred_price_max != null || onboardingPrefs.budget ? (
                          <div className="font-display text-xl font-bold gradient-text">
                            ₹{(onboardingPrefs.preferred_price_min || 500).toLocaleString('en-IN')} — ₹{(onboardingPrefs.preferred_price_max || onboardingPrefs.budget || 10000).toLocaleString('en-IN')}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Flexible budget</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl glass p-6 border border-white/10 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-white">No explicit preferences saved yet</h4>
                      <p className="text-xs text-gray-400 mt-1">
                        Take the 1-minute style onboarding to set your preferred styles, categories, colors, and brands.
                      </p>
                    </div>
                    <MagneticButton
                      onClick={() => navigate('/onboarding')}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white text-xs sm:text-sm font-semibold shadow-glow shrink-0"
                    >
                      Personalize Now
                    </MagneticButton>
                  </div>
                )}
              </div>

              {/* ========================================================= */}
              {/* SECTION 2: BASED ON YOUR ACTIVITY (Behavioral Signals)    */}
              {/* ========================================================= */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Layers className="w-5 h-5 text-secondary" />
                  <h3 className="font-display text-xl font-bold text-white">Based on Your Activity</h3>
                  <span className="text-xs text-gray-400 ml-2">
                    (Learned from your views, wishlists, and orders)
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <SectionFrame icon={Layers} title="Inferred Styles" subtitle="Extracted from products you engage with" badge="Behavioral">
                    <div className="flex flex-wrap gap-2">
                      {(profile.preferred_styles || []).length > 0 ? (
                        profile.preferred_styles.map((slug) => (
                          <Chip key={slug} label={styleLabel(slug)} />
                        ))
                      ) : (
                        <p className="text-xs text-gray-400">Interact with products to build behavioral style data.</p>
                      )}
                    </div>
                  </SectionFrame>

                  <SectionFrame icon={ShoppingBag} title="Favorite Categories" subtitle="Categories with highest interaction signal" badge="Behavioral">
                    <div className="flex flex-wrap gap-2">
                      {(profile.favorite_categories || []).length > 0 ? (
                        profile.favorite_categories.map((category) => (
                          <Chip key={category} label={category} />
                        ))
                      ) : (
                        <p className="text-xs text-gray-400">View or wishlist items to discover your favorite categories.</p>
                      )}
                    </div>
                  </SectionFrame>

                  <SectionFrame icon={Palette} title="Favorite Colors" subtitle="Dominant colors from your engaged items" badge="Behavioral">
                    <div className="flex flex-wrap gap-4">
                      {(profile.favorite_colors || []).length > 0 ? (
                        profile.favorite_colors.map((color) => (
                          <ColorSwatch key={color} name={color} />
                        ))
                      ) : (
                        <p className="text-xs text-gray-400">Colors will populate as you explore catalog items.</p>
                      )}
                    </div>
                  </SectionFrame>

                  <SectionFrame icon={Heart} title="Favorite Brands" subtitle="Brands you most frequently view & buy" badge="Behavioral">
                    <div className="flex flex-wrap gap-2">
                      {(profile.favorite_brands || []).length > 0 ? (
                        profile.favorite_brands.map((brand) => (
                          <Chip key={brand} label={brand} />
                        ))
                      ) : (
                        <p className="text-xs text-gray-400">Explore different brand collections to build brand affinity.</p>
                      )}
                    </div>
                  </SectionFrame>

                  <SectionFrame icon={TrendingUp} title="Price Preference" subtitle="Calculated price spread from browsing" badge="Behavioral">
                    {profile.average_price_range ? (
                      <div className="py-1">
                        <div className="font-display text-xl sm:text-2xl font-bold gradient-text">
                          {formatInr(profile.average_price_range.min)} — {formatInr(profile.average_price_range.max)}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          Average engagement price: {formatInr(profile.average_price_range.average)}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400">
                        Browse items to calculate your natural price preference spread.
                      </p>
                    )}
                  </SectionFrame>

                  <SectionFrame icon={Gauge} title="Profile Strength" subtitle="Total useful interaction volume" badge="Behavioral">
                    <StrengthBar strength={profile.profile_strength} />
                  </SectionFrame>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  )
}