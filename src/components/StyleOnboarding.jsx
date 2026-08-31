import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Palette,
  Shirt,
  Sparkles,
  Wallet,
  Tag,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { fetchPreferences, fetchPreferenceOptions, savePreferences } from '../services/preferencesService'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

// Style display metadata for rich UI
const STYLE_METADATA = {
  'Minimalist': { emoji: '⚪', description: 'Clean lines, neutral tones, timeless essentials' },
  'Formal': { emoji: '💼', description: 'Tailored suits, blazers, crisp professional fits' },
  'Streetwear': { emoji: '🛹', description: 'Oversized hoodies, sneakers, bold urban looks' },
  'Vintage': { emoji: '📼', description: 'Retro silhouettes, classic leather, 90s aesthetic' },
  'Bohemian': { emoji: '🌿', description: 'Flowy fabrics, earthy textures, artistic layers' },
  'Athleisure': { emoji: '🏃', description: 'Sporty comfort, performance wear, everyday energy' },
}

// Category display metadata for rich UI
const CATEGORY_METADATA = {
  'Tops': { icon: '👕', description: 'Tees, shirts & polos' },
  'Hoodies': { icon: '🧥', description: 'Oversized & fleece hoodies' },
  'Jackets': { icon: '🧥', description: 'Lightweight & bomber jackets' },
  'Blazers': { icon: '🤵', description: 'Tailored & structured blazers' },
  'Dresses': { icon: '👗', description: 'Slip, midi & evening dresses' },
  'Pants': { icon: '👖', description: 'Chinos, trousers & denim' },
  'Sneakers': { icon: '👟', description: 'Casual, runner & court shoes' },
  'Bags': { icon: '👜', description: 'Crossbody, tote & backpacks' },
  'Accessories': { icon: '⌚', description: 'Watches, jewelry & belts' },
  'Outerwear': { icon: '🧣', description: 'Wool coats & winter parkas' },
  'T-shirts': { icon: '👕', description: 'Casual tees & polos' },
  'Jeans': { icon: '👖', description: 'Denim & casual bottoms' },
  'Shirts': { icon: '👔', description: 'Formal & casual shirts' },
  'Shoes': { icon: '👟', description: 'Footwear & sandals' },
  'Kurtas': { icon: '👔', description: 'Traditional kurtas & sherwanis' },
}

// Color display with hex values for swatches
const COLOR_METADATA = {
  'Black': { hex: '#111827', textDark: false },
  'White': { hex: '#FFFFFF', textDark: true },
  'Navy': { hex: '#1E2A4A', textDark: false },
  'Gray': { hex: '#6B7280', textDark: false },
  'Cream': { hex: '#F5F0E6', textDark: true },
  'Olive': { hex: '#6A7A45', textDark: false },
  'Charcoal': { hex: '#374151', textDark: false },
  'Tan': { hex: '#D2A679', textDark: true },
  'Red': { hex: '#DC2626', textDark: false },
  'Stone': { hex: '#A8A29E', textDark: true },
  'Silver': { hex: '#C0C0C0', textDark: true },
  'Gold': { hex: '#D4AF37', textDark: true },
  'Wine': { hex: '#722F37', textDark: false },
  'Camel': { hex: '#C19A6B', textDark: true },
  'Blue': { hex: '#1E40AF', textDark: false },
  'Brown': { hex: '#7C4A2D', textDark: false },
  'Pink': { hex: '#EC4899', textDark: false },
  'Green': { hex: '#059669', textDark: false },
  'Purple': { hex: '#7C3AED', textDark: false },
  'Orange': { hex: '#EA580C', textDark: false },
  'Yellow': { hex: '#EAB308', textDark: true },
  'Beige': { hex: '#D4C4A8', textDark: true },
  'Teal': { hex: '#0D9488', textDark: false },
  'Burgundy': { hex: '#800020', textDark: false },
  'Maroon': { hex: '#800000', textDark: false },
  'Navy Blue': { hex: '#000080', textDark: false },
  'Off White': { hex: '#FAF9F6', textDark: true },
  'Espresso': { hex: '#3C2415', textDark: false },
  'Champagne': { hex: '#F7E7CE', textDark: true },
  'Sand': { hex: '#C2B280', textDark: true },
  'Earth Tones': { hex: '#8B7355', textDark: false },
  'Cool Blues': { hex: '#4169E1', textDark: false },
  'Bold & Bright': { hex: '#FF4500', textDark: false },
  'Monochrome': { hex: '#404040', textDark: false },
  'Neutrals': { hex: '#A0998C', textDark: false },
}

