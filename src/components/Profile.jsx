import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Mail,
  LogOut,
  Heart,
  ShoppingCart,
  Package,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  Calendar,
  ChevronRight,
  Wand2,
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  ShieldCheck,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import { fetchOrders } from '../services/orderService'
import { fetchRecommendations } from '../services/recommendationService'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import ProductCard from './ui/ProductCard'
import ProductSkeleton from './ui/ProductSkeleton'
import { EmptyState, ErrorState } from './ui/ProductState'
import RecommendationsRail from './ui/RecommendationsRail'
import StyleProfile from './StyleProfile'

const statusStyles = {
  delivered: 'text-green-500 bg-green-500/10 border-green-500/20',
  shipped: 'text-primary bg-primary/10 border-primary/20',
  processing: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  cancelled: 'text-red-500 bg-red-500/10 border-red-500/20',
  pending: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
}

const statusIcons = {
  delivered: CheckCircle2,
  shipped: Truck,
  processing: Clock,
  cancelled: XCircle,
  pending: Clock,
}

function formatDate(dateString) {
  if (!dateString) return '—'
  try {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function formatPrice(value) {
  if (value === null || value === undefined) return '—'
  const num = Number(String(value).replace(/[^\d.]/g, ''))
  if (isNaN(num)) return String(value)
  return `₹${num.toLocaleString('en-IN')}`
}

function getInitials(name) {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function StatCard({ icon: Icon, label, value, loading, error, accent = 'from-primary to-secondary', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="rounded-4xl glass dark:glass p-6 relative overflow-hidden group"
    >
      <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${accent} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent} flex items-center justify-center shadow-glow`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {loading && (
          <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        )}
      </div>
      {error ? (
        <p className="text-sm text-red-500 font-medium">Unavailable</p>
      ) : loading ? (
        <div className="space-y-2">
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
          <div className="h-3 w-24 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      ) : (
        <>
          <div className="font-display text-3xl font-bold gradient-text">{value}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-medium">{label}</div>
        </>
      )}
    </motion.div>
  )
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, token, isAuthenticated, logout } = useAuth()
  const { wishlistProducts, loading: wishlistLoading, error: wishlistError } = useWishlist()
  const { totalItems, loading: cartLoading, error: cartError } = useCart()

  // Order + recommendation data is fetched locally on this page only.
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState(null)

  const [recommendations, setRecommendations] = useState([])
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendError, setRecommendError] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setOrders([])
      setOrdersError(null)
      setRecommendations([])
      setRecommendError(null)
      return
    }

    let cancelled = false

    async function loadOrders() {
      try {
        setOrdersLoading(true)
        setOrdersError(null)
        const data = await fetchOrders(token)
        if (!cancelled) {
          setOrders(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setOrders([])
          setOrdersError(err.message || 'Unable to load orders.')
        }
      } finally {
        if (!cancelled) {
          setOrdersLoading(false)
        }
      }
    }

    async function loadRecommendations() {
      try {
        setRecommendLoading(true)
        setRecommendError(null)
        const data = await fetchRecommendations(token)
        if (!cancelled) {
          setRecommendations(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setRecommendations([])
          setRecommendError(err.message || 'Unable to load recommendations.')
        }
      } finally {
        if (!cancelled) {
          setRecommendLoading(false)
        }
      }
    }

    loadOrders()
    loadRecommendations()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, token])

  const goToSection = (sectionId) => {
    navigate('/')
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleViewProduct = (productId) => {
    navigate(`/product/${productId}`)
  }

  const handleViewOrder = (orderId) => {
    navigate(`/order/${orderId}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const memberSince = user?.created_at ? formatDate(user.created_at) : null

  const quickActions = [
    {
      label: 'Continue Shopping',
      description: 'Explore the latest trends',
      icon: ShoppingBag,
      onClick: () => navigate('/'),
      accent: 'from-primary to-secondary',
    },
    {
      label: 'Wishlist',
      description: `${wishlistProducts.length} saved items`,
      icon: Heart,
      onClick: () => goToSection('wishlist'),
      accent: 'from-pink-500 to-rose-500',
    },
    {
      label: 'Cart',
      description: `${totalItems} items in cart`,
      icon: ShoppingCart,
      onClick: () => goToSection('cart'),
      accent: 'from-amber-500 to-orange-500',
    },
    {
      label: 'Orders',
      description: `${orders.length} total orders`,
      icon: Package,
      onClick: () => navigate('/orders'),
      accent: 'from-blue-500 to-indigo-500',
    },
    {
      label: 'Virtual Try-On',
      description: 'See clothes on you',
      icon: Wand2,
      onClick: () => goToSection('try-on'),
      accent: 'from-purple-500 to-violet-500',
    },
  ]

  return (
    <div className="min-h-screen relative">
      <main className="relative z-10 pt-20">
        {/* ===== Profile Header ===== */}
        <section className="relative py-12 overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-secondary/10 blur-[100px] rounded-full" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="rounded-4xl glass dark:glass p-6 sm:p-8"
            >
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                    <span className="font-display text-3xl font-bold text-white">
                      {getInitials(user?.name)}
                    </span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-4 border-white dark:border-gray-900" />
                </div>

                {/* User Info */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <h1 className="font-display text-3xl sm:text-4xl font-bold">
                      {user?.name || 'Welcome'}
                    </h1>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-semibold w-fit mx-auto sm:mx-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active Account
                    </span>
                  </div>
                  <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <span className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      {user?.email || '—'}
                    </span>
                    {memberSince && (
                      <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                        <Calendar className="w-4 h-4 text-secondary" />
                        Member since {memberSince}
                      </span>
                    )}
                  </div>
                </div>

                {/* Logout */}
                <MagneticButton
                  onClick={handleLogout}
                  className="shrink-0 px-5 py-2.5 rounded-2xl glass dark:glass font-semibold text-sm hover:bg-red-500/10 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </MagneticButton>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== Overview Cards ===== */}
        <section className="relative py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Shopping <span className="text-shine">Overview</span>
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                Your fashion journey at a glance
              </p>
            </Reveal>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                icon={Heart}
                label="Wishlist Items"
                value={wishlistProducts.length}
                loading={wishlistLoading}
                error={wishlistError}
                accent="from-pink-500 to-rose-500"
                delay={0}
              />
              <StatCard
                icon={ShoppingCart}
                label="Cart Items"
                value={totalItems}
                loading={cartLoading}
                error={cartError}
                accent="from-amber-500 to-orange-500"
                delay={0.1}
              />
              <StatCard
                icon={Package}
                label="Total Orders"
                value={orders.length}
                loading={ordersLoading}
                error={ordersError}
                accent="from-blue-500 to-indigo-500"
                delay={0.2}
              />
              <StatCard
                icon={Sparkles}
                label="Recommended Products"
                value={recommendations.length}
                loading={recommendLoading}
                error={recommendError}
                accent="from-purple-500 to-violet-500"
                delay={0.3}
              />
            </div>
          </div>
        </section>

        {/* ===== My Style Profile ===== */}
        <StyleProfile token={token} authenticated={false} />

        {/* ===== Recent Orders ===== */}
        <section id="recent-orders" className="relative py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">
                  Recent <span className="text-shine">Orders</span>
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                  Your latest purchases
                </p>
              </div>
              {orders.length > 0 && (
                <MagneticButton
                  onClick={() => navigate('/orders')}
                  className="hidden sm:inline-flex px-4 py-2 rounded-2xl glass dark:glass font-semibold text-sm"
                >
                  View All
                  <ChevronRight className="w-4 h-4 ml-1" />
                </MagneticButton>
              )}
            </Reveal>

            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-4xl glass dark:glass p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                        <div className="h-3 w-48 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
                      </div>
                      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : ordersError ? (
              <ErrorState
                message={ordersError}
                onRetry={() => {
                  setOrdersLoading(true)
                  setOrdersError(null)
                  fetchOrders(token)
                    .then((data) => setOrders(Array.isArray(data) ? data : []))
                    .catch((err) => setOrdersError(err.message || 'Unable to load orders.'))
                    .finally(() => setOrdersLoading(false))
                }}
              />
            ) : orders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No orders yet"
                message="When you place an order, it will appear here so you can track its status and details."
                actionLabel="Start Shopping"
                onAction={() => navigate('/')}
              />
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 3).map((order, i) => {
                  const StatusIcon = statusIcons[order.status?.toLowerCase()] || Package
                  const statusClass = statusStyles[order.status?.toLowerCase()] || 'text-gray-500 bg-gray-500/10 border-gray-500/20'
                  const itemCount = Array.isArray(order.items)
                    ? order.items.reduce((sum, item) => sum + Number(item.quantity || 1), 0)
                    : 0

                  return (
                    <motion.button
                      key={order.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.5 }}
                      onClick={() => handleViewOrder(order.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleViewOrder(order.id)
                        }
                      }}
                      className="w-full text-left rounded-4xl glass dark:glass p-5 sm:p-6 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-300 group cursor-pointer"
                      aria-label={`View order ${order.id}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-semibold text-sm sm:text-base">
                              Order #{order.id}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                              {formatDate(order.created_at)} · {itemCount} item{itemCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <div className="font-bold text-base sm:text-lg">
                              {formatPrice(order.total_amount)}
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold mt-1 ${statusClass}`}>
                              <StatusIcon className="w-3 h-3" />
                              {order.status || 'Unknown'}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 shrink-0" />
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===== Wishlist Preview ===== */}
        <section className="relative py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="flex items-end justify-between mb-8">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-bold">
                  Your <span className="text-shine">Wishlist</span>
                </h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                  Products you've saved for later
                </p>
              </div>
              {wishlistProducts.length > 0 && (
                <MagneticButton
                  onClick={() => goToSection('wishlist')}
                  className="hidden sm:inline-flex px-4 py-2 rounded-2xl glass dark:glass font-semibold text-sm"
                >
                  View Wishlist
                  <ChevronRight className="w-4 h-4 ml-1" />
                </MagneticButton>
              )}
            </Reveal>

            {wishlistLoading ? (
              <div className="flex gap-6 overflow-x-auto no-scrollbar pb-4" aria-busy="true" aria-label="Loading wishlist">
                {[1, 2, 3, 4].map((i) => (
                  <ProductSkeleton key={i} />
                ))}
              </div>
            ) : wishlistError ? (
              <ErrorState
                message={wishlistError}
                onRetry={() => goToSection('wishlist')}
              />
            ) : wishlistProducts.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="Your wishlist is empty"
                message="Save products you love and they'll appear here for quick access."
                actionLabel="Explore Products"
                onAction={() => navigate('/')}
              />
            ) : (
              <>
                <div className="flex gap-6 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4">
                  {wishlistProducts.slice(0, 4).map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      showMatch={false}
                    />
                  ))}
                </div>
                <div className="mt-6 sm:hidden">
                  <MagneticButton
                    onClick={() => goToSection('wishlist')}
                    className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm"
                  >
                    View Wishlist
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </MagneticButton>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ===== Recommended For You (shared rail) ===== */}
        <RecommendationsRail
          products={recommendations}
          loading={recommendLoading}
          error={recommendError}
          isAuthenticated={isAuthenticated}
          onRetry={() => {
            setRecommendLoading(true)
            setRecommendError(null)
            fetchRecommendations(token)
              .then((data) => setRecommendations(Array.isArray(data) ? data : []))
              .catch((err) => setRecommendError(err.message || 'Unable to load recommendations.'))
              .finally(() => setRecommendLoading(false))
          }}
        />

        {/* ===== Privacy Notice ===== */}
        <section className="relative pb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div id="privacy-notice" className="rounded-4xl glass dark:glass p-6 flex flex-col sm:flex-row items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow shrink-0">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold">Your Privacy at StyleVerse</h3>
                  <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    StyleVerse uses your product interactions — views, searches, wishlist and cart
                    activity — to improve your recommendations. We never store passwords, payment
                    data, uploaded photos, IP addresses or device fingerprints in analytics, and
                    anonymous browsing stays anonymous.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ===== Quick Actions ===== */}
        <section className="relative py-12 pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Reveal className="mb-8">
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                Quick <span className="text-shine">Actions</span>
              </h2>
              <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                Jump right back into your shopping experience
              </p>
            </Reveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  onClick={action.onClick}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      action.onClick()
                    }
                  }}
                  className="group text-left rounded-4xl glass dark:glass p-6 hover:bg-white/10 dark:hover:bg-white/10 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  aria-label={action.label}
                >
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gradient-to-br ${action.accent} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${action.accent} flex items-center justify-center shadow-glow`}>
                      <action.icon className="w-5 h-5 text-white" />
                    </div>
                    <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{action.label}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{action.description}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}