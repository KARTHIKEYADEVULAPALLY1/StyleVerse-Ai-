import { motion } from 'framer-motion'
import { Search, Sparkles, Shirt, BadgePercent, HeartHandshake, ArrowRight } from 'lucide-react'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

const features = [
  {
    icon: Search,
    title: 'AI Search',
    tagline: 'Describe. Discover. Done.',
    description:
      'Search millions of products using natural language. Describe the vibe, and the AI finds the closest match across the entire fashion universe.',
    color: '#FF2E88',
    gradient: 'from-primary/20 to-secondary/20',
    href: '#ai-search',
    action: 'Try AI Search',
  },
  {
    icon: Sparkles,
    title: 'AI Stylist',
    tagline: 'Your personal fashion expert',
    description:
      'Get complete outfit recommendations tailored to your style profile, body type, and the occasion you are dressing for.',
    color: '#8B5CF6',
    gradient: 'from-secondary/20 to-primary/20',
    href: '#stylist',
    action: 'Get Styled',
  },
  {
    icon: Shirt,
    title: 'Virtual Try-On',
    tagline: 'See it before you buy it',
    description:
      'Upload a photo and see how the garment actually looks on you. AI composites the product image onto your body in seconds.',
    color: '#FF2E88',
    gradient: 'from-primary/20 to-accent-cyan/20',
    href: '#try-on',
    action: 'Try It On',
  },
  {
    icon: BadgePercent,
    title: 'Price Comparison',
    tagline: 'Never overpay again',
    description:
      'We scan every partner store in real time to find the best price and highlight exactly how much you save on each product.',
    color: '#8B5CF6',
    gradient: 'from-accent-cyan/20 to-secondary/20',
    href: '#compare',
    action: 'Compare Prices',
  },
  {
    icon: HeartHandshake,
    title: 'Personalized Recommendations',
    tagline: 'Curated just for you',
    description:
      'The more you explore and save, the smarter the recommendations become. Discover products that match your personal style.',
    color: '#FF2E88',
    gradient: 'from-secondary/20 to-accent-cyan/20',
    href: '#recommendations',
    action: 'Explore Picks',
  },
]

export default function AIFeatures() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-secondary/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass dark:glass mb-6 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-couture uppercase text-gray-600 dark:text-gray-300">
              Powered by StyleVerse AI
            </span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            An Entire Fashion <span className="text-shine">Intelligence Suite</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            Five AI capabilities working together to transform how you discover, style, try, compare, and shop fashion.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6 }}
              whileHover={{ y: -6 }}
              className="group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />

              <div className={`relative h-full rounded-4xl glass dark:glass overflow-hidden p-8 transition-all duration-500 group-hover:shadow-glow`}>
                <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${feature.gradient} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                <div
                  className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-glow"
                  style={{
                    background: `linear-gradient(135deg, ${feature.color}22, ${feature.color}11)`,
                    border: `1px solid ${feature.color}44`,
                  }}
                >
                  <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                </div>

                <h3 className="font-display text-2xl font-normal mb-1">{feature.title}</h3>
                <p className="text-sm text-primary font-medium mb-3">{feature.tagline}</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-light leading-relaxed mb-6">
                  {feature.description}
                </p>

                <a
                  href={feature.href}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors"
                >
                  {feature.action}
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </motion.div>
          ))}

          {/* Full-width CTA card to complete the 3x2 grid nicely */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative sm:col-span-2 lg:col-span-1"
          >
            <div className="relative h-full rounded-4xl glass dark:glass p-8 flex flex-col justify-between bg-gradient-to-br from-primary/10 via-transparent to-secondary/10">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center mb-6">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-normal mb-1">One AI. Every Answer.</h3>
                <p className="text-sm text-primary font-medium mb-3">Start exploring now</p>
                <p className="text-gray-600 dark:text-gray-300 text-sm font-light leading-relaxed mb-6">
                  Search, style, try-on, compare, and shop — all in a single seamless AI-powered experience.
                </p>
              </div>
              <MagneticButton className="px-6 py-3 rounded-2xl btn-fashion text-white font-semibold shadow-glow w-fit">
                Explore Fashion
                <ArrowRight className="w-4 h-4 ml-2" />
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}