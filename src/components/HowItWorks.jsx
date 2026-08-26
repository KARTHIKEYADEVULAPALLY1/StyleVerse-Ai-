import { motion } from 'framer-motion'
import { Compass, UserRound, Shirt, BadgePercent, ShoppingBag, ArrowDown, ArrowRight } from 'lucide-react'
import Reveal from './ui/Reveal'

const steps = [
  {
    icon: Compass,
    step: '01',
    title: 'Discover',
    description:
      'Search across millions of products with natural language or explore curated collections.',
    href: '#ai-search',
    color: '#FF2E88',
  },
  {
    icon: UserRound,
    step: '02',
    title: 'Personalize',
    description:
      'Share your style profile. The AI learns your preferences and tailors every result.',
    href: '#stylist',
    color: '#8B5CF6',
  },
  {
    icon: Shirt,
    step: '03',
    title: 'Try',
    description:
      'See how garments look on your body with AI-powered virtual try-on.',
    href: '#try-on',
    color: '#FF2E88',
  },
  {
    icon: BadgePercent,
    step: '04',
    title: 'Compare',
    description:
      'Scan every partner store to find the best price and maximum savings.',
    href: '#compare',
    color: '#8B5CF6',
  },
  {
    icon: ShoppingBag,
    step: '05',
    title: 'Shop',
    description:
      'Added to cart and checkout with confidence knowing you got the best deal.',
    href: '#explore',
    color: '#FF2E88',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            How StyleVerse <span className="text-shine">Works</span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 font-light tracking-wide max-w-2xl mx-auto">
            From discovery to checkout in five effortless steps — powered by AI at every stage.
          </p>
        </Reveal>

        <div className="relative">
          {/* Connection line - hidden on mobile, horizontal on desktop */}
          <div className="hidden lg:block absolute top-12 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Step number badge */}
                <div className="relative mb-6">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:shadow-glow"
                    style={{
                      background: `linear-gradient(135deg, ${step.color}22, ${step.color}11)`,
                      border: `1px solid ${step.color}44`,
                    }}
                  >
                    <step.icon className="w-7 h-7" style={{ color: step.color }} />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full glass dark:glass flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                    {step.step}
                  </span>
                </div>

                <h3 className="font-display text-xl font-normal mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 font-light leading-relaxed max-w-[220px]">
                  {step.description}
                </p>

                {/* Arrow between steps - vertical on mobile, right on desktop */}
                {i < steps.length - 1 && (
                  <>
                    <motion.div
                      animate={{ y: [0, 6, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      className="mt-6 lg:hidden"
                    >
                      <ArrowDown className="w-5 h-5 text-primary/50" />
                    </motion.div>
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                      className="hidden lg:block absolute top-14 -right-5"
                    >
                      <ArrowRight className="w-4 h-4 text-primary/50" />
                    </motion.div>
                  </>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}