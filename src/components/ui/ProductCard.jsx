import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Star, Tag, ImageOff, Zap, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWishlist } from '../../context/WishlistContext'
import { useAuth } from '../../context/AuthContext'
import TiltCard from './TiltCard'
import ProductImage from './ProductImage'

const productGradients = [
  'from-blue-500/20 to-purple-500/20',
  'from-red-500/20 to-orange-500/20',
  'from-green-500/20 to-teal-500/20',
  'from-yellow-500/20 to-amber-500/20',
  'from-indigo-500/20 to-blue-500/20',
  'from-purple-500/20 to-pink-500/20',
]

function parsePriceValue(value) {
  return Number(String(value || '').replace(/[^\d]/g, '')) || 0
}

function formatPrice(value) {
  if (value === null || value === undefined || value === '') return null
  const str = String(value)
  if (str.includes('₹')) return str
  const num = Number(str.replace(/[^\d.]/g, ''))
  if (isNaN(num)) return str
  return `₹${num.toLocaleString('en-IN')}`
}

export default function ProductCard({
  product,
  index = 0,
  showMatch = true,
  badge = null,
  className = '',
}) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { isInWishlist, toggleWishlist } = useWishlist()

  const [wishlistAnimating, setWishlistAnimating] = useState(false)

  if (!product) return null

  const productId = product.id
  const saved = isInWishlist(productId)

  const priceValue = parsePriceValue(product.price)
  const originalPriceValue = parsePriceValue(product.originalPrice || product.original_price)
  const discountPercent = originalPriceValue > 0
    ? Math.round((1 - priceValue / originalPriceValue) * 100)
    : 0
  const displayOriginalPrice = formatPrice(product.originalPrice || product.original_price)
  const displayPrice = formatPrice(product.price)
  const match = 88 + (Number(productId) % 12)
  const reviews = 1800 + Number(productId) * 700

  const handleNavigate = () => {
    navigate(`/product/${productId}`)
  }

  const handleWishlistClick = (event) => {
    event.stopPropagation()
    event.preventDefault()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/product/${productId}` } })
      return
    }
    setWishlistAnimating(true)
    toggleWishlist(product)
    setTimeout(() => setWishlistAnimating(false), 600)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleNavigate()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.6 }}
      className={`snap-start shrink-0 w-[280px] sm:w-[320px] ${className}`}
    >
      <TiltCard className="h-full">
        <div
          className="group relative cursor-pointer rounded-4xl overflow-hidden glass dark:glass h-full transition-all duration-500 hover:shadow-glow hover:-translate-y-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          onClick={handleNavigate}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`Open details for ${product.name}`}
        >
          {/* ===== Image ===== */}
          <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-800">
            <ProductImage src={product.image} alt={product.name} containerClassName="absolute inset-0" className="w-full h-full object-cover group-hover:scale-110" />

            {/* Hover gradient overlay */}
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-t ${productGradients[index % productGradients.length]} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* ===== Badges (top-left) ===== */}
            <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
              {(badge || showMatch) && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] font-semibold">
                  {badge ? <Sparkles className="w-3 h-3 text-yellow-400" /> : <Zap className="w-3 h-3 text-yellow-400" />}
                  {badge || `${match}% Match`}
                </div>
              )}
              {discountPercent > 0 && (
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-md text-white text-[11px] font-semibold">
                  <Tag className="w-3 h-3" />
                  {discountPercent}% OFF
                </div>
              )}
            </div>

            {/* ===== Wishlist heart (top-right, always visible) ===== */}
            <div className="absolute top-3 right-3">
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                animate={wishlistAnimating ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.4 }}
                onClick={handleWishlistClick}
                aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
                aria-pressed={saved}
                className={`w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  saved
                    ? 'bg-primary text-white shadow-glow'
                    : 'bg-black/50 text-white hover:bg-primary/80'
                }`}
              >
                <Heart
                  className={`w-4 h-4 transition-all duration-300 ${
                    saved ? 'fill-white text-white' : 'text-white'
                  }`}
                />
              </motion.button>
            </div>
          </div>

          {/* ===== Content ===== */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-xs sm:text-sm font-semibold text-primary truncate">
                {product.brand}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                <span className="text-xs sm:text-sm font-medium">{product.rating}</span>
                <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  ({reviews.toLocaleString()})
                </span>
              </div>
            </div>

            <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1">
              {product.name}
            </h3>

            {product.category && (
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {product.category}
              </p>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base sm:text-lg">{displayPrice}</span>
              {displayOriginalPrice && (
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-through">
                  {displayOriginalPrice}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-[11px] sm:text-xs text-green-500 font-semibold">
                  {discountPercent}% off
                </span>
              )}
            </div>
          </div>
        </div>
      </TiltCard>
    </motion.div>
  )
}
