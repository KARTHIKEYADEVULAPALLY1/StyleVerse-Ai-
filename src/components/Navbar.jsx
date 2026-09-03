import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sun, Moon, Menu, X, Search, User, Heart, ShoppingCart, LogOut, LogIn } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { useAuth } from '../context/AuthContext'
import { navItems } from '../data/fashionData'
import MagneticButton from './ui/MagneticButton'
import FashionLogo from './ui/FashionLogo'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const { totalItems } = useCart()
  const { wishlistProducts } = useWishlist()
  const { user, isAuthenticated, logout } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const menuButtonRef = useRef(null)

  const wishlistCount = wishlistProducts.length
  const routeName = location.pathname

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMobileOpen(false)
  }, [routeName])

  // Escape key closes the mobile menu (keyboard accessibility).
  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const handleLogoClick = (event) => {
    event.preventDefault()
    if (routeName === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      navigate('/')
    }
    setMobileOpen(false)
  }

  const handleAnchorClick = (event, href) => {
    event.preventDefault()
    setMobileOpen(false)
    if (href.startsWith('/')) {
      if (routeName !== href) {
        navigate(href)
      }
      return
    }
    if (routeName !== '/') {
      navigate('/')
      // Wait for the home page to mount before scrolling to the section.
      window.setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleCartClick = () => {
    if (routeName !== '/') {
      navigate('/')
      window.setTimeout(() => {
        document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } else {
      document.getElementById('cart')?.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  const handleWishlistClick = () => {
    if (routeName !== '/') {
      navigate('/')
      window.setTimeout(() => {
        document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } else {
      document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileOpen(false)
  }

  const handleProfileClick = () => {
    setMobileOpen(false)
    navigate('/profile')
  }

  const handleLoginClick = () => {
    setMobileOpen(false)
    navigate('/login')
  }

  const handleLogoutClick = () => {
    setMobileOpen(false)
    logout()
    navigate('/')
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Main navigation"
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled || mobileOpen
            ? 'backdrop-blur-xl bg-white/10 dark:bg-black/40 border-b border-white/10 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)]'
            : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between transition-all duration-500 ${scrolled ? 'h-14 lg:h-16' : 'h-16 lg:h-20'}`}>
            {/* Logo */}
            <a
              href="#home"
              onClick={handleLogoClick}
              className="flex items-center gap-2.5 group rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              aria-label="StyleVerse AI — go to homepage"
            >
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
            <div className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(event) => handleAnchorClick(event, item.href)}
                  className="relative px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors rounded-lg group"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-gradient-to-r from-primary via-secondary to-accent-cyan scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </a>
              ))}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle */}
              <MagneticButton
                onClick={toggleTheme}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
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
              <MagneticButton
                onClick={() => {
                  if (routeName !== '/') {
                    navigate('/')
                    window.setTimeout(() => {
                      document.getElementById('ai-search')?.scrollIntoView({ behavior: 'smooth' })
                    }, 150)
                  } else {
                    document.getElementById('ai-search')?.scrollIntoView({ behavior: 'smooth' })
                  }
                }}
                aria-label="Search products"
                className="hidden sm:flex w-10 h-10 rounded-full glass dark:glass items-center justify-center"
              >
                <Search className="w-5 h-5" />
              </MagneticButton>

              {/* Wishlist Icon */}
              <MagneticButton
                onClick={handleWishlistClick}
                aria-label={`Wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? 'item' : 'items'}`}
                className="relative w-10 h-10 rounded-full glass dark:glass flex items-center justify-center"
              >
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full btn-fashion text-white text-[10px] flex items-center justify-center font-bold">
                    {wishlistCount > 9 ? '9+' : wishlistCount}
                  </span>
                )}
              </MagneticButton>

              {/* Cart Icon */}
              <MagneticButton
                onClick={handleCartClick}
                aria-label={`Cart, ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
                className="hidden sm:flex w-10 h-10 rounded-full glass dark:glass items-center justify-center relative"
              >
                <ShoppingCart className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full btn-fashion text-white text-[10px] flex items-center justify-center font-bold">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </MagneticButton>

              {/* Profile / Login (desktop) */}
              {isAuthenticated ? (
                <div className="hidden sm:flex items-center gap-1.5 rounded-full glass dark:glass pl-1.5 pr-1.5 py-1.5">
                  <button
                    onClick={handleProfileClick}
                    className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-colors px-2 py-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    aria-label="Go to profile dashboard"
                  >
                    Hi, {user?.name?.split(' ')[0] || 'User'}
                  </button>
                  <MagneticButton
                    onClick={handleLogoutClick}
                    aria-label="Log out"
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500"
                  >
                    <LogOut className="w-4 h-4" />
                  </MagneticButton>
                </div>
              ) : (
                <MagneticButton
                  onClick={handleLoginClick}
                  aria-label="Log in"
                  className="hidden sm:flex items-center gap-1.5 px-3.5 h-10 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold text-xs shadow-glow"
                >
                  <LogIn className="w-4 h-4" />
                  Login
                </MagneticButton>
              )}

              {/* Mobile Menu Button */}
              <button
                ref={menuButtonRef}
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                className="lg:hidden w-10 h-10 rounded-full glass dark:glass flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={mobileOpen ? 'close' : 'open'}
                    initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                    animate={{ rotate: 0, opacity: 1, scale: 1 }}
                    exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2 }}
                    className="flex"
                  >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
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
                    onClick={(event) => handleAnchorClick(event, item.href)}
                    className="block px-4 py-3 rounded-xl text-sm font-medium tracking-wide uppercase hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                  >
                    {item.label}
                  </motion.a>
                ))}

                {/* Divider */}
                <div className="my-3 border-t border-white/10 dark:border-white/5" />

                {/* Wishlist / Cart (mobile) */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWishlistClick}
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl glass dark:glass text-sm font-semibold hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                    aria-label={`Wishlist, ${wishlistCount} saved ${wishlistCount === 1 ? 'item' : 'items'}`}
                  >
                    <Heart className="w-4 h-4 text-primary" />
                    Wishlist
                    {wishlistCount > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full btn-fashion text-white text-[10px] flex items-center justify-center font-bold">
                        {wishlistCount > 9 ? '9+' : wishlistCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={handleCartClick}
                    className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl glass dark:glass text-sm font-medium hover:bg-white/5 dark:hover:bg-white/5 transition-colors"
                    aria-label={`Cart, ${totalItems} ${totalItems === 1 ? 'item' : 'items'}`}
                  >
                    <ShoppingCart className="w-4 h-4 text-primary" />
                    Cart
                    {totalItems > 0 && (
                      <span className="min-w-5 h-5 px-1.5 rounded-full btn-fashion text-white text-[10px] flex items-center justify-center font-bold">
                        {totalItems > 9 ? '9+' : totalItems}
                      </span>
                    )}
                  </button>
                </div>

                {/* Profile / Login (mobile) */}
                {isAuthenticated ? (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleProfileClick}
                      className="flex flex-1 items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-glow"
                      aria-label="Go to profile dashboard"
                    >
                      <User className="w-4 h-4" />
                      {user?.name?.split(' ')[0] || 'Profile'}
                    </button>
                    <button
                      onClick={handleLogoutClick}
                      className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass dark:glass text-sm font-semibold hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      aria-label="Log out"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLoginClick}
                    className="mt-2 flex w-full items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold shadow-glow"
                    aria-label="Log in"
                  >
                    <LogIn className="w-4 h-4" />
                    Login / Sign Up
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </>
  )
}