// Brand display metadata for rich UI
const BRAND_METADATA = {
  'Nike': { tier: 'Athletic & Streetwear', origin: 'Global Icon' },
  'Zara': { tier: 'Contemporary & High Street', origin: 'Trendsetting' },
  'H&M': { tier: 'Everyday Essentials', origin: 'Versatile Fits' },
  'Uniqlo': { tier: 'Japanese Modern Minimal', origin: 'Clean & Functional' },
  'Daniel Wellington': { tier: 'Refined Accessories', origin: 'Timeless Watches' },
  'Fossil': { tier: 'Heritage Leather & Craft', origin: 'Premium Utility' },
  'Mango': { tier: 'Elevated Smart Casual', origin: 'Sophisticated Chic' },
  'Adidas': { tier: 'Athletic & Lifestyle', origin: 'Performance Driven' },
  'Puma': { tier: 'Sport & Street', origin: 'Dynamic Style' },
  'Levi\'s': { tier: 'Denim Heritage', origin: 'Classic Americana' },
  'Gap': { tier: 'American Classic', origin: 'Casual Comfort' },
  'Tommy Hilfiger': { tier: 'Preppy Modern', origin: 'All-American Edge' },
  'Calvin Klein': { tier: 'Minimalist Luxury', origin: 'Understated Elegance' },
  'Ralph Lauren': { tier: 'Classic Luxury', origin: 'Timeless Preppy' },
  'Versace': { tier: 'Bold Luxury', origin: 'Italian Glamour' },
  'Gucci': { tier: 'High Fashion', origin: 'Italian Excellence' },
  'Prada': { tier: 'Luxury Fashion', origin: 'Milanese Innovation' },
}

const BUDGET_PRESETS = [
  { label: 'Budget Friendly', min: 500, max: 2500, desc: 'Great looks under ₹2,500' },
  { label: 'Smart Casual', min: 1000, max: 6000, desc: 'Balanced wardrobe up to ₹6,000' },
  { label: 'Premium & Designer', min: 2500, max: 15000, desc: 'High-end statements up to ₹15,000' },
]

// Default fallback options (shown while loading or if API fails)
const DEFAULT_STYLES = Object.keys(STYLE_METADATA)
const DEFAULT_CATEGORIES = Object.keys(CATEGORY_METADATA)
const DEFAULT_COLORS = Object.keys(COLOR_METADATA)
const DEFAULT_BRANDS = Object.keys(BRAND_METADATA)

