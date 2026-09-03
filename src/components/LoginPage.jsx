import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail, Sparkles, User, Loader2 } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser, signupUser } from '../services/authService'
import { useToast } from './ui/Toast'
import { getErrorMessage } from '../services/apiClient'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

export default function LoginPage({ initialMode = 'login' }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { loginSuccess, signup, isAuthenticated } = useAuth()
  const toast = useToast()
  // Preserve the page the user was viewing when they were redirected to login.
  const redirectTo = location.state?.from || '/'
  const [mode, setMode] = useState(initialMode) // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    setMode(initialMode)
    setError('')
    setShowPassword(false)
  }, [initialMode])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const { name, email, password } = form

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    if (mode === 'login') {
      setLoading(true)
      // Clear password from local state immediately after reading
      setForm((prev) => ({ ...prev, password: '' }))

      try {
        const { access_token, user: userData } = await loginUser({ email: email.trim(), password })
        toast.success('Logged in successfully! Redirecting...')
        loginSuccess(access_token, userData)
        setTimeout(() => {
          navigate(redirectTo)
        }, 800)
      } catch (err) {
        setError(getErrorMessage(err))
      } finally {
        setLoading(false)
      }
      return
    }

    // Signup mode
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    setLoading(true)
    // Clear password from local state immediately after reading
    setForm((prev) => ({ ...prev, password: '' }))

    try {
      const { access_token, user: userData } = await signupUser({ name: name.trim(), email: email.trim(), password })
      toast.success('Account created successfully! Redirecting...')
      signup(access_token, userData)
      setTimeout(() => {
        navigate('/onboarding', { state: { from: redirectTo } })
      }, 800)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_15%,rgba(255,46,136,0.14),transparent_32%),radial-gradient(circle_at_90%_85%,rgba(0,229,255,0.1),transparent_30%)]" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-secondary/10 blur-[110px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Reveal className="mb-6 sm:mb-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Reveal>

        <div className="grid min-w-0 items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <Reveal direction="left" className="min-w-0">
            <div className="relative flex h-full min-w-0 w-full max-w-full flex-col justify-between overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.06] p-7 shadow-soft backdrop-blur-xl sm:p-10">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="w-3.5 h-3.5" />
                {mode === 'signup' ? 'Join StyleVerse' : 'Welcome back'}
                </div>
                <h1 className="max-w-xl break-words font-display text-4xl font-normal leading-tight tracking-tight text-white sm:text-6xl">
                {mode === 'signup' ? 'Create your ' : 'Sign in to '}
                <span className="text-shine">StyleVerse AI</span>
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-gray-300">
                {mode === 'signup'
                  ? 'Join the AI-powered fashion platform to personalize your fits and discover style recommendations.'
                  : 'Access your wishlist, saved looks, and curated shopping experiences in one place.'}
                </p>
              </div>

              <div className="relative mt-10 rounded-3xl border border-white/10 bg-slate-950/30 p-5 text-sm text-gray-300">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-white">Demo access</p>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">Ready to explore</span>
                </div>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div><p className="mb-1 text-gray-500">Email</p><p className="font-medium text-gray-200">test@example.com</p></div>
                  <div><p className="mb-1 text-gray-500">Password</p><p className="font-medium text-gray-200">TestPassword123</p></div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.1} className="min-w-0">
            <div className="min-w-0 w-full max-w-full rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-soft backdrop-blur-xl sm:p-8">
              {/* Tab Switcher */}
              <div className="mb-8 flex gap-1 rounded-2xl border border-white/10 bg-slate-950/50 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                  }}
                  className={`min-h-11 flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${mode === 'login'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup')
                    setError('')
                  }}
                  className={`min-h-11 flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${mode === 'signup'
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                    : 'text-gray-400 hover:text-white'
                    }`}
                >
                  Sign Up
                </button>
              </div>

              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow" aria-hidden="true">
                  {mode === 'signup' ? <User className="w-5 h-5" /> : <LockKeyhole className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Account</p>
                  <h2 className="text-2xl font-semibold text-white">
                    {mode === 'signup' ? 'Create Account' : 'Login'}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {mode === 'signup' && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-200">Full Name</span>
                    <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 transition-colors focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40">
                      <User className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        autoComplete="name"
                        disabled={loading}
                        aria-label="Full name"
                        className="w-full bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-200">Email</span>
                  <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 transition-colors focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder={mode === 'signup' ? 'your.email@example.com' : 'test@example.com'}
                      autoComplete="email"
                      disabled={loading}
                      aria-label="Email address"
                      className="w-full bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-200">Password</span>
                  <div className="flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3 transition-colors focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/40">
                    <LockKeyhole className="w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder={mode === 'signup' ? 'At least 8 characters' : 'Enter your password'}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                      disabled={loading}
                      aria-label="Password"
                      className="w-full bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                      className="min-h-8 min-w-8 shrink-0 rounded-lg text-gray-400 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </label>

                {error && (
                  <div role="alert" aria-live="polite" className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-200">
                    {error}
                  </div>
                )}

                <MagneticButton
                  type="submit"
                  disabled={loading}
                  className="min-h-12 w-full rounded-2xl bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm font-semibold text-white shadow-glow transition-all hover:shadow-glow-violet focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{mode === 'signup' ? 'Creating Account...' : 'Signing In...'}</span>
                    </>
                  ) : (
                    <span>{mode === 'signup' ? 'Sign Up' : 'Sign In'}</span>
                  )}
                </MagneticButton>

                {isAuthenticated && (
                  <p className="text-center text-xs text-green-400">You are already signed in.</p>
                )}
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
