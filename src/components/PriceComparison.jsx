import { motion } from 'framer-motion'
import { Check, Truck, Tag, BadgePercent, Crown } from 'lucide-react'
import Reveal from './ui/Reveal'

const stores = [
  {
    name: 'Amazon',
    price: '₹1,199',
    delivery: 'Free · 2 days',
    discount: '20% off',
    coupon: 'SAVE20',
    cheapest: false,
    color: '#FF9900'
  },
  {
    name: 'Myntra',
    price: '₹1,099',
    delivery: 'Free · 3 days',
    discount: '25% off',
    coupon: 'MYNTRA25',
    cheapest: false,
    color: '#FF3F6C'
  },
  {
    name: 'Ajio',
    price: '₹999',
    delivery: 'Free · 4 days',
    discount: '30% off',
    coupon: 'AJIO30',
    cheapest: true,
    color: '#2E5BFF'
  },
  {
    name: 'Flipkart',
    price: '₹1,249',
    delivery: '₹49 · 2 days',
    discount: '15% off',
    coupon: 'FLIP15',
    cheapest: false,
    color: '#2874F0'
  }
]

export default function PriceComparison() {
  return (
    <section id="compare" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            Smart <span className="text-shine">Price Comparison</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
            We scan every store to find you the best deal
          </p>
        </Reveal>

        <div className="grid gap-4">
          {stores.map((store, i) => (
            <Reveal key={store.name} delay={i * 0.1}>
              <motion.div
                whileHover={{ scale: 1.02, x: 10 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className={`relative rounded-4xl p-6 flex items-center gap-6 transition-all duration-300 ${
                  store.cheapest
                    ? 'glass dark:glass glow-border shadow-glow'
                    : 'glass dark:glass'
                }`}
              >
                {store.cheapest && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: 'spring' }}
                    className="absolute -top-3 -right-3 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold shadow-lg"
                  >
                    <Crown className="w-3 h-3" />
                    BEST PRICE
                  </motion.div>
                )}

                {/* Store logo */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-display font-bold text-white text-sm shrink-0"
                  style={{ backgroundColor: store.color }}
                >
                  {store.name.slice(0, 2).toUpperCase()}
                </div>

                {/* Store info */}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{store.name}</h3>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                      <Truck className="w-4 h-4" />
                      {store.delivery}
                    </span>
                    <span className="flex items-center gap-1 text-green-500">
                      <BadgePercent className="w-4 h-4" />
                      {store.discount}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Tag className="w-4 h-4" />
                      {store.coupon}
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className={`font-display text-2xl font-bold ${store.cheapest ? 'gradient-text' : ''}`}>
                    {store.price}
                  </div>
                  {store.cheapest && (
                    <div className="text-xs text-green-500 font-semibold mt-1 flex items-center gap-1 justify-end">
                      <Check className="w-3 h-3" />
                      Save ₹500
                    </div>
                  )}
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}