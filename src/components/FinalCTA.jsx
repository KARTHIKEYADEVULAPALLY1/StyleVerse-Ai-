import { motion } from 'framer-motion'
import { ArrowRight, Sparkles } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

export default function FinalCTA() {
  return (
    <section id="cta" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-primary/20 blur-[140px] rounded-full animate-glow-pulse" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-secondary/20 blur-[100px] rounded-full animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative rounded-4xl glass dark:glass overflow-hidden">
            {/* Decorative gradient border */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-80" />

            <div className="relative p-12 sm:p-16 text-center">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-16 h-16 rounded-3xl bg-gradient-to-br from-primary/25 to-secondary/25 flex items-center justify-center mx-auto mb-8"
              >
                <Sparkles className="w-8 h-8 text-primary" />
              </motion.div>

              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight text-balance">
                Your Style Journey
                <br />
                Starts <span className="text-shine">Here</span>
              </h2>

              <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
                Explore thousands of products, discover your personal style with AI, and shop with confidence knowing you always get the best price.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                <MagneticButton
                  onClick={() => {
                    document.getElementById('ai-search')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="px-8 py-4 rounded-2xl btn-fashion text-white font-semibold tracking-wide uppercase text-sm shadow-glow"
                >
                  Start Your Style Journey
                  <ArrowRight className="w-5 h-5 ml-2" />
                </MagneticButton>
                <MagneticButton
                  onClick={() => {
                    document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="px-8 py-4 rounded-2xl glass dark:glass font-semibold tracking-wide uppercase text-sm hover:bg-white/10 dark:hover:bg-white/10 transition-colors border border-primary/20"
                >
                  Explore Fashion
                </MagneticButton>
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Free AI Styling
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Smart Price Comparison
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  Virtual Try-On
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}