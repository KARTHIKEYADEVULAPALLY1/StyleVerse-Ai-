import { useEffect, useMemo, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Loader2, AlertTriangle } from 'lucide-react'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { WishlistProvider } from './context/WishlistContext'
import { CartProvider } from './context/CartContext'
import CursorGlow from './components/ui/CursorGlow'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AISearch from './components/AISearch'
import TrendingProducts from './components/TrendingProducts'
import VirtualTryOn from './components/VirtualTryOn'
import AIStylist from './components/AIStylist'
import Wishlist from './components/Wishlist'
import CartSection from './components/CartSection'
import About from './components/About'
import Profile from './components/Profile'
import Footer from './components/Footer'
import ProductDetails from './components/ProductDetails'
import LoginPage from './components/LoginPage'
import OrderConfirmation from './components/OrderConfirmation'
import { fetchProducts, searchProducts } from './services/productService'
import { fetchRecommendations } from './services/recommendationService'
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

  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim())
    }, 350)

    return () => clearTimeout(timer)
  }, [query])

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

  useEffect(() => {
    let cancelled = false

    async function loadRecommendations() {
      if (!isAuthenticated || !token) {
        if (!cancelled) {
          setRecommendedProducts([])
          setRecommendError(null)
        }
        return
      }

      try {
        setRecommendLoading(true)
        setRecommendError(null)
        const data = await fetchRecommendations(token)
        if (!cancelled) {
          setRecommendedProducts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setRecommendedProducts([])
          setRecommendError(err.message || 'Could not load recommendations.')
        }
      } finally {
        if (!cancelled) {
          setRecommendLoading(false)
        }
      }
    }

    loadRecommendations()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, token])

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
        />
        {isAuthenticated && (
          <TrendingProducts
            products={recommendedProducts}
            loading={recommendLoading}
            error={recommendError}
            title="Recommended For You"
            subtitle="Based on your style and shopping activity"
            emptyTitle="No personal recommendations yet"
            emptyMessage="Keep exploring and saving products to unlock better recommendations."
            sectionId="recommendations"
          />
        )}
        <TrendingProducts products={filteredProducts} loading={loading} error={error} />
        <VirtualTryOn />
        <AIStylist />
        <Wishlist />
        <CartSection />
        <About />
        <Profile />
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <ThemeProvider>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <div className="min-h-screen relative">
              <CursorGlow />
              <div className="noise-overlay" />

              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/order/:id" element={<OrderConfirmation />} />
                <Route path="/login" element={<LoginPage initialMode="login" />} />
                <Route path="/signup" element={<LoginPage initialMode="signup" />} />
              </Routes>
            </div>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}