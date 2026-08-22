import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, Eye, Heart, Zap, SearchX, Loader2, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWishlist } from '../context/WishlistContext'
import Reveal from './ui/Reveal'
import TiltCard from './ui/TiltCard'

const productGradients = [
  'from-blue-500/20 to-purple-500/20',
  'from-red-500/20 to-orange-500/20',
  'from-green-500/20 to-teal-500/20',
  'from-yellow-500/20 to-amber-500/20',
  'from-indigo-500/20 to-blue-500/20',
  'from-purple-500/20 to-pink-500/20'
]

export default function TrendingProducts({
  products = [],
  loading = false,
  error = null,
  title = 'Trending Products',
  subtitle = "Curated by AI based on what's hot right now",
  emptyTitle = 'No products match your search',
  emptyMessage = 'Try adjusting the filters or searching for a different brand, category, or keyword.',
  sectionId = 'explore',
}) {
  const scrollRef = useRef(null)
  const navigate = useNavigate()
  const { isInWishlist, toggleWishlist } = useWishlist()

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  const handleProductClick = (productId) => {
    navigate(`/product/${productId}`)
  }

  if (loading) {
    return (
      <section id={sectionId} className="relative py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">Loading products…</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Fetching the latest styles from our catalog.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section id={sectionId} className="relative py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">Unable to load products</h3>
              <p className="text-gray-600 dark:text-gray-300">{error}</p>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  if (!products.length) {
    return (
      <section id={sectionId} className="relative py-24 overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <SearchX className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display text-2xl font-bold mb-2">{emptyTitle}</h3>
              <p className="text-gray-600 dark:text-gray-300">
                {emptyMessage}
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  return (
    <section id={sectionId} className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
              {title}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
              {subtitle}
            </p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button
              onClick={() => scroll('left')}
              className="w-12 h-12 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="w-12 h-12 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </Reveal>

        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4"
        >
          {products.map((product, i) => {
            const priceValue = Number(String(product.price || '').replace(/[^\d]/g, ''))
            const originalPriceValue = Number(String(product.originalPrice || product.original_price || '').replace(/[^\d]/g, ''))
            const discountPercent = originalPriceValue > 0
              ? Math.round((1 - priceValue / originalPriceValue) * 100)
              : 0
            const displayOriginalPrice = product.originalPrice || product.original_price
            const reviews = 1800 + product.id * 700
            const match = 88 + product.id

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="snap-start shrink-0 w-[300px] sm:w-[340px]"
              >
                <TiltCard className="h-full">
                  <div
                    className="group relative cursor-pointer rounded-4xl overflow-hidden glass dark:glass h-full transition-all duration-500 hover:shadow-glow"
                    onClick={() => handleProductClick(product.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        handleProductClick(product.id)
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${product.name}`}
                  >
                    <div className="relative h-72 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${productGradients[i % productGradients.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                      <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-semibold">
                        <Zap className="w-3 h-3 text-yellow-400" />
                        {match}% Match
                      </div>

                      <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <button
                          type="button"
                          aria-label={isInWishlist(product.id) ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                          className={`w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center transition-colors ${
                            isInWishlist(product.id) ? 'text-primary bg-white/20' : 'hover:bg-primary text-white'
                          }`}
                          onClick={(event) => {
                            event.stopPropagation()
                            toggleWishlist(product)
                          }}
                        >
                          <Heart className={`w-4 h-4 ${isInWishlist(product.id) ? 'fill-primary text-primary' : 'text-white'}`} />
                        </button>
                        <button
                          type="button"
                          aria-label={`View ${product.name}`}
                          className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-colors"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleProductClick(product.id)
                          }}
                        >
                          <Eye className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-primary">{product.brand}</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-medium">{product.rating}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">({reviews.toLocaleString()})</span>
                        </div>
                      </div>
                      <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xl">{product.price}</span>
                        {displayOriginalPrice ? (
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through">{displayOriginalPrice}</span>
                        ) : null}
                        {discountPercent > 0 ? (
                          <span className="text-xs text-green-500 font-semibold">
                            {discountPercent}% off
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}