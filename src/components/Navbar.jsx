import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Menu, X, Search, User, Heart, ShoppingCart, LogOut } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { navItems } from '../data/fashionData'
import MagneticButton from './ui/MagneticButton'
import FashionLogo from './ui/FashionLogo'

export default function Navbar() {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const { totalItems } = useCart()
  const { user, isAuthenticated, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'backdrop-blur-xl bg-white/10 dark:bg-black/40 border-b border-white/10 dark:border-white/10'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <a href="#home" className="flex items-center gap-2.5 group">
              <FashionLogo />
              <div className="flex flex-col">
                <span className="font-display font-bold text-xl tracking-luxury leading-none text-shine">
                  STYLEVERSE
                </span>
                <span className="font-serif text-[10px] tracking-couture text-secondary dark:text-secondary/70 uppercase mt-1">
                  AI Fashion House
                </span>
              </div>
            </a>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium tracking-wide text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors relative group uppercase text-xs"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent-cyan scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </a>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <MagneticButton
                onClick={toggleTheme}
                className="w-10 h-10 rounded-full glass dark:glass flex items-center justify-center"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={theme}
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.3 }}
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Moon className="w-5 h-5 text-primary" />
                    )}
                  </motion.div>
                </AnimatePresence>
              </MagneticButton>

              {/* Search Icon */}
              <MagneticButton className="hidden sm:flex w-10 h-10 rounded-full glass dark:glass items-center justify-center">
                <Search className="w-5 h-5" />
              </MagneticButton>

              {/* Cart Icon */}
              <MagneticButton
                onClick={() => document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })}
                className="hidden sm:flex w-10 h-10 rounded-full glass dark:glass items-center justify-center relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full btn-fashion text-white text-[10px] flex items-center justify-center font-bold">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </MagneticButton>

              {/* Profile / Login */}
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-2 rounded-full glass dark:glass px-3 py-2">
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Hi, {user?.name || 'User'}</span>
                  <MagneticButton onClick={logout} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </MagneticButton>
                </div>
              ) : (
                <MagneticButton
                  onClick={() => navigate('/login')}
                  className="hidden sm:flex w-10 h-10 rounded-full glass dark:glass items-center justify-center"
                >
                  <User className="w-5 h-5" />
                </MagneticButton>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-10 h-10 rounded-full glass dark:glass flex items-center justify-center"
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden overflow-hidden backdrop-blur-xl bg-white/10 dark:bg-black/40 border-b border-white/10 dark:border-white/10"
            >
              <div className="px-4 py-4 space-y-1">
                {navItems.map((item, i) => (
                  <motion.a
                    key={item.label}
                    href={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-sm font-medium tracking-wide uppercase hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </motion.a>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  )
}