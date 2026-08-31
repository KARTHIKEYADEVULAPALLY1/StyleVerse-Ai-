import { motion } from 'framer-motion'
import { Search, Mic, Image as ImageIcon, Sparkles, X, Loader2, PackageSearch } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import FilterPanel from './ui/FilterPanel'

const searchSuggestions = [
  'Something elegant for dinner',
  'Casual outfit under ₹2000',
  'Black clothes for a party',
  'Formal outfit for office',
]

export default function AISearch({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  brand,
  onBrandChange,
  maxPrice,
  onMaxPriceChange,
  categories,
  brands,
  priceOptions,
  resultCount,
  loading = false,
}) {
  return (
    <section id="ai-search" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass dark:glass mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-couture uppercase text-gray-600 dark:text-gray-300">
              Natural Language Search
            </span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            AI <span className="text-shine">Search</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            Describe what you want. Our AI finds it across the entire fashion universe.
          </p>
        </Reveal>

        {/* ===== Search Bar ===== */}
        <Reveal delay={0.15}>
          <div className="relative max-w-3xl mx-auto">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent-cyan/20 blur-2xl rounded-4xl" />
            <div className="relative glass dark:glass rounded-4xl p-2 flex items-center gap-2 shadow-glow">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <div className="relative flex-1 h-12">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search for a style, product, occasion..."
                    className="w-full h-full bg-transparent outline-none text-base sm:text-lg placeholder-gray-400 dark:placeholder-gray-500"
                    aria-label="AI search query"
                  />
                </div>
                {query && (
                  <button
                    type="button"
                    onClick={() => onQueryChange('')}
                    className="shrink-0 w-8 h-8 rounded-full hover:bg-white/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-label="Clear search query"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                <MagneticButton aria-label="Search by voice" className="hidden sm:flex w-11 h-11 rounded-2xl hover:bg-white/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                  <Mic className="w-5 h-5" />
                </MagneticButton>
                <MagneticButton aria-label="Search by image" className="hidden sm:flex w-11 h-11 rounded-2xl hover:bg-white/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </MagneticButton>
                <MagneticButton aria-label="Search now" className="px-5 sm:px-6 h-11 rounded-2xl btn-fashion text-white font-semibold flex items-center gap-2 shadow-glow">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="hidden sm:inline">Searching…</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span className="hidden sm:inline">Search</span>
                    </>
                  )}
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>

        {/* ===== Suggestions ===== */}
        <Reveal delay={0.25} className="mt-8 space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Try asking something like</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2.5">
            {searchSuggestions.map((suggestion, i) => (
              <motion.button
                key={suggestion}
                type="button"
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onQueryChange(suggestion)}
                className="px-4 py-2 rounded-full glass dark:glass text-sm hover:bg-primary/10 dark:hover:bg-primary/10 hover:border-primary/40 transition-colors border border-white/10"
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        </Reveal>

        {/* ===== Results meta + Filter Panel ===== */}
        <Reveal delay={0.35} className="mt-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {loading ? (
                <span className="inline-flex items-center gap-1.5 text-xs tracking-wide text-gray-500 dark:text-gray-400 uppercase">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  Searching…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs tracking-wide text-gray-500 dark:text-gray-400 uppercase">
                  <PackageSearch className="w-3.5 h-3.5 text-primary" />
                  {resultCount} {resultCount === 1 ? 'result' : 'results'}
                </span>
              )}
            </div>
          </div>

          {/* Filter panel (popover on desktop + bottom sheet on mobile) */}
          <FilterPanel
            category={category}
            onCategoryChange={onCategoryChange}
            brand={brand}
            onBrandChange={onBrandChange}
            maxPrice={maxPrice}
            onMaxPriceChange={onMaxPriceChange}
            categories={categories}
            brands={brands}
            priceOptions={priceOptions}
          />
        </Reveal>
      </div>
    </section>
  )
}