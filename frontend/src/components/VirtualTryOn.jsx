import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  Shirt,
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  ImageIcon,
  Sparkles,
} from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import { uploadTryOnImage, processTryOn, validateTryOnFile } from '../services/tryOnService'
import { fetchProducts } from '../services/productService'

const fitMetrics = [
  { label: 'Shoulder Fit', value: 92, color: '#FF2E88' },
  { label: 'Sleeve Length', value: 88, color: '#8B5CF6' },
  { label: 'Body Shape Match', value: 95, color: '#FF2E88' },
  { label: 'Comfort', value: 90, color: '#8B5CF6' },
  { label: 'Trend Score', value: 96, color: '#FF2E88' },
  { label: 'Color Match', value: 93, color: '#8B5CF6' }
]

export default function VirtualTryOn() {
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadState, setUploadState] = useState('idle')
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(1)
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState(null)
  const [generatedImageUrl, setGeneratedImageUrl] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProducts() {
      try {
        setProductsLoading(true)
        setProductsError(null)
        const data = await fetchProducts()
        if (!cancelled) {
          setProducts(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setProducts([])
          setProductsError(err.message || 'Failed to load products.')
        }
      } finally {
        if (!cancelled) {
          setProductsLoading(false)
        }
      }
    }

    loadProducts()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const resetUpload = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl('')
    setUploadResult(null)
    setUploadProgress(0)
    setUploadState('idle')
    setError(null)
    setGeneratedImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleFileSelection = (file) => {
    const validationError = validateTryOnFile(file)
    if (validationError) {
      setError(validationError)
      setUploadState('error')
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setUploadResult(null)
    setUploadProgress(0)
    setUploadState('preview')
    setError(null)
    setGeneratedImageUrl('')
  }

  const handleInputChange = (event) => {
    const file = event.target.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }

  const handleDragOver = (event) => {
    event.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (event) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      handleFileSelection(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadState('uploading')
      setError(null)
      setUploadProgress(0)

      const result = await uploadTryOnImage(selectedFile, {
        onProgress: setUploadProgress,
      })

      setUploadResult(result)
      setUploadState('processing')
      setUploadProgress(100)

      // Start the real virtual try-on processing.
      const processResponse = await processTryOn(result.upload_id, selectedProductId)

      if (processResponse?.status === 'completed' && processResponse?.result_image) {
        setGeneratedImageUrl(
          `${import.meta.env.VITE_TRYON_API_URL?.replace(/\/api\/try-on$/, '') || 'http://127.0.0.1:8000'}${processResponse.result_image}`
        )
        setUploadState('success')
      } else {
        throw new Error(processResponse?.message || 'Virtual try-on did not produce a result image.')
      }
    } catch (err) {
      setError(err.message || 'Unable to complete virtual try-on.')
      setUploadState('error')
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const isUploading = uploadState === 'uploading'
  const isProcessing = uploadState === 'processing'
  const showPreview = ['preview', 'uploading', 'error'].includes(uploadState) && previewUrl
  const showSuccess = uploadState === 'success'

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  )

  return (
    <section id="try-on" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            Virtual <span className="text-shine">Try-On</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
            See how clothes look on you before you buy
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8">
          <Reveal direction="right">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-4xl glass dark:glass p-8 h-full flex flex-col items-center justify-center text-center transition-all duration-300 ${
                dragging ? 'border-2 border-primary scale-[1.02]' : ''
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleInputChange}
              />

              <AnimatePresence mode="wait">
                {!showPreview && !showSuccess && uploadState !== 'error' && (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center w-full"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-6"
                    >
                      <Upload className="w-8 h-8 text-primary" />
                    </motion.div>
                    <h3 className="font-display text-2xl font-normal mb-2">Upload Your Photo</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 font-light tracking-wide">
                      Drag & drop or click to upload a JPG or PNG (max 5 MB)
                    </p>
                    <MagneticButton
                      onClick={openFilePicker}
                      className="px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow"
                    >
                      Choose Photo
                    </MagneticButton>
                  </motion.div>
                )}

                {showPreview && !showSuccess && (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="w-full"
                  >
                    <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-gradient-to-br from-primary/10 to-secondary/10 mb-6">
                      <img
                        src={previewUrl}
                        alt="Selected try-on preview"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                          <Loader2 className="w-10 h-10 animate-spin mb-4" />
                          <p className="font-semibold">Uploading photo…</p>
                          <p className="text-sm text-white/80 mt-1">{uploadProgress}%</p>
                          <div className="w-48 h-2 rounded-full bg-white/20 overflow-hidden mt-4">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                          <Sparkles className="w-10 h-10 animate-pulse mb-4 text-primary" />
                          <p className="font-semibold">Generating your try-on…</p>
                          <div className="mt-4 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-xs text-white/80">
                              {selectedProduct ? `Wearing: ${selectedProduct.name}` : 'Applying garment'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {uploadState === 'error' && error && (
                      <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-left">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-200">{error}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-3">
                      <MagneticButton
                        onClick={handleUpload}
                        disabled={isUploading || isProcessing}
                        className="flex-1 px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isUploading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading…
                          </>
                        ) : isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating…
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Try-On
                          </>
                        )}
                      </MagneticButton>
                      <MagneticButton
                        onClick={resetUpload}
                        disabled={isUploading || isProcessing}
                        className="flex-1 px-6 py-3 rounded-2xl glass dark:glass font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        Choose Different Photo
                      </MagneticButton>
                    </div>
                  </motion.div>
                )}

                {uploadState === 'error' && !showPreview && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    className="w-full text-center"
                  >
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-6">
                      <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="font-display text-2xl font-normal mb-2">Try-On Failed</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
                    <MagneticButton
                      onClick={resetUpload}
                      className="px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow"
                    >
                      Try Again
                    </MagneticButton>
                  </motion.div>
                )}

                {showSuccess && (
                  <motion.div
                    key="generated"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full"
                  >
                    <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-gradient-to-br from-primary/10 to-secondary/10 mb-6">
                      {generatedImageUrl ? (
                        <img
                          src={generatedImageUrl}
                          alt="Generated virtual try-on result"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Uploaded try-on photo"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : null}
                      {generatedImageUrl && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          AI Generated
                        </div>
                      )}
                    </div>
                    <MagneticButton
                      onClick={resetUpload}
                      className="w-full px-6 py-3 rounded-2xl glass dark:glass font-semibold"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 inline-block" />
                      Try Another Product
                    </MagneticButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          <Reveal direction="left" delay={0.2}>
            <div className="rounded-4xl glass dark:glass p-6 h-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-normal">Select Product</h3>
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-primary" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {products.length} items
                  </span>
                </div>
              </div>

              {productsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Loading products…</span>
                </div>
              ) : productsError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-6 text-center">
                  <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-sm text-red-200">{productsError}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {products.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => setSelectedProductId(product.id)}
                      className={`relative rounded-2xl overflow-hidden aspect-[3/4] transition-all duration-300 ${
                        selectedProductId === product.id
                          ? 'ring-2 ring-primary shadow-glow scale-[1.02]'
                          : 'hover:scale-[1.01]'
                      }`}
                    >
                      <img
                        src={product.image}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-2">
                        <p className="text-[10px] text-white font-medium leading-tight truncate">
                          {product.name}
                        </p>
                        <p className="text-[9px] text-white/70">{product.brand}</p>
                      </div>
                      {selectedProductId === product.id && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full btn-fashion flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {selectedProduct && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3">
                  <p className="text-sm font-medium text-shine">{selectedProduct.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {selectedProduct.brand} • {selectedProduct.category} • {selectedProduct.price}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <h4 className="font-display text-base font-normal mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-secondary" />
                  How it works
                </h4>
                <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300 font-light">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full btn-fashion text-white text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                    Upload a clear photo of yourself (JPG/PNG, max 5 MB)
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full btn-fashion text-white text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                    Choose a product from the catalog on the right
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full btn-fashion text-white text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                    Generate your AI try-on and see the garment on you
                  </li>
                </ol>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-16">
          <div className="rounded-4xl glass dark:glass p-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              <div className="text-center">
                <div className="relative w-48 h-48 mx-auto">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="12"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <motion.circle
                      cx="100"
                      cy="100"
                      r="90"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="12"
                      strokeLinecap="round"
                      initial={{ strokeDasharray: 565, strokeDashoffset: 565 }}
                      whileInView={{ strokeDashoffset: 565 * (1 - 0.94) }}
                      viewport={{ once: true }}
                      transition={{ duration: 2, ease: 'easeOut' }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FF2E88" />
                        <stop offset="100%" stopColor="#8B5CF6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 }}
                        className="font-display text-5xl font-normal text-shine"
                      >
                        94%
                      </motion.div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">AI Fit Score</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {fitMetrics.map((metric, i) => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{metric.label}</span>
                      <span className="text-gray-500 dark:text-gray-400">{metric.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${metric.value}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.5, delay: i * 0.1, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}