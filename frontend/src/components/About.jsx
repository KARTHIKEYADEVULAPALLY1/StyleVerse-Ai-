import { motion } from 'framer-motion'
import { Sparkles, Search, Shirt, TrendingUp, Shield, Zap, Globe, Users } from 'lucide-react'
import Reveal from './ui/Reveal'
import { aboutFeatures, aboutStats } from '../data/fashionData'

const featureIcons = {
  Search,
  Shirt,
  TrendingUp,
  Shield,
  Zap,
  Globe
}

export default function About() {
  return (
    <section id="about" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-primary/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-secondary/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass dark:glass mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-gray-600 dark:text-gray-300">About StyleVerse AI</span>
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-normal tracking-tight">
            The Future of <span className="text-shine">Fashion Shopping</span>
          </h2>
          <p className="mt-6 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto font-light tracking-wide">
            StyleVerse AI is the world's first AI Fashion Operating System. We combine cutting-edge
            artificial intelligence with the latest in computer vision to revolutionize how you
            discover, try, and buy fashion online.
          </p>
        </Reveal>

        {/* Stats */}
        <Reveal className="mb-16">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {aboutStats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-4xl glass dark:glass p-6 text-center"
              >
                <div className="font-display text-3xl sm:text-4xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </Reveal>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {aboutFeatures.map((feature, i) => {
            const Icon = featureIcons[feature.icon]

            return (
              <Reveal key={feature.title} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group relative rounded-4xl glass dark:glass p-8 h-full overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-display text-xl font-bold mb-3">{feature.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{feature.description}</p>
                  </div>
                </motion.div>
              </Reveal>
            )
          })}
        </div>

        {/* Mission */}
        <Reveal className="mt-16">
          <div className="rounded-4xl glass dark:glass p-10 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
            <div className="relative z-10">
              <Users className="w-10 h-10 text-primary mx-auto mb-6" />
              <h3 className="font-display text-2xl sm:text-3xl font-bold mb-4">Our Mission</h3>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
                We believe that finding the perfect outfit should be effortless. Our mission is to
                eliminate the friction between inspiration and purchase, making fashion discovery
                as simple as describing what you want to wear.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}