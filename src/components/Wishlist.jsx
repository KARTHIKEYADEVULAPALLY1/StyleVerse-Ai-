import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Trash2, ShoppingBag, Share2, Bell, Star, Tag, ImageOff } from 'lucide-react'
import Reveal from './ui/Reveal'
import TiltCard from './ui/TiltCard'
import MagneticButton from './ui/MagneticButton'
import { useWishlist } from '../context/WishlistContext'
import { useNavigate } from 'react-router-dom'
import { EmptyState } from './ui/ProductState'

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

function WishlistCard({ item, notifyEnabled, onToggleNotify, onRemove, onView }) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const priceValue = parsePriceValue(item.price)
  const originalPriceValue = parsePriceValue(item.originalPrice || item.original_price)
  const discountPercent = originalPriceValue > 0
    ? Math.round((1 - priceValue / originalPriceValue) * 100)
    : 0
  const displayOriginalPrice = formatPrice(item.originalPrice || item.original_price)
  const displayPrice = formatPrice(item.price)

  return (
    <TiltCard className="h-full">
      <div className="group relative rounded-4xl overflow-hidden glass dark:glass h-full transition-all duration-500 hover:shadow-glow hover:-translate-y-1.5">
        {/* Image */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-gray-800">
          {!imageError ? (
            <>
              <img
                src={item.image}
                alt={item.name}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <div className="w-14 h-14 rounded-2xl bg-white/60 dark:bg-white/10 flex items-center justify-center">
                <ImageOff className="w-6 h-6 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Image unavailable</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
            {item.priceDrop && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-500 text-white text-[11px] font-semibold">
                <Bell className="w-3 h-3" />
                Price Dropped!
              </div>
            )}
            {discountPercent > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/90 text-white text-[11px] font-semibold">
                <Tag className="w-3 h-3" />
                {discountPercent}% OFF
              </div>
            )}
          </div>

          {/* Out of stock badge */}
          {!item.inStock && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-red-500 text-white text-[11px] font-semibold">
              Out of Stock
            </div>
          )}

          {/* Remove button */}
          <button
            onClick={() => onRemove(item.id)}
            aria-label={`Remove ${item.name} from wishlist`}
            className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-red-500 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-4 sm:p-5 cursor-pointer"
          onClick={() => onView(item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onView(item.id)
            }
          }}
          aria-label={`Open details for ${item.name}`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs sm:text-sm font-semibold text-primary truncate">{item.brand}</span>
            <div className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              <span className="text-xs sm:text-sm font-medium">{item.rating || 4.5}</span>
            </div>
          </div>
          <h3 className="font-semibold text-sm sm:text-base mb-1 line-clamp-1">{item.name}</h3>
          {item.category && (
            <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">{item.category}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="font-bold text-base sm:text-lg">{displayPrice}</span>
            {displayOriginalPrice && (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 line-through">{displayOriginalPrice}</span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <MagneticButton className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-glow">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Buy Now
            </MagneticButton>
            <button
              onClick={() => onToggleNotify(item.id)}
              aria-label={notifyEnabled ? `Disable price notifications for ${item.name}` : `Enable price notifications for ${item.name}`}
              aria-pressed={notifyEnabled}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                notifyEnabled
                  ? 'bg-primary text-white'
                  : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
              }`}
            >
              <Bell className="w-4 h-4" />
            </button>
            <button
              aria-label={`Share ${item.name}`}
              className="w-10 h-10 rounded-xl glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          {notifyEnabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-3 text-xs text-green-500 font-medium"
            >
              ✓ We'll notify you when the price drops
            </motion.div>
          )}
        </div>
      </div>
    </TiltCard>
  )
}

export default function Wishlist() {
  const { wishlistProducts, removeFromWishlist, loading, error } = useWishlist()
  const navigate = useNavigate()
  const [notifyEnabled, setNotifyEnabled] = useState({})

  const wishlist = useMemo(
    () =>
      wishlistProducts.map((product, index) => ({
        ...product,
        inStock: product.id !== 4,
        priceDrop: index === 0 || product.id === 4,
      })),
    [wishlistProducts]
  )

  useEffect(() => {
    setNotifyEnabled((prev) => {
      const next = {}
      wishlist.forEach((item) => {
        next[item.id] = Boolean(prev[item.id])
      })
      return next
    })
  }, [wishlist])

  const removeItem = (id) => {
    removeFromWishlist(id)
  }

  const toggleNotify = (id) => {
    setNotifyEnabled((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleViewProduct = (productId) => {
    navigate(`/product/${productId}`)
  }

  return (
    <section id="wishlist" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
              My <span className="text-shine">Wishlist</span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
              Track prices and get notified when items go on sale
            </p>
          </div>
          {!loading && wishlist.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full glass dark:glass">
              <Heart className="w-4 h-4 text-primary fill-primary" />
              <span className="text-sm font-semibold">{wishlist.length} items</span>
            </div>
          )}
        </Reveal>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading wishlist">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-4xl glass dark:glass overflow-hidden">
                <div className="aspect-[4/5] bg-gray-200 dark:bg-gray-800 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                  <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                  <div className="h-5 w-28 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-4xl glass dark:glass p-10 sm:p-14 text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-5">
              <Bell className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
            </div>
            <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">Unable to load wishlist</h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">{error}</p>
            <MagneticButton
              onClick={() => document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl glass dark:glass font-semibold text-sm"
            >
              Try Again
            </MagneticButton>
          </div>
        ) : wishlist.length === 0 ? (
          <EmptyState
            title="Your wishlist is empty"
            message="Save items you love and we'll track prices for you"
            actionLabel="Explore Products"
            onAction={() => navigate('/')}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {wishlist.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <WishlistCard
                    item={item}
                    notifyEnabled={notifyEnabled[item.id]}
                    onToggleNotify={toggleNotify}
                    onRemove={removeItem}
                    onView={handleViewProduct}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  )
}