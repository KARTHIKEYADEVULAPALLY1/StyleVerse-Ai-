import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SlidersHorizontal, X, Check, ChevronDown } from 'lucide-react'

function formatPrice(option) {
  if (option.value === null) return option.label
  return `Under ₹${Number(option.value).toLocaleString('en-IN')}`
}

function FilterOption({ label, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-sm text-left transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        active
          ? 'bg-primary/10 text-primary border border-primary/30 font-semibold'
          : 'hover:bg-white/10 dark:hover:bg-white/10 border border-transparent text-gray-700 dark:text-gray-300'
      }`}
    >
      <span className="truncate">{label}</span>
      {active && <Check className="w-4 h-4 shrink-0" />}
    </button>
  )
}

export default function FilterPanel({
  category,
  onCategoryChange,
  brand,
  onBrandChange,
  maxPrice,
  onMaxPriceChange,
  categories = [],
  brands = [],
  priceOptions = [],
}) {
  const [open, setOpen] = useState(false)

  const categoryActive = category !== 'All' && category !== ''
  const brandActive = brand !== 'All' && brand !== ''
  const priceActive = maxPrice !== null && maxPrice !== undefined

  const activeCount = [categoryActive, brandActive, priceActive].filter(Boolean).length

  const chips = [
    ...(categoryActive ? [{ key: 'category', label: `Category: ${category}`, onRemove: () => onCategoryChange('All') }] : []),
    ...(brandActive ? [{ key: 'brand', label: `Brand: ${brand}`, onRemove: () => onBrandChange('All') }] : []),
    ...(priceActive
      ? [{
          key: 'price',
          label: `Price: ${formatPrice(priceOptions.find((o) => o.value === maxPrice) || { value: maxPrice })}`,
          onRemove: () => onMaxPriceChange(null),
        }]
      : []),
  ]

  const clearAll = () => {
    onCategoryChange('All')
    onBrandChange('All')
    onMaxPriceChange(null)
    setOpen(false)
  }

  // Lock body scroll when mobile sheet is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [open])

  return (
    <>
      {/* ===== Trigger / Meta row ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={`inline-flex items-center gap-2 text-xs sm:text-sm font-semibold rounded-full px-4 py-2 transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            activeCount > 0
              ? 'text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10'
              : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
        </button>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-400 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
          >
            <X className="w-3.5 h-3.5" />
            Clear All
          </button>
        )}
      </div>

      {/* ===== Active filter chips ===== */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4" role="list" aria-label="Active filters">
          {chips.map((chip) => (
            <motion.span
              key={chip.key}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/25"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label} filter`}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* ===== Filter panel (desktop popover) ===== */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="false"
            aria-label="Filter products"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="max-sm:hidden rounded-4xl glass dark:glass shadow-glow border border-white/10 overflow-hidden"
          >
            <div className="grid sm:grid-cols-3 gap-5 p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-couture text-gray-500 dark:text-gray-400 font-semibold">Category</h3>
                  {categoryActive && (
                    <button type="button" onClick={() => onCategoryChange('All')} className="text-[10px] text-primary hover:underline" aria-label="Clear category filter">
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {categories.map((item) => (
                    <FilterOption
                      key={item}
                      label={item}
                      active={item === category}
                      onSelect={() => onCategoryChange(item)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-couture text-gray-500 dark:text-gray-400 font-semibold">Brand</h3>
                  {brandActive && (
                    <button type="button" onClick={() => onBrandChange('All')} className="text-[10px] text-primary hover:underline" aria-label="Clear brand filter">
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {brands.map((item) => (
                    <FilterOption
                      key={item}
                      label={item}
                      active={item === brand}
                      onSelect={() => onBrandChange(item)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs uppercase tracking-couture text-gray-500 dark:text-gray-400 font-semibold">Price</h3>
                  {priceActive && (
                    <button type="button" onClick={() => onMaxPriceChange(null)} className="text-[10px] text-primary hover:underline" aria-label="Clear price filter">
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {priceOptions.map((option) => (
                    <FilterOption
                      key={option.label}
                      label={formatPrice(option)}
                      active={option.value === maxPrice}
                      onSelect={() => onMaxPriceChange(option.value)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Mobile bottom sheet ===== */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="sm:hidden fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filter products"
              className="sm:hidden fixed bottom-0 inset-x-0 z-[100] rounded-t-4xl glass dark:glass border-t border-white/10 shadow-glow max-h-[85vh] overflow-y-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            >
              <div className="sticky top-0 z-10 glass dark:glass px-5 py-4 flex items-center justify-between border-b border-white/10">
                <h3 className="font-display text-lg font-bold">Filters</h3>
                <div className="flex items-center gap-2">
                  {activeCount > 0 && (
                    <button
                      type="button"
                      onClick={clearAll}
                      className="text-xs font-semibold text-red-500 hover:text-red-400 px-2 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close filters"
                    className="w-9 h-9 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-6 pb-8">
                <div className="space-y-2.5">
                  <h3 className="text-xs uppercase tracking-couture text-gray-500 dark:text-gray-400 font-semibold">Category</h3>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onCategoryChange(item)}
                        aria-pressed={item === category}
                        className={`px-3.5 py-2 rounded-full text-sm transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          item === category
                            ? 'bg-primary text-white border-primary shadow-glow font-semibold'
                            : 'glass dark:glass border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-xs uppercase tracking-couture text-gray-500 dark:text-gray-400 font-semibold">Brand</h3>
                  <div className="flex flex-wrap gap-2">
                    {brands.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => onBrandChange(item)}
                        aria-pressed={item === brand}
                        className={`px-3.5 py-2 rounded-full text-sm transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          item === brand
                            ? 'bg-primary text-white border-primary shadow-glow font-semibold'
                            : 'glass dark:glass border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2.5">
                  <h3 className="text-xs uppercase tracking-couture text-gray-500 dark:text-gray-400 font-semibold">Price</h3>
                  <div className="flex flex-col gap-2">
                    {priceOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => onMaxPriceChange(option.value)}
                        aria-pressed={option.value === maxPrice}
                        className={`px-3.5 py-2.5 rounded-xl text-sm text-left transition-all duration-200 border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          option.value === maxPrice
                            ? 'bg-primary/10 text-primary border-primary/25 font-semibold'
                            : 'glass dark:glass border-white/10 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {formatPrice(option)}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Show {activeCount === 0 ? 'All' : `${activeCount} filter${activeCount > 1 ? 's' : ''}`} Results
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}