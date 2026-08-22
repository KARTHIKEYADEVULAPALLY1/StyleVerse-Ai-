import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Mic, Image as ImageIcon, Sparkles, TrendingUp } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import { aiSearchPlaceholders, trendingSearches } from '../data/fashionData'

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
  resultCount
}) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % aiSearchPlaceholders.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="ai-search" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            AI <span className="text-shine">Search</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
            Describe what you want. Our AI finds it across the entire fashion universe.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 blur-2xl rounded-4xl" />

            <div className="relative glass dark:glass rounded-4xl p-2 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <div className="relative flex-1 h-12">
                  <AnimatePresence mode="wait">
                    <motion.input
                      key={placeholderIndex}
                      type="text"
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      placeholder={aiSearchPlaceholders[placeholderIndex]}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="w-full h-full bg-transparent outline-none text-base sm:text-lg placeholder-gray-400 dark:placeholder-gray-500"
                    />
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MagneticButton className="w-11 h-11 rounded-2xl hover:bg-white/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                  <Mic className="w-5 h-5" />
                </MagneticButton>
                <MagneticButton className="w-11 h-11 rounded-2xl hover:bg-white/10 dark:hover:bg-white/10 flex items-center justify-center transition-colors">
                  <ImageIcon className="w-5 h-5" />
                </MagneticButton>
                <MagneticButton className="px-6 h-11 rounded-2xl btn-fashion text-white font-semibold flex items-center gap-2 shadow-glow">
                  <Search className="w-4 h-4" />
                  Search
                </MagneticButton>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.4} className="mt-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Trending now</span>
            </div>
            <span className="text-xs tracking-wide text-gray-500 dark:text-gray-400 uppercase">
              {resultCount} results
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((tag, i) => (
              <motion.button
                key={tag}
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => onQueryChange(tag)}
                className="px-4 py-2 rounded-full glass dark:glass text-sm hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"
              >
                {tag}
              </motion.button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Category</span>
              <select
                value={category}
                onChange={(event) => onCategoryChange(event.target.value)}
                className="rounded-2xl glass dark:glass px-3 py-2.5 text-sm outline-none border border-white/10 bg-transparent"
              >
                {categories.map((item) => (
                  <option key={item} value={item} className="bg-[#0A0A0F] text-white">
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Brand</span>
              <select
                value={brand}
                onChange={(event) => onBrandChange(event.target.value)}
                className="rounded-2xl glass dark:glass px-3 py-2.5 text-sm outline-none border border-white/10 bg-transparent"
              >
                {brands.map((item) => (
                  <option key={item} value={item} className="bg-[#0A0A0F] text-white">
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>Price</span>
              <select
                value={maxPrice ?? 'all'}
                onChange={(event) => onMaxPriceChange(event.target.value === 'all' ? null : Number(event.target.value))}
                className="rounded-2xl glass dark:glass px-3 py-2.5 text-sm outline-none border border-white/10 bg-transparent"
              >
                {priceOptions.map((option) => (
                  <option key={option.label} value={option.value ?? 'all'} className="bg-[#0A0A0F] text-white">
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </Reveal>
      </div>
    </section>
  )
}