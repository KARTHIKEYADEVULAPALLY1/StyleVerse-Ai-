import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Star, Eye, Heart, Zap } from 'lucide-react'
import Reveal from './ui/Reveal'
import TiltCard from './ui/TiltCard'

const products = [
  {
    id: 1,
    name: 'Oversized Graphic Hoodie',
    brand: 'H&M',
    price: '₹1,299',
    originalPrice: '₹2,499',
    rating: 4.5,
    reviews: 2341,
    match: 96,
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
    gradient: 'from-blue-500/20 to-purple-500/20'
  },
  {
    id: 2,
    name: 'Classic White Sneakers',
    brand: 'Nike',
    price: '₹4,999',
    originalPrice: '₹6,999',
    rating: 4.8,
    reviews: 5120,
    match: 94,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    gradient: 'from-red-500/20 to-orange-500/20'
  },
  {
    id: 3,
    name: 'Korean Streetwear Jacket',
    brand: 'Zara',
    price: '₹3,499',
    originalPrice: '₹5,999',
    rating: 4.3,
    reviews: 1892,
    match: 92,
    image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&q=80',
    gradient: 'from-green-500/20 to-teal-500/20'
  },
  {
    id: 4,
    name: 'Minimalist Watch',
    brand: 'Daniel Wellington',
    price: '₹8,999',
    originalPrice: '₹12,999',
    rating: 4.7,
    reviews: 3456,
    match: 90,
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80',
    gradient: 'from-yellow-500/20 to-amber-500/20'
  },
  {
    id: 5,
    name: 'Slim Fit Chinos',
    brand: 'Uniqlo',
    price: '₹1,999',
    originalPrice: '₹3,499',
    rating: 4.4,
    reviews: 2876,
    match: 89,
    image: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&q=80',
    gradient: 'from-indigo-500/20 to-blue-500/20'
  },
  {
    id: 6,
    name: 'Leather Crossbody Bag',
    brand: 'Fossil',
    price: '₹5,499',
    originalPrice: '₹7,999',
    rating: 4.6,
    reviews: 1987,
    match: 88,
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80',
    gradient: 'from-purple-500/20 to-pink-500/20'
  }
]

export default function TrendingProducts() {
  const scrollRef = useRef(null)

  const scroll = (direction) => {
    if (scrollRef.current) {
      const amount = direction === 'left' ? -400 : 400
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
    }
  }

  return (
    <section id="explore" className="relative py-24 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
              Trending <span className="text-shine">Products</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
              Curated by AI based on what's hot right now
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
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="snap-start shrink-0 w-[300px] sm:w-[340px]"
            >
              <TiltCard className="h-full">
                <div className="group relative rounded-4xl overflow-hidden glass dark:glass h-full transition-all duration-500 hover:shadow-glow">
                  {/* Image */}
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${product.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                    {/* AI Match badge */}
                    <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-semibold">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      {product.match}% Match
                    </div>

                    {/* Quick actions */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-colors">
                        <Heart className="w-4 h-4 text-white" />
                      </button>
                      <button className="w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-colors">
                        <Eye className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-primary">{product.brand}</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium">{product.rating}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">({product.reviews.toLocaleString()})</span>
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2 line-clamp-1">{product.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xl">{product.price}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 line-through">{product.originalPrice}</span>
                      <span className="text-xs text-green-500 font-semibold">
                        {Math.round((1 - parseInt(product.price.replace(/[^0-9]/g, '')) / parseInt(product.originalPrice.replace(/[^0-9]/g, ''))) * 100)}% off
                      </span>
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}