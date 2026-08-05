import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, RotateCw, ZoomIn, Shirt, RefreshCw, Check } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

const fitMetrics = [
  { label: 'Shoulder Fit', value: 92, color: '#FF2E88' },
  { label: 'Sleeve Length', value: 88, color: '#8B5CF6' },
  { label: 'Body Shape Match', value: 95, color: '#FF2E88' },
  { label: 'Comfort', value: 90, color: '#8B5CF6' },
  { label: 'Trend Score', value: 96, color: '#FF2E88' },
  { label: 'Color Match', value: 93, color: '#8B5CF6' }
]

const clothingOptions = [
  { id: 1, name: 'Oversized Hoodie', color: '#FF2E88' },
  { id: 2, name: 'Denim Jacket', color: '#8B5CF6' },
  { id: 3, name: 'White Tee', color: '#FFFFFF' },
  { id: 4, name: 'Black Blazer', color: '#333333' }
]

export default function VirtualTryOn() {
  const [uploaded, setUploaded] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [selectedClothing, setSelectedClothing] = useState(1)
  const [rotating, setRotating] = useState(false)
  const [zoomed, setZoomed] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => {
    setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    setUploaded(true)
  }

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
          {/* Left - Upload */}
          <Reveal direction="right">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-4xl glass dark:glass p-8 h-full flex flex-col items-center justify-center text-center transition-all duration-300 ${
                dragging ? 'border-2 border-primary scale-[1.02]' : ''
              }`}
            >
              <AnimatePresence mode="wait">
                {!uploaded ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center"
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
                      Drag & drop or click to upload
                    </p>
                    <MagneticButton
                      onClick={() => setUploaded(true)}
                      className="px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow"
                    >
                      Choose Photo
                    </MagneticButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="uploaded"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full"
                  >
                    <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-gradient-to-br from-primary/10 to-secondary/10 mb-6">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full btn-fashion mx-auto mb-4 flex items-center justify-center shadow-glow">
                            <Check className="w-8 h-8 text-white" />
                          </div>
                          <p className="font-semibold">Photo Uploaded!</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">AI is analyzing your body type...</p>
                        </div>
                      </div>
                    </div>
                    <MagneticButton
                      onClick={() => setUploaded(false)}
                      className="w-full px-6 py-3 rounded-2xl glass dark:glass font-semibold"
                    >
                      Upload Different Photo
                    </MagneticButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>

          {/* Right - Avatar Viewer */}
          <Reveal direction="left" delay={0.2}>
            <div className="rounded-4xl glass dark:glass p-6 h-full">
              {/* Controls */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-xl font-normal">Interactive Avatar</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setRotating(!rotating)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      rotating ? 'btn-fashion text-white shadow-glow' : 'glass dark:glass'
                    }`}
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoomed(!zoomed)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      zoomed ? 'btn-fashion text-white shadow-glow' : 'glass dark:glass'
                    }`}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Avatar */}
              <div className="relative rounded-3xl overflow-hidden aspect-[3/4] bg-gradient-to-br from-primary/10 via-transparent to-secondary/10 mb-6">
                <motion.div
                  animate={{
                    rotateY: rotating ? 360 : 0,
                    scale: zoomed ? 1.2 : 1
                  }}
                  transition={{
                    rotateY: { duration: 4, repeat: rotating ? Infinity : 0, ease: 'linear' },
                    scale: { duration: 0.5 }
                  }}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Simple avatar silhouette */}
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 mx-auto mb-2" />
                    <div className="w-40 h-56 rounded-t-[100px] rounded-b-3xl bg-gradient-to-br from-primary/20 to-secondary/20 mx-auto relative overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={selectedClothing}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0"
                          style={{
                            backgroundColor: clothingOptions.find(c => c.id === selectedClothing)?.color,
                            opacity: 0.3
                          }}
                        />
                      </AnimatePresence>
                    </div>
                    <div className="w-10 h-24 bg-gradient-to-br from-primary/20 to-secondary/20 mx-auto rounded-b-2xl" />
                  </div>
                </motion.div>
              </div>

              {/* Clothing options */}
              <div className="flex gap-2 flex-wrap">
                {clothingOptions.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedClothing(item.id)}
                    className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                      selectedClothing === item.id
                        ? 'btn-fashion text-white shadow-glow'
                        : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Shirt className="w-3 h-3" />
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Reveal>
        </div>

        {/* Fit Analysis */}
        <Reveal className="mt-16">
          <div className="rounded-4xl glass dark:glass p-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Score */}
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

              {/* Metrics */}
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