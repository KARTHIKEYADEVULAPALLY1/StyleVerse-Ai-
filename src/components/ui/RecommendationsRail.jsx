import { useRef } from 'react'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PackageSearch,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Reveal from './Reveal'
import ProductCard from './ProductCard'
import ProductSkeleton from './ProductSkeleton'
import MagneticButton from './MagneticButton'

/**
 * Premium personalized recommendations rail.
 *
 * - Uses the existing reusable ProductCard with a "Recommended for you" badge.
 * - Horizontal carousel on desktop with left/right navigation; natural
 *   horizontal scrolling on mobile.
 * - Polished loading skeleton, empty (new-user) and error states that never
 *   break the rest of the page.
 *
 * Props:
 *  - products: array of recommendation products (from GET /api/recommendations)
 *  - loading: boolean — show skeletons while the API is loading
 *  - error: string|null — show retry state when the request fails
 *  - isAuthenticated: boolean — controls personalized vs new-user wording
 *  - onRetry: function — called by the Try Again button
 */
export default function RecommendationsRail({
  products = [],
  loading = false,
  error = null,
  isAuthenticated = false,
  onRetry = null,
}) {
  const scrollRef = useRef(null)
  const navigate = useNavigate()

  const hasProducts = !loading && !error && products.length > 0
  // Personalized wording only for authenticated users who actually have results.
  const personalized = isAuthenticated && hasProducts

  const subtitle = personalized
    ? 'Styles selected based on your shopping activity and preferences.'
    : 'Discover styles you may love.'

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  return (
    <section id="recommendations" className="relative py-24 overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-0 w-[500px] h-[400px] bg-secondary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ===== Premium header ===== */}
        <Reveal className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass dark:glass mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-couture uppercase text-gray-600 dark:text-gray-300">
              Personalized Feed
            </span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            Recommended <span className="text-shine">For You</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            {subtitle}
          </p>
        </Reveal>

        {/* ===== Loading skeleton ===== */}
        {loading && (
          <div
            className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4"
            aria-busy="true"
            aria-label="Loading recommendations"
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        )}

        {/* ===== Error state (contained — never breaks the page) ===== */}
        {!loading && error && (
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-10 sm:p-14 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-5">
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">
                We couldn't load your recommendations.
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
                Something went wrong while fetching your personalized feed. Your other pages are unaffected.
              </p>
              {onRetry && (
                <MagneticButton
                  onClick={onRetry}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm shadow-glow"
                >
                  Try Again
                </MagneticButton>
              )}
            </div>
          </Reveal>
        )}

        {/* ===== Empty / new-user fallback ===== */}
        {!loading && !error && !products.length && (
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-10 sm:p-14 text-center">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-5"
              >
                <PackageSearch className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
              </motion.div>
              <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">Build your style profile</h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
                Add products to your wishlist or place an order to get more personalized recommendations.
              </p>
              <MagneticButton
                onClick={() => navigate('/')}
                className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm shadow-glow"
              >
                Explore Products
                <ArrowRight className="w-4 h-4 ml-2" />
              </MagneticButton>
            </div>
          </Reveal>
        )}

        {/* ===== Horizontal recommendation rail ===== */}
        {hasProducts && (
          <>
            <Reveal className="flex items-end justify-between mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>{products.length} curated pick{products.length !== 1 ? 's' : ''} for you</span>
              </div>
              <div className="hidden sm:flex gap-2">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  aria-label="Scroll recommendations left"
                  className="w-11 h-11 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => scroll('right')}
                  aria-label="Scroll recommendations right"
                  className="w-11 h-11 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </Reveal>

            <div
              ref={scrollRef}
              className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4"
            >
              {products.map((product, i) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={i}
                  badge="Recommended for you"
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}