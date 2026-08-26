import { useRef } from 'react'
import { motion } from 'framer-motion'

export default function MagneticButton({ children, className = '', onClick, strength = 0.3, type = 'button', disabled = false, ...rest }) {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
  }

  const handleMouseLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = 'translate(0px, 0px)'
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      onMouseMove={disabled ? undefined : handleMouseMove}
      onMouseLeave={disabled ? undefined : handleMouseLeave}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative inline-flex items-center justify-center transition-transform duration-300 ease-out ${disabled ? 'cursor-not-allowed opacity-70' : ''} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}