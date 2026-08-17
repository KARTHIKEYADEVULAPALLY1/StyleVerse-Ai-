import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShoppingCart, Heart, Star, Tag, Truck, Loader2, AlertTriangle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { parsePrice } from '../data/products'
import { fetchProductById } from '../services/productService'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import PriceComparison from './PriceComparison'

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isInWishlist, toggleWishlist } = useWishlist()
  const { addToCart } = useCart()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProduct() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchProductById(id)
        if (!cancelled) {
          setProduct(data)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load product.')
          setLoading(false)
        }
      }
    }

    loadProduct()
    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (product?.sizes?.length) {
      setSelectedSize(product.sizes[0])
    }
  }, [product])

  const isSaved = product ? isInWishlist(product.id) : false

  if (loading) {
    return (
      <section className="relative py-24 overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="font-display text-4xl font-normal tracking-tight mb-4">Loading product…</h2>
              <p className="text-gray-600 dark:text-gray-300">
                Fetching the latest details for this item.
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  if (error || !product) {
    return (
      <section className="relative py-24 overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <Reveal>
            <div className="rounded-4xl glass dark:glass p-16 text-center">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="font-display text-4xl font-normal tracking-tight mb-4">Product Not Found</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                {error || 'The product you are looking for is unavailable or no longer exists.'}
              </p>
              <MagneticButton
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to products
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    )
  }

  const originalPriceValue = parsePrice(product.originalPrice)
  const currentPriceValue = parsePrice(product.price)
  const discountPercent = Math.max(
    0,
    Math.round((1 - currentPriceValue / originalPriceValue) * 100)
  )

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 blur-[110px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass dark:glass text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <Reveal direction="right">
            <div className="rounded-4xl glass dark:glass p-4 sm:p-6 overflow-hidden">
              <div className="relative overflow-hidden rounded-3xl">
                <motion.img
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  src={product.image}
                  alt={product.name}
                  className="w-full h-[480px] sm:h-[560px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md px-3 py-1.5 text-white text-xs font-semibold">
                  <Tag className="w-3 h-3 text-yellow-400" />
                  {discountPercent}% OFF
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.1}>
            <div className="rounded-4xl glass dark:glass p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="text-sm font-semibold text-primary uppercase tracking-[0.2em]">{product.category}</span>
                <div className="flex items-center gap-1 rounded-full bg-white/5 px-2 py-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-medium">{product.rating}</span>
                </div>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-normal tracking-tight mb-4">{product.name}</h1>

              <div className="flex items-center gap-3 mb-6">
                <span className="text-lg text-gray-500 dark:text-gray-400 line-through">{product.originalPrice}</span>
                <span className="font-display text-3xl font-bold gradient-text">{product.price}</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-6">
                <Truck className="w-4 h-4 text-primary" />
                <span>Sold by {product.store}</span>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">Colors</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((color) => (
                      <span
                        key={color}
                        className="px-3 py-2 rounded-full glass dark:glass text-sm text-gray-700 dark:text-gray-200 border border-white/10"
                      >
                        {color}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-3">Sizes</h3>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium border transition-colors ${
                          selectedSize === size
                            ? 'bg-primary text-white border-primary'
                            : 'glass dark:glass border border-white/10 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <MagneticButton
                  onClick={() => addToCart(product, selectedSize, 1)}
                  className="flex-1 px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </MagneticButton>
                <MagneticButton
                  onClick={() => toggleWishlist(product)}
                  className={`flex-1 px-6 py-3 rounded-2xl font-semibold border transition-colors ${
                    isSaved
                      ? 'bg-primary text-white border-primary'
                      : 'glass dark:glass border border-white/10'
                  }`}
                >
                  <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-white text-white' : 'text-primary'}`} />
                  {isSaved ? 'Saved to Wishlist' : 'Add to Wishlist'}
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </div>
      </div>

      <PriceComparison productId={product.id} />
    </section>
  )
}
