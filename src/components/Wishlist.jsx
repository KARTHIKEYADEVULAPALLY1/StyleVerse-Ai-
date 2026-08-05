import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Trash2, ShoppingBag, Share2, Bell, Star } from 'lucide-react'
import Reveal from './ui/Reveal'
import TiltCard from './ui/TiltCard'
import MagneticButton from './ui/MagneticButton'

const initialWishlist = [
  {
    id: 1,
    name: 'Oversized Graphic Hoodie',
    brand: 'H&M',
    price: '₹1,299',
    originalPrice: '₹2,499',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&q=80',
    inStock: true,
    priceDrop: true
  },
  {
    id: 2,
    name: 'Classic White Sneakers',
    brand: 'Nike',
    price: '₹4,999',
    originalPrice: '₹6,999',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80',
    inStock: true,
    priceDrop: false
  },
  {
    id: 3,
    name: 'Minimalist Watch',
    brand: 'Daniel Wellington',
    price: '₹8,999',
    originalPrice: '₹12,999',
    image: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&q=80',
    inStock: false,
    priceDrop: true
  }
]

export default function Wishlist() {
  const [wishlist, setWishlist] = useState(initialWishlist)
  const [notifyEnabled, setNotifyEnabled] = useState({})

  const removeItem = (id) => {
    setWishlist(wishlist.filter(item => item.id !== id))
  }

  const toggleNotify = (id) => {
    setNotifyEnabled(prev => ({ ...prev, [id]: !prev[id] }))
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
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full glass dark:glass">
            <Heart className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm font-semibold">{wishlist.length} items</span>
          </div>
        </Reveal>

        {wishlist.length === 0 ? (
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6"
              >
                <Heart className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="font-display text-2xl font-bold mb-2">Your wishlist is empty</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Save items you love and we'll track prices for you
              </p>
              <MagneticButton className="px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold shadow-glow">
                Explore Products
              </MagneticButton>
            </div>
          </Reveal>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {wishlist.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <TiltCard className="h-full">
                    <div className="group relative rounded-4xl overflow-hidden glass dark:glass h-full">
                      {/* Image */}
                      <div className="relative h-56 overflow-hidden">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                        {/* Price drop badge */}
                        {item.priceDrop && (
                          <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-500 text-white text-xs font-semibold">
                            <Bell className="w-3 h-3" />
                            Price Dropped!
                          </div>
                        )}

                        {/* Out of stock badge */}
                        {!item.inStock && (
                          <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                            Out of Stock
                          </div>
                        )}

                        {/* Remove button */}
                        <button
                          onClick={() => removeItem(item.id)}
                          className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center hover:bg-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-primary">{item.brand}</span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">4.5</span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.name}</h3>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="font-bold text-xl">{item.price}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 line-through">{item.originalPrice}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <MagneticButton className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-glow">
                            <ShoppingBag className="w-4 h-4 mr-2" />
                            Buy Now
                          </MagneticButton>
                          <button
                            onClick={() => toggleNotify(item.id)}
                            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                              notifyEnabled[item.id]
                                ? 'bg-primary text-white'
                                : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                            }`}
                          >
                            <Bell className="w-4 h-4" />
                          </button>
                          <button className="w-10 h-10 rounded-xl glass dark:glass flex items-center justify-center hover:bg-white/10 dark:hover:bg-white/10 transition-colors">
                            <Share2 className="w-4 h-4" />
                          </button>
                        </div>

                        {notifyEnabled[item.id] && (
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  )
}