export default function StyleOnboarding() {
  const navigate = useNavigate()
  const location = useLocation()
  const { token, isAuthenticated, initialising } = useAuth()

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 5

  const [selectedStyles, setSelectedStyles] = useState(['Minimalist', 'Streetwear'])
  const [selectedCategories, setSelectedCategories] = useState(['Hoodies', 'Sneakers', 'Jackets'])
  const [selectedColors, setSelectedColors] = useState(['Black', 'White', 'Navy'])
  const [selectedBrands, setSelectedBrands] = useState(['Nike', 'Zara', 'H&M'])
  const [priceMin, setPriceMin] = useState(1000)
  const [priceMax, setPriceMax] = useState(6000)

  // Catalog-derived options state
  const [catalogStyles, setCatalogStyles] = useState(DEFAULT_STYLES)
  const [catalogCategories, setCatalogCategories] = useState(DEFAULT_CATEGORIES)
  const [catalogColors, setCatalogColors] = useState(DEFAULT_COLORS)
  const [catalogBrands, setCatalogBrands] = useState(DEFAULT_BRANDS)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [error, setError] = useState('')

  const redirectTo = location.state?.from || '/'

  // Fetch catalog-derived options
  useEffect(() => {
    let isMounted = true

    fetchPreferenceOptions(token)
      .then((options) => {
        if (!isMounted || !options) return

        // Update catalog options from API response
        if (options.styles && options.styles.length > 0) {
          setCatalogStyles(options.styles)
        }
        if (options.categories && options.categories.length > 0) {
          setCatalogCategories(options.categories)
        }
        if (options.colors && options.colors.length > 0) {
          setCatalogColors(options.colors)
        }
        if (options.brands && options.brands.length > 0) {
          setCatalogBrands(options.brands)
        }

        // Update budget bounds if provided
        if (options.budget_min != null) {
          setPriceMin(Math.max(options.budget_min, 500))
        }
        if (options.budget_max != null) {
          setPriceMax(Math.min(options.budget_max, 15000))
        }

        setOptionsLoaded(true)
      })
      .catch(() => {
        // Silently fail - defaults will be used
      })
      .finally(() => {
        if (isMounted) setOptionsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token])

  // Load existing preference or skip if completed
  useEffect(() => {
    if (!token) return
    let isMounted = true

    fetchPreferences(token)
      .then((saved) => {
        if (!isMounted) return
        if (saved?.completed || saved?.skipped) {
          navigate(redirectTo, { replace: true })
          return
        }
        if (saved) {
          // Only use saved values if they exist and are valid
          if (Array.isArray(saved.preferred_styles) && saved.preferred_styles.length > 0) {
            setSelectedStyles(saved.preferred_styles)
          }
          if (Array.isArray(saved.preferred_categories) && saved.preferred_categories.length > 0) {
            setSelectedCategories(saved.preferred_categories)
          }
          if (Array.isArray(saved.preferred_colors) && saved.preferred_colors.length > 0) {
            setSelectedColors(saved.preferred_colors)
          }
          if (Array.isArray(saved.preferred_brands) && saved.preferred_brands.length > 0) {
            setSelectedBrands(saved.preferred_brands)
          }
          if (saved.preferred_price_min != null) setPriceMin(Number(saved.preferred_price_min))
          if (saved.preferred_price_max != null) setPriceMax(Number(saved.preferred_price_max))
        }
      })
      .catch(() => { })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [token, navigate, redirectTo])

  if (initialising || loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </section>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Helper to get style metadata
  const getStyleDisplay = (styleName) => {
    const normalizedName = styleName.charAt(0).toUpperCase() + styleName.slice(1).toLowerCase()
    return STYLE_METADATA[styleName] || STYLE_METADATA[normalizedName] || {
      emoji: '✨',
      description: `${styleName} style`
    }
  }

  // Helper to get category metadata
  const getCategoryDisplay = (categoryName) => {
    const normalizedName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase()
    return CATEGORY_METADATA[categoryName] || CATEGORY_METADATA[normalizedName] || {
      icon: '📦',
      description: categoryName
    }
  }

  // Helper to get color metadata
  const getColorDisplay = (colorName) => {
    const normalizedName = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase()
    return COLOR_METADATA[colorName] || COLOR_METADATA[normalizedName] || {
      hex: '#808080',
      textDark: true
    }
  }

  // Helper to get brand metadata
  const getBrandDisplay = (brandName) => {
    const normalizedName = brandName.charAt(0).toUpperCase() + brandName.slice(1).toLowerCase()
    return BRAND_METADATA[brandName] || BRAND_METADATA[normalizedName] || {
      tier: 'Popular Brand',
      origin: 'Quality Choice'
    }
  }

  const toggleItem = (list, setList, item) => {
    setError('')
    if (list.includes(item)) {
      if (list.length === 1) {
        // Keep at least one selection for better UX
        return
      }
      setList(list.filter((i) => i !== item))
    } else {
      setList([...list, item])
    }
  }

  const handleNext = () => {
    setError('')
    if (currentStep === 1 && selectedStyles.length === 0) {
      setError('Please select at least one style to continue.')
      return
    }
    if (currentStep === 2 && selectedCategories.length === 0) {
      setError('Please select at least one category to continue.')
      return
    }
    if (currentStep === 3 && selectedColors.length === 0) {
      setError('Please select at least one color to continue.')
      return
    }
    if (currentStep === 4 && selectedBrands.length === 0) {
      setError('Please select at least one brand to continue.')
      return
    }
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleFinish()
    }
  }

  const handleBack = () => {
    setError('')
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleFinish = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        preferred_styles: selectedStyles,
        preferred_categories: selectedCategories,
        preferred_colors: selectedColors,
        preferred_brands: selectedBrands,
        preferred_price_min: Number(priceMin),
        preferred_price_max: Number(priceMax),
        skipped: false,
      }
      await savePreferences(token, payload)
      setIsFinished(true)
    } catch (err) {
      setError(err.message || 'Unable to save your preferences.')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = async () => {
    setSaving(true)
    setError('')
    try {
      await savePreferences(token, { skipped: true })
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Unable to skip.')
    } finally {
      setSaving(false)
    }
  }

  const handleCompleteRedirect = () => {
    navigate(redirectTo, { replace: true })
  }

  // Loading overlay for options
  const OptionsLoadingOverlay = () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-4xl z-10">
      <div className="flex items-center gap-2 text-gray-300">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading options...</span>
      </div>
    </div>
  )

  return (
    <section className="relative min-h-screen overflow-hidden py-16 sm:py-24">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 pointer-events-none" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 rounded-full bg-primary/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 rounded-full bg-secondary/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
        {/* Welcome Header */}
        <Reveal className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Welcome to <span className="text-shine">StyleVerse AI</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base sm:text-lg text-gray-300 font-light">
            Let's personalize your fashion experience.
          </p>
        </Reveal>

        {isFinished ? (
          /* Finish Completion Screen */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-4xl glass dark:glass p-8 sm:p-12 text-center space-y-8 border border-white/10 shadow-2xl"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-600 text-white shadow-glow animate-bounce">
              <Sparkles className="h-10 w-10" />
            </div>

            <div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white">
                Your Style Profile is ready ✨
              </h2>
              <p className="mt-3 text-gray-300 max-w-lg mx-auto text-sm sm:text-base">
                We've tuned your AI Stylist and personalized recommendations around your fashion preferences.
              </p>
            </div>

            {/* Preference Snapshot */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left max-w-2xl mx-auto">
              <div className="rounded-2xl glass p-3 border border-white/10">
                <span className="text-xs text-primary font-semibold block uppercase">Styles</span>
                <span className="text-xs text-gray-200 mt-1 block truncate">
                  {selectedStyles.join(', ')}
                </span>
              </div>
              <div className="rounded-2xl glass p-3 border border-white/10">
                <span className="text-xs text-primary font-semibold block uppercase">Categories</span>
                <span className="text-xs text-gray-200 mt-1 block truncate">
                  {selectedCategories.join(', ')}
                </span>
              </div>
              <div className="rounded-2xl glass p-3 border border-white/10">
                <span className="text-xs text-primary font-semibold block uppercase">Brands</span>
                <span className="text-xs text-gray-200 mt-1 block truncate">
                  {selectedBrands.join(', ')}
                </span>
              </div>
              <div className="rounded-2xl glass p-3 border border-white/10">
                <span className="text-xs text-primary font-semibold block uppercase">Budget</span>
                <span className="text-xs text-gray-200 mt-1 block truncate">
                  ₹{priceMin.toLocaleString('en-IN')} - ₹{priceMax.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="pt-4 flex justify-center">
              <MagneticButton
                onClick={handleCompleteRedirect}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-8 py-4 text-base font-semibold text-white shadow-glow hover:shadow-lg transition-all"
              >
                <span>Start Shopping</span>
                <ArrowRight className="w-5 h-5" />
              </MagneticButton>
            </div>
          </motion.div>
        ) : (
          /* Multi-Step Onboarding Form */
          <div className="rounded-4xl glass dark:glass p-6 sm:p-10 border border-white/10 shadow-2xl relative">
            {/* Step Progress Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs sm:text-sm mb-3">
                <span className="font-semibold text-primary uppercase tracking-wider">
                  Step {currentStep} of {totalSteps}
                </span>
                <span className="text-gray-400">
                  {currentStep === 1 && 'Styles'}
                  {currentStep === 2 && 'Categories'}
                  {currentStep === 3 && 'Colors'}
                  {currentStep === 4 && 'Brands'}
                  {currentStep === 5 && 'Budget'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-secondary"
                  initial={{ width: '20%' }}
                  animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Error notice */}
            {error && (
              <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            {/* Steps Container */}
            <AnimatePresence mode="wait">
              {/* ===== STEP 1: STYLES ===== */}
              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Shirt className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                        What styles do you love?
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Select one or more styles that match your everyday vibe.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                    {catalogStyles.map((style) => {
                      const isSelected = selectedStyles.includes(style)
                      const meta = getStyleDisplay(style)
                      return (
                        <button
                          key={style}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleItem(selectedStyles, setSelectedStyles, style)}
                          className={`group relative text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                              ? 'border-primary bg-primary/20 shadow-glow scale-[1.02]'
                              : 'border-white/10 glass hover:border-primary/40 hover:bg-white/5'
                            }`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="text-3xl">{meta.emoji}</span>
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'border border-white/20 text-transparent'
                                }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          <h3 className="mt-3 font-semibold text-sm sm:text-base text-white">
                            {style}
                          </h3>
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">
                            {meta.description}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ===== STEP 2: CATEGORIES ===== */}
              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                        Which categories are you shopping for?
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Select your preferred apparel & accessory categories.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
                    {catalogCategories.map((cat) => {
                      const isSelected = selectedCategories.includes(cat)
                      const meta = getCategoryDisplay(cat)
                      return (
                        <button
                          key={cat}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleItem(selectedCategories, setSelectedCategories, cat)}
                          className={`relative text-left p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                              ? 'border-primary bg-primary/20 shadow-glow scale-[1.02]'
                              : 'border-white/10 glass hover:border-primary/40 hover:bg-white/5'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{meta.icon}</span>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'border border-white/20 text-transparent'
                                }`}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                          </div>
                          <span className="block font-semibold text-xs sm:text-sm text-white">
                            {cat}
                          </span>
                          <span className="text-[11px] text-gray-400 block mt-0.5 truncate">
                            {meta.description}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ===== STEP 3: COLORS ===== */}
              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Palette className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                        Your favorite color palette
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Choose visual color swatches you gravitate towards.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
                    {catalogColors.map((color) => {
                      const isSelected = selectedColors.includes(color)
                      const meta = getColorDisplay(color)
                      return (
                        <button
                          key={color}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleItem(selectedColors, setSelectedColors, color)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                              ? 'border-primary bg-primary/20 shadow-glow scale-105'
                              : 'border-white/10 glass hover:border-primary/40'
                            }`}
                        >
                          <div
                            className="w-10 h-10 rounded-full border border-white/20 shadow-md flex items-center justify-center mb-2 relative"
                            style={{ backgroundColor: meta.hex }}
                          >
                            {isSelected && (
                              <Check
                                className={`w-5 h-5 drop-shadow-md ${meta.textDark ? 'text-gray-900' : 'text-white'
                                  }`}
                              />
                            )}
                          </div>
                          <span className="text-xs font-semibold text-gray-200">{color}</span>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ===== STEP 4: BRANDS ===== */}
              {currentStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Tag className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                        Brands you love
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Real catalog brands available right now in StyleVerse.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
                    {catalogBrands.map((brand) => {
                      const isSelected = selectedBrands.includes(brand)
                      const meta = getBrandDisplay(brand)
                      return (
                        <button
                          key={brand}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleItem(selectedBrands, setSelectedBrands, brand)}
                          className={`relative text-left p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${isSelected
                              ? 'border-primary bg-primary/20 shadow-glow scale-[1.02]'
                              : 'border-white/10 glass hover:border-primary/40 hover:bg-white/5'
                            }`}
                        >
                          <div className="flex items-between">
                            <h3 className="font-bold text-base text-white">{brand}</h3>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-primary text-white' : 'border border-white/20 text-transparent'
                                }`}
                            >
                              <Check className="w-3 h-3" />
                            </div>
                          </div>
                          <p className="text-xs text-primary font-medium mt-1">{meta.tier}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{meta.origin}</p>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              )}

              {/* ===== STEP 5: BUDGET ===== */}
              {currentStep === 5 && (
                <motion.div
                  key="step-5"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                        Your preferred budget range
                      </h2>
                      <p className="text-xs sm:text-sm text-gray-400">
                        Help us tailor recommendations to your sweet spot.
                      </p>
                    </div>
                  </div>

                  {/* Preset tier shortcuts */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {BUDGET_PRESETS.map((preset) => {
                      const active = priceMin === preset.min && priceMax === preset.max
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setPriceMin(preset.min)
                            setPriceMax(preset.max)
                          }}
                          className={`p-3.5 rounded-2xl text-left border transition-all ${active
                              ? 'border-primary bg-primary/20 shadow-glow'
                              : 'border-white/10 glass hover:border-primary/40'
                            }`}
                        >
                          <span className="block font-semibold text-sm text-white">{preset.label}</span>
                          <span className="text-xs text-primary font-bold mt-1 block">
                            ₹{preset.min.toLocaleString('en-IN')} - ₹{preset.max.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[11px] text-gray-400 block mt-0.5">{preset.desc}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Range Sliders / Inputs */}
                  <div className="rounded-2xl glass p-5 space-y-4 border border-white/10 mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-200">Selected Range</span>
                      <span className="font-display text-xl font-bold gradient-text">
                        ₹{priceMin.toLocaleString('en-IN')} — ₹{priceMax.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Minimum Budget: ₹{priceMin.toLocaleString('en-IN')}</span>
                        </div>
                        <input
                          type="range"
                          min="500"
                          max="10000"
                          step="500"
                          value={priceMin}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setPriceMin(Math.min(val, priceMax - 500))
                          }}
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Maximum Budget: ₹{priceMax.toLocaleString('en-IN')}</span>
                        </div>
                        <input
                          type="range"
                          min="1000"
                          max="15000"
                          step="500"
                          value={priceMax}
                          onChange={(e) => {
                            const val = Number(e.target.value)
                            setPriceMax(Math.max(val, priceMin + 500))
                          }}
                          className="w-full accent-primary cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Actions Bar */}
            <div className="mt-8 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-6">
              {/* Skip option on every step */}
              <button
                type="button"
                disabled={saving}
                onClick={handleSkip}
                className="text-sm font-semibold text-gray-400 hover:text-white transition-colors disabled:opacity-50 py-2"
              >
                Skip for now
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {currentStep > 1 && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleBack}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl glass hover:bg-white/10 text-sm font-medium text-gray-200 transition-colors disabled:opacity-50 min-h-[44px]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </button>
                )}

                <MagneticButton
                  type="button"
                  disabled={saving}
                  onClick={handleNext}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-white shadow-glow hover:shadow-lg transition-all min-h-[44px] w-full sm:w-auto"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving preferences...</span>
                    </>
                  ) : currentStep === totalSteps ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Finish & Save</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </MagneticButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
