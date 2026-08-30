import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, Link } from 'react-router-dom'
import { Loader2, AlertTriangle, Globe } from 'lucide-react'
import Reveal from './components/ui/Reveal'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './components/ui/Toast'
import ErrorBoundary from './components/ui/ErrorBoundary'
import CursorGlow from './components/ui/CursorGlow'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AISearch from './components/AISearch'
import TrendingProducts from './components/TrendingProducts'
import RecommendationsRail from './components/ui/RecommendationsRail'
import AIFeatures from './components/AIFeatures'
import HowItWorks from './components/HowItWorks'
import FinalCTA from './components/FinalCTA'
import VirtualTryOn from './components/VirtualTryOn'
import AIStylist from './components/AIStylist'
import Wishlist from './components/Wishlist'
import CartSection from './components/CartSection'
import About from './components/About'
import Profile from './components/Profile'
import Footer from './components/Footer'
import ProductDetails from './components/ProductDetails'
import MultiStoreDiscovery from './components/MultiStoreDiscovery'
import AdminMerchantDashboard from './components/AdminMerchantDashboard'
import AdminCatalogDashboard from './components/AdminCatalogDashboard'
import AdminAnalyticsDashboard from './components/AdminAnalyticsDashboard'
import LoginPage from './components/LoginPage'
import StyleOnboarding from './components/StyleOnboarding'
import OrderConfirmation from './components/OrderConfirmation'
import OrderHistory from './components/OrderHistory'
import { fetchProducts, searchProducts } from './services/productService'
import { fetchRecommendations } from './services/recommendationService'
import { trackSearch } from './services/analyticsService'
import { filterProducts, priceOptions } from './data/products'
import { useAuth } from './context/AuthContext'

function HomePage() {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedBrand, setSelectedBrand] = useState('All')
  const [selectedMaxPrice, setSelectedMaxPrice] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recommendedProducts, setRecommendedProducts] = useState([])
  const [recommendLoading, setRecommendLoading] = useState(false)
  const [recommendError, setRecommendError] = useState(null)

  // Brief loading state when filters change so the grid shows skeletons,
  // avoiding flashing unrelated content or an empty gap.
  const [filterLoading, setFilterLoading] = useState(false)
  const isFirstFilterRender = useRef(true)

  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false
      return
    }
    setFilterLoading(true)
    const timer = setTimeout(() => {
      setFilterLoading(false)
    }, 350)
    return () => clearTimeout(timer)
  }, [selectedCategory, selectedBrand, selectedMaxPrice])

  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

  // Track ONE search event per completed search (debounced + non-empty +
  // different from the previous term) - never per keystroke.
  const lastTrackedSearch = useRef('')
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery === lastTrackedSearch.current) {
      return
    }
    lastTrackedSearch.current = debouncedQuery
    trackSearch(debouncedQuery)
  }, [debouncedQuery])

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      try {
        setLoading(true)
        setError(null)

        const data = debouncedQuery
          ? await searchProducts(debouncedQuery)
          : await fetchProducts()

        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setProducts([])
          setError(err.message || 'Failed to load products.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  const { token, isAuthenticated } = useAuth()

  const loadRecommendations = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setRecommendedProducts([])
      setRecommendError(null)
      return
    }

    try {
      setRecommendLoading(true)
      setRecommendError(null)
      const data = await fetchRecommendations(token)
      setRecommendedProducts(Array.isArray(data) ? data : [])
    } catch (err) {
      setRecommendedProducts([])
      setRecommendError(err.message || 'Could not load recommendations.')
    } finally {
      setRecommendLoading(false)
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    loadRecommendations()
  }, [loadRecommendations])

  const productCategories = useMemo(
    () => ['All', ...new Set(products.map((product) => product.category).filter(Boolean))],
    [products]
  )

  const productBrands = useMemo(
    () => ['All', ...new Set(products.map((product) => product.brand).filter(Boolean))],
    [products]
  )

  const filteredProducts = useMemo(
    () =>
      filterProducts(products, {
        query,
        category: selectedCategory,
        brand: selectedBrand,
        maxPrice: selectedMaxPrice
      }),
    [products, query, selectedCategory, selectedBrand, selectedMaxPrice]
  )

  return (
    <>
      <Navbar />
      <main className="relative z-10">
        <Hero />
        {/* Entry point into the Multi-Store Discovery experience. */}
        <Reveal className="flex justify-center -mt-2 mb-8 px-4">
          <Link
            to="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass dark:glass border border-primary/30 font-semibold text-sm sm:text-base text-primary hover:border-primary hover:shadow-glow transition-all min-h-[44px]"
          >
            <Globe className="w-4 h-4" />
            Discover Fashion Everywhere
          </Link>
        </Reveal>
        <AISearch
          query={query}
          onQueryChange={setQuery}
          category={selectedCategory}
          onCategoryChange={setSelectedCategory}
          brand={selectedBrand}
          onBrandChange={setSelectedBrand}
          maxPrice={selectedMaxPrice}
          onMaxPriceChange={setSelectedMaxPrice}
          categories={productCategories}
          brands={productBrands}
          priceOptions={priceOptions}
          resultCount={filteredProducts.length}
          loading={loading}
        />
        {isAuthenticated && (
          <RecommendationsRail
            products={recommendedProducts}
            loading={recommendLoading}
            error={recommendError}
            isAuthenticated={isAuthenticated}
            onRetry={loadRecommendations}
          />
        )}
        <TrendingProducts products={filteredProducts} loading={loading || filterLoading} error={error} />
        <AIFeatures />
        <HowItWorks />
        <VirtualTryOn />
        <AIStylist />
        <Wishlist />
        <CartSection />
        <About />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}

function ProtectedOrders() {
  const { isAuthenticated, initialising } = useAuth()

  if (initialising) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <OrderHistory />
}

function ProtectedDashboard() {
  const { isAuthenticated, initialising } = useAuth()

  if (initialising) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Profile />
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <div className="min-h-screen relative">
                  <CursorGlow />
                  <div className="noise-overlay" />

                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/discover" element={<MultiStoreDiscovery />} />
                    <Route path="/admin/merchants" element={<AdminMerchantDashboard />} />
                    <Route path="/admin/catalog" element={<AdminCatalogDashboard />} />
                    <Route path="/admin/analytics" element={<AdminAnalyticsDashboard />} />
                    <Route path="/product/:id" element={<ProductDetails />} />
                    <Route path="/order/:id" element={<OrderConfirmation />} />
                    <Route path="/orders" element={<ProtectedOrders />} />
                    <Route path="/profile" element={<ProtectedDashboard />} />
                    <Route path="/onboarding" element={<StyleOnboarding />} />
                    <Route path="/login" element={<LoginPage initialMode="login" />} />
                    <Route path="/signup" element={<LoginPage initialMode="signup" />} />
                  </Routes>
                </div>
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}