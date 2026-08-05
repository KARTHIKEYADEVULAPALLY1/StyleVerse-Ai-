import { motion } from 'framer-motion'

export default function FashionLogo({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  }

  return (
    <motion.div
      whileHover={{ rotate: 15, scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className={`relative ${sizes[size] || sizes.md} ${className}`}
    >
      {/* Clothes hanger SVG */}
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full drop-shadow-[0_0_8px_rgba(255,46,136,0.3)]">
        <defs>
          <linearGradient id="hangerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF2E88" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#00E5FF" />
          </linearGradient>
        </defs>
        {/* Hanger hook */}
        <path
          d="M32 10c-2.5 0-4.5 2-4.5 4.5 0 3 4.5 5 4.5 8"
          stroke="url(#hangerGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Hanger body - triangle shape */}
        <path
          d="M8 38 L22 20 L42 20 L56 38 C58 42 56 47 51 47 L13 47 C8 47 6 42 8 38Z"
          stroke="url(#hangerGrad)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="rgba(255,46,136,0.08)"
        />
        {/* Hanger bar */}
        <path
          d="M20 34 C27 30 37 30 44 34"
          stroke="url(#hangerGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* Glow effect */}
      <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary/30 via-secondary/30 to-accent-cyan/30 blur-md -z-10 animate-glow-pulse" />
    </motion.div>
  )
}