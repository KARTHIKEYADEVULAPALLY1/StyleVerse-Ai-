import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Reveal from './ui/Reveal'
import ProductCard from './ui/ProductCard'
import ProductSkeleton from './ui/ProductSkeleton'
import { EmptyState, ErrorState } from './ui/ProductState'

export default function TrendingProducts({
  products = [],
  loading = false,
  error = null,
  title = 'Trending Products',
  subtitle = "Curated by AI based on what's hot right now",
  emptyTitle = 'No products match your search',
  emptyMessage = 'Try adjusting the filters or searching for a different brand, category, or keyword.',
  sectionId = 'explore',
  showMatch = true,
}) {
  const scrollRef = useRef(null)
  const navigate = useNavigate()

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
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
          {!loading && products.length > 0 && (
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => scroll('left')}
                aria-label="Scroll products left"
                className="w-12 h-12 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                aria-label="Scroll products right"
                className="w-12 h-12 rounded-full glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </Reveal>

        {loading ? (
          <div className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4" aria-busy="true" aria-label="Loading products">
            {[1, 2, 3, 4].map((i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} />
        ) : !products.length ? (
          <EmptyState
            title={emptyTitle}
            message={emptyMessage}
            actionLabel="Explore Products"
            onAction={() => navigate('/')}
          />
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4"
          >
            {products.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                index={i}
                showMatch={showMatch}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}