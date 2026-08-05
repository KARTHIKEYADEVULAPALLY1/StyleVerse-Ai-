import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wand2, Sparkles, Shirt, Palette, Calendar, RefreshCw, Check } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

const styleProfiles = [
  { id: 1, name: 'Streetwear', emoji: '🛹', description: 'Oversized fits, sneakers, bold graphics' },
  { id: 2, name: 'Minimalist', emoji: '⚪', description: 'Clean lines, neutral tones, timeless pieces' },
  { id: 3, name: 'Formal', emoji: '💼', description: 'Tailored suits, crisp shirts, professional' },
  { id: 4, name: 'Bohemian', emoji: '🌿', description: 'Flowy fabrics, earthy tones, layered looks' },
  { id: 5, name: 'Athleisure', emoji: '🏃', description: 'Sporty comfort, performance fabrics' },
  { id: 6, name: 'Vintage', emoji: '📼', description: 'Retro pieces, thrifted finds, nostalgia' }
]

const occasions = [
  { id: 1, name: 'Casual Day', emoji: '☀️' },
  { id: 2, name: 'Office', emoji: '💼' },
  { id: 3, name: 'Date Night', emoji: '🌙' },
  { id: 4, name: 'Party', emoji: '🎉' },
  { id: 5, name: 'Wedding', emoji: '💍' },
  { id: 6, name: 'Travel', emoji: '✈️' }
]

const colorPalettes = [
  { id: 1, name: 'Neutrals', colors: ['#808080', '#A9A9A9', '#D3D3D3', '#696969'] },
  { id: 2, name: 'Earth Tones', colors: ['#8B7355', '#A0522D', '#6B8E23', '#CD853F'] },
  { id: 3, name: 'Cool Blues', colors: ['#4682B4', '#5F9EA0', '#6495ED', '#87CEEB'] },
  { id: 4, name: 'Bold & Bright', colors: ['#FF4500', '#FFD700', '#32CD32', '#FF69B4'] },
  { id: 5, name: 'Monochrome', colors: ['#000000', '#FFFFFF', '#333333', '#CCCCCC'] }
]

export default function AIStylist() {
  const [selectedStyle, setSelectedStyle] = useState(1)
  const [selectedOccasion, setSelectedOccasion] = useState(1)
  const [selectedPalette, setSelectedPalette] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)

  const handleGenerate = () => {
    setGenerating(true)
    setTimeout(() => {
      setGenerating(false)
      setGenerated(true)
    }, 2000)
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
            Get personalized outfit recommendations powered by AI
          </p>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Preferences */}
          <Reveal direction="right">
            <div className="rounded-4xl glass dark:glass p-8 space-y-8">
              {/* Style Profile */}
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

              {/* Occasion */}
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

              {/* Color Palette */}
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

              {/* Generate Button */}
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

          {/* Right - Results */}
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
                      Select your preferences and let our AI create the perfect outfit for you
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

                    {/* Outfit Preview */}
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { type: 'Top', emoji: '👕', name: 'Oversized Tee' },
                        { type: 'Bottom', emoji: '👖', name: 'Cargo Pants' },
                        { type: 'Shoes', emoji: '👟', name: 'Chunky Sneakers' }
                      ].map((item, i) => (
                        <motion.div
                          key={item.type}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.2 }}
                          className="rounded-2xl glass dark:glass p-4 text-center"
                        >
                          <div className="text-4xl mb-2">{item.emoji}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{item.type}</div>
                          <div className="font-semibold text-sm mt-1">{item.name}</div>
                        </motion.div>
                      ))}
                    </div>

                    {/* AI Tips */}
                    <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        AI Styling Tips
                      </h4>
                      <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <li>• Pair with white sneakers for a clean finish</li>
                        <li>• Add a crossbody bag for functionality</li>
                        <li>• Layer with a denim jacket for cooler evenings</li>
                      </ul>
                    </div>

                    <MagneticButton
                      onClick={() => setGenerated(false)}
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