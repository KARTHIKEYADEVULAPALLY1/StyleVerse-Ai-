import { motion } from 'framer-motion'

export default function GlowCard({ children, className = '', glowColor = 'rgba(79, 139, 255, 0.3)' }) {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative rounded-4xl overflow-hidden group ${className}`}
    >
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(600px circle at var(--x, 50%) var(--y, 50%), ${glowColor}, transparent 40%)`
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  )
}