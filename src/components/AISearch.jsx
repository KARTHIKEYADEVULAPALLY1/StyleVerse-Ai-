import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Mic, Image as ImageIcon, Sparkles, TrendingUp } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

const placeholderExamples = [
  'Black oversized hoodie under ₹1500',
  'Korean streetwear',
  'White sneakers for college',
  'Formal office outfit'
]

const trendingSearches = [
  'Oversized tees',
  'Y2K fashion',
  'Minimalist watches',
  'Streetwear sneakers',
  'Sustainable fashion',
  'Athleisure'
]

export default function AISearch() {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholderExamples.length)
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
            {/* Glow effect */}
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
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder={placeholderExamples[placeholderIndex]}
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

        {/* Trending */}
        <Reveal delay={0.4} className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Trending now</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((tag, i) => (
              <motion.button
                key={tag}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ scale: 1.05 }}
                className="px-4 py-2 rounded-full glass dark:glass text-sm hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"
              >
                {tag}
              </motion.button>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}