import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Sparkles, Shirt, Calendar, Palette, RefreshCw, Check, AlertTriangle, IndianRupee } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import ProductCard from './ui/ProductCard'
import ProductSkeleton from './ui/ProductSkeleton'
import { styleProfiles, occasions, colorPalettes } from '../data/fashionData'
import { recommendOutfit } from '../services/stylistService'
import { trackAiStylistUsed } from '../services/analyticsService'

const budgetOptions = [1000, 2000, 3000, 5000, 8000, 10000]

const paletteToColor = {
  Neutrals: 'neutral',
  'Earth Tones': 'brown',
  'Cool Blues': 'blue',
  'Bold & Bright': 'red',
  Monochrome: 'black',
}

function SectionHeading({ icon: Icon, children }) {
  return (
    <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      {children}
    </h3>
  )
}

export default function AIStylist() {
  const [selectedStyle, setSelectedStyle] = useState(2)
  const [selectedOccasion, setSelectedOccasion] = useState(3)
  const [selectedPalette, setSelectedPalette] = useState(5)
  const [selectedBudget, setSelectedBudget] = useState(3000)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [recommendations, setRecommendations] = useState([])
  const [error, setError] = useState(null)
  const resultsRef = useRef(null)

  const selectedPaletteData = colorPalettes.find((palette) => palette.id === selectedPalette)

  const handleGenerate = async () => {
    if (generating) return

    const styleOption = styleProfiles.find((style) => style.id === selectedStyle)
    const occasionOption = occasions.find((occasion) => occasion.id === selectedOccasion)
    const paletteOption = colorPalettes.find((palette) => palette.id === selectedPalette)

    if (!styleOption || !occasionOption || !paletteOption) return

    try {
      setGenerating(true)
      setError(null)
      const response = await recommendOutfit({
        occasion: occasionOption.name,
        style: styleOption.name,
        color: paletteToColor[paletteOption.name] || 'neutral',
        budget: Number(selectedBudget),
      })

      const items = Array.isArray(response?.recommendation) ? response.recommendation : []
      setRecommendations(items)
      setGenerated(true)

      // Non-sensitive usage context only - never any personal data or images.
      trackAiStylistUsed({
        occasion: String(occasionOption.name || '').toLowerCase().replace(/\s+/g, '_'),
        style: String(styleOption.name || '').toLowerCase().replace(/\s+/g, '_'),
      })

      requestAnimationFrame(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      })
    } catch (err) {
      setRecommendations([])
      setError(err.message || 'Unable to generate recommendations.')
      setGenerated(true)
    } finally {
      setGenerating(false)
    }
  }

  const handleRegenerate = () => {
    if (!generated) return
    handleGenerate()
  }

  const handleBudgetChange = (value) => {
    setSelectedBudget(Number(value))
  }

  const budgetLabel = `₹${Number(selectedBudget).toLocaleString('en-IN')}`

  return (
    <section id="stylist" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-[500px] h-[400px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            Your Personal <span className="text-shine">AI Stylist</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            Describe your occasion, style, color preferences, and budget — our stylist will curate a
            personalized look from real products in the catalog.
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8">
          <Reveal direction="right">
            <div className="rounded-4xl glass dark:glass p-8 space-y-8">
              {/* ===== Style Profile ===== */}
              <div>
                <SectionHeading icon={Shirt}>Style Profile</SectionHeading>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {styleProfiles.map((style) => {
                    const active = selectedStyle === style.id
                    return (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyle(style.id)}
                        aria-pressed={active}
                        className={`relative p-4 rounded-2xl text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          active
                            ? 'bg-gradient-to-br from-primary/25 to-secondary/25 border border-primary/60 shadow-glow scale-[1.02]'
                            : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        {active && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center"
                          >
                            <Check className="w-3 h-3" />
                          </motion.span>
                        )}
                        <div className="text-2xl mb-2">{style.emoji}</div>
                        <div className={`font-semibold text-sm ${active ? 'text-primary' : ''}`}>{style.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{style.description}</div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ===== Occasion ===== */}
              <div>
                <SectionHeading icon={Calendar}>Occasion</SectionHeading>
                <div className="flex flex-wrap gap-2.5">
                  {occasions.map((occasion) => {
                    const active = selectedOccasion === occasion.id
                    return (
                      <button
                        key={occasion.id}
                        onClick={() => setSelectedOccasion(occasion.id)}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          active
                            ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow scale-[1.03]'
                            : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <span>{occasion.emoji}</span>
                        <span>{occasion.name}</span>
                        {active && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ===== Color Palette ===== */}
              <div>
                <SectionHeading icon={Palette}>Color Palette</SectionHeading>
                <div className="flex flex-wrap gap-3">
                  {colorPalettes.map((palette) => {
                    const active = selectedPalette === palette.id
                    return (
                      <button
                        key={palette.id}
                        onClick={() => setSelectedPalette(palette.id)}
                        aria-pressed={active}
                        aria-label={`Color palette ${palette.name}`}
                        className={`flex items-center gap-2.5 rounded-full px-4 py-2 text-sm transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                          active
                            ? 'bg-primary/10 text-primary border-2 border-primary shadow-glow font-semibold'
                            : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10 border-2 border-transparent text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <span className="flex -space-x-1.5">
                          {palette.colors.map((color, i) => (
                            <span
                              key={i}
                              className={`w-5 h-5 rounded-full border-2 transition-transform duration-300 ${
                                active ? 'scale-110' : ''
                              } ${['#ffffff', '#d3d3d3', '#cccccc'].includes(color.toLowerCase()) ? 'border-white/60' : 'border-white/20'}`}
                              style={{ backgroundColor: color, boxShadow: active ? '0 0 10px rgba(255,46,136,0.35)' : 'none' }}
                            />
                          ))}
                        </span>
                        {palette.name}
                        {active && <Check className="w-3.5 h-3.5" />}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Selected: <span className="font-semibold text-primary">{selectedPaletteData?.name}</span>
                </p>
              </div>

              {/* ===== Budget ===== */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="stylist-budget" className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200">
                    <IndianRupee className="w-4 h-4 text-primary" />
                    Budget
                  </label>
                  <span className="font-display text-xl font-bold gradient-text">{budgetLabel}</span>
                </div>
                <input
                  id="stylist-budget"
                  type="range"
                  min={budgetOptions[0]}
                  max={budgetOptions[budgetOptions.length - 1]}
                  step={1000}
                  value={selectedBudget}
                  onChange={(e) => handleBudgetChange(e.target.value)}
                  className="w-full accent-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  aria-label="Set budget"
                  aria-valuemin={budgetOptions[0]}
                  aria-valuemax={budgetOptions[budgetOptions.length - 1]}
                  aria-valuenow={selectedBudget}
                />
                <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                  <span>₹{Number(budgetOptions[0]).toLocaleString('en-IN')}</span>
                  <span>₹{Number(budgetOptions[budgetOptions.length - 1]).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* ===== Generate Button ===== */}
              <MagneticButton
                onClick={handleGenerate}
                disabled={generating}
                className="w-full px-6 py-4 rounded-2xl btn-fashion text-white font-semibold shadow-glow text-base"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Generating your look...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Wand2 className="w-5 h-5" />
                    Generate Outfit
                  </span>
                )}
              </MagneticButton>
            </div>
          </Reveal>

          {/* ===== Results panel ===== */}
          <Reveal direction="left" delay={0.2}>
            <div ref={resultsRef} className="rounded-4xl glass dark:glass p-8 h-full">
              <AnimatePresence mode="wait">
                {!generated ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full flex flex-col items-center justify-center text-center py-20"
                  >
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6"
                    >
                      <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>
                    <h3 className="font-display text-2xl font-bold mb-2">Your AI Stylist Awaits</h3>
                    <p className="text-gray-600 dark:text-gray-300 max-w-sm">
                      Choose your style, occasion, color palette and budget — then generate a personalized look from real products.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <h3 className="font-display text-xl font-bold">Your AI Style Picks</h3>
                      <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-semibold">
                        <Check className="w-3 h-3" />
                        Generated
                      </span>
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-semibold">Unable to generate</span>
                        </div>
                        <p className="text-sm">{error}</p>
                      </div>
                    ) : generating ? (
                      <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2" aria-busy="true" aria-label="Generating outfit recommendations">
                        {[1, 2, 3].map((i) => (
                          <ProductSkeleton key={i} />
                        ))}
                      </div>
                    ) : !recommendations.length ? (
                      <div className="rounded-2xl glass dark:glass p-6 text-center">
                        <p className="text-gray-600 dark:text-gray-300">No outfit recommendations found for this combination.</p>
                      </div>
                    ) : (
                      <motion.div
                        initial="hidden"
                        animate="show"
                        variants={{ show: { transition: { staggerChildren: 0.1 } } }}
                        className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-2"
                      >
                        {recommendations.map((product, i) => (
                          <motion.div
                            key={product.id}
                            variants={{
                              hidden: { opacity: 0, y: 24 },
                              show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
                            }}
                          >
                            <ProductCard product={product} index={i} showMatch={false} />
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {/* ===== Regenerate Look ===== */}
                    <MagneticButton
                      onClick={handleRegenerate}
                      disabled={generating}
                      className="w-full px-6 py-3 rounded-2xl glass dark:glass font-semibold"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                        Regenerate Look
                      </span>
                    </MagneticButton>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}