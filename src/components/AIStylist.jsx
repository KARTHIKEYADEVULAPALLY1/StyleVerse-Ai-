import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Sparkles, Shirt, Palette, Calendar, RefreshCw, Check, AlertTriangle } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'
import { styleProfiles, occasions, colorPalettes } from '../data/fashionData'
import { recommendOutfit } from '../services/stylistService'

const budgetOptions = [1000, 2000, 3000, 5000, 8000, 10000]

const paletteToColor = {
  Neutrals: 'neutral',
  'Earth Tones': 'brown',
  'Cool Blues': 'blue',
  'Bold & Bright': 'red',
  Monochrome: 'black',
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

  const handleGenerate = async () => {
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
    } catch (err) {
      setRecommendations([])
      setError(err.message || 'Unable to generate recommendations.')
      setGenerated(true)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <section id="stylist" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 right-0 w-[500px] h-[400px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            AI <span className="text-shine">Stylist</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide">
            Get personalized outfit recommendations powered by real products
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8">
          <Reveal direction="right">
            <div className="rounded-4xl glass dark:glass p-8 space-y-8">
              <div>
                <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-primary" />
                  Style Profile
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {styleProfiles.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedStyle(style.id)}
                      className={`p-4 rounded-2xl text-left transition-all duration-300 ${
                        selectedStyle === style.id
                          ? 'bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/50 shadow-glow'
                          : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="text-2xl mb-2">{style.emoji}</div>
                      <div className="font-semibold text-sm">{style.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{style.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Occasion
                </h3>
                <div className="flex flex-wrap gap-2">
                  {occasions.map((occasion) => (
                    <button
                      key={occasion.id}
                      onClick={() => setSelectedOccasion(occasion.id)}
                      className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                        selectedOccasion === occasion.id
                          ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                          : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {occasion.emoji} {occasion.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Color Palette
                </h3>
                <div className="flex flex-wrap gap-3">
                  {colorPalettes.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => setSelectedPalette(palette.id)}
                      className={`px-4 py-2 rounded-full text-sm transition-all duration-300 ${
                        selectedPalette === palette.id
                          ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                          : 'glass dark:glass hover:bg-white/10 dark:hover:bg-white/10'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="flex -space-x-1">
                          {palette.colors.map((color, i) => (
                            <span
                              key={i}
                              className="w-3 h-3 rounded-full border border-white/20"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </span>
                        {palette.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">Budget</label>
                <select
                  value={selectedBudget}
                  onChange={(event) => setSelectedBudget(Number(event.target.value))}
                  className="w-full rounded-2xl glass dark:glass px-3 py-2.5 text-sm outline-none border border-white/10 bg-transparent"
                >
                  {budgetOptions.map((option) => (
                    <option key={option} value={option} className="bg-[#0A0A0F] text-white">
                      Under ₹{option.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <MagneticButton
                onClick={handleGenerate}
                className="w-full px-6 py-4 rounded-2xl btn-fashion text-white font-semibold shadow-glow"
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

          <Reveal direction="left" delay={0.2}>
            <div className="rounded-4xl glass dark:glass p-8 h-full">
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
                      Select your preferences and let our product-driven stylist create the perfect outfit for you.
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-display text-xl font-bold">Your AI Outfit</h3>
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
                    ) : !recommendations.length ? (
                      <div className="rounded-2xl glass dark:glass p-6 text-center">
                        <p className="text-gray-600 dark:text-gray-300">No outfit recommendations found for this combination.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {recommendations.map((product) => (
                          <div key={product.id} className="rounded-2xl glass dark:glass overflow-hidden">
                            <img src={product.image} alt={product.name} className="w-full h-40 object-cover" />
                            <div className="p-4">
                              <div className="text-[10px] uppercase tracking-[0.2em] text-primary mb-2">{product.category}</div>
                              <h4 className="font-semibold text-base text-white">{product.name}</h4>
                              <div className="mt-3 flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">{product.brand}</span>
                                <span className="text-lg font-bold text-white">{product.price}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <MagneticButton
                      onClick={() => {
                        setGenerated(false)
                        setError(null)
                        setRecommendations([])
                      }}
                      className="w-full px-6 py-3 rounded-2xl glass dark:glass font-semibold"
                    >
                      Regenerate
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