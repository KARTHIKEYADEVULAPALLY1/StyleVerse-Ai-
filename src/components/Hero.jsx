import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react'
import MagneticButton from './ui/MagneticButton'
import FloatingParticles from './ui/FloatingParticles'
import HolographicMannequin from './hero/HolographicMannequin'

export default function Hero() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/20 blur-[120px] rounded-full animate-glow-pulse" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-secondary/20 blur-[100px] rounded-full animate-glow-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/3 left-1/4 w-[400px] h-[300px] bg-accent-cyan/10 blur-[100px] rounded-full animate-glow-pulse" style={{ animationDelay: '2.5s' }} />
        <FloatingParticles count={40} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left content */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass dark:glass mb-8 border border-primary/20"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-couture uppercase text-gray-600 dark:text-gray-300">
              AI Fashion Discovery & Styling
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-normal leading-tight tracking-tight text-balance"
          >
            Discover.
            <br />
            <span className="text-shine">Style.</span>
            <br />
            <span className="font-serif italic font-light">Wear With Confidence.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto lg:mx-0 font-light tracking-wide"
          >
            AI-powered fashion discovery, personalized styling, virtual try-on, and smart price comparison — everything you need to shop smarter.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
          >
            <MagneticButton
              onClick={() => scrollTo('ai-search')}
              className="px-8 py-4 rounded-2xl btn-fashion text-white font-semibold tracking-wide uppercase text-sm shadow-glow"
            >
              Start Shopping
              <ArrowRight className="w-5 h-5 ml-2" />
            </MagneticButton>
            <MagneticButton
              onClick={() => scrollTo('stylist')}
              className="px-8 py-4 rounded-2xl glass dark:glass font-semibold tracking-wide uppercase text-sm hover:bg-white/10 dark:hover:bg-white/10 transition-colors border border-primary/20"
            >
              <Wand2 className="w-5 h-5 mr-2 text-primary" />
              Try AI Stylist
            </MagneticButton>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="mt-12 grid grid-cols-3 gap-8 max-w-md mx-auto lg:mx-0"
          >
            {[
              { value: '10M+', label: 'Products' },
              { value: '500+', label: 'Brands' },
              { value: '94%', label: 'Fit Accuracy' }
            ].map((stat) => (
              <div key={stat.label} className="text-center lg:text-left">
                <div className="font-display text-3xl font-normal text-shine">{stat.value}</div>
                <div className="text-sm tracking-wide text-gray-500 dark:text-gray-400 mt-1 uppercase">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right - 3D Mannequin */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="relative"
        >
          <HolographicMannequin />
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.button
          onClick={() => scrollTo('ai-search')}
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-6 h-10 rounded-full border-2 border-gray-400 dark:border-gray-600 flex justify-center pt-2 cursor-pointer hover:border-primary transition-colors"
          aria-label="Scroll to AI search"
        >
          <div className="w-1 h-2 rounded-full btn-fashion" />
        </motion.button>
      </motion.div>
    </section>
  )
}