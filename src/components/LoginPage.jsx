import { useState } from 'react'
import { ArrowLeft, LockKeyhole, Mail, Sparkles, User, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser, signupUser } from '../services/authService'
import Reveal from './ui/Reveal'
import MagneticButton from './ui/MagneticButton'

export default function LoginPage({ initialMode = 'login' }) {
  const navigate = useNavigate()
  const { loginSuccess, signup, isAuthenticated } = useAuth()
  const [mode, setMode] = useState(initialMode) // 'login' | 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
    if (success) setSuccess('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const { name, email, password } = form

    if (!email.trim() || !email.includes('@')) {
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
        setSuccess('Logged in successfully! Redirecting...')
        loginSuccess(access_token, userData)
        setTimeout(() => {
          navigate('/')
        }, 800)
      } catch (err) {
        setError(err.message || 'Login failed. Please try again.')
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
      setSuccess('Account created successfully! Redirecting...')
      signup(access_token, userData)
      setTimeout(() => {
        navigate('/')
      }, 800)
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative min-h-screen overflow-hidden py-24">
      <div className="absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <Reveal className="mb-8">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-full glass dark:glass px-4 py-2 text-sm font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Reveal>

        <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal direction="left">
            <div className="rounded-[32px] glass dark:glass p-8 sm:p-10">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.22em] text-cyan-200">
                <Sparkles className="w-3.5 h-3.5" />
                {mode === 'signup' ? 'Join StyleVerse' : 'Welcome back'}
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight text-white">
                {mode === 'signup' ? 'Create your ' : 'Sign in to '}
                <span className="text-shine">StyleVerse AI</span>
              </h1>
              <p className="mt-4 max-w-lg text-base text-gray-600 dark:text-gray-300">
                {mode === 'signup'
                  ? 'Join the AI-powered fashion platform to personalize your fits and discover style recommendations.'
                  : 'Access your wishlist, saved looks, and curated shopping experiences in one place.'}
              </p>

              <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-slate-950/20 p-5 text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium text-white">Demo access</p>
                <p>Email: test@example.com</p>
                <p>Password: TestPassword123</p>
              </div>
            </div>
          </Reveal>

          <Reveal direction="right" delay={0.1}>
            <div className="rounded-[32px] glass dark:glass p-6 sm:p-8">
              {/* Tab Switcher */}
              <div className="flex gap-2 rounded-2xl bg-slate-950/40 p-1 mb-6 border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login')
                    setError('')
                    setSuccess('')
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    mode === 'login'
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
                    setSuccess('')
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                    mode === 'signup'
                      ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary text-white shadow-glow">
                  {mode === 'signup' ? <User className="w-5 h-5" /> : <LockKeyhole className="w-5 h-5" />}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Account</p>
                  <h2 className="text-2xl font-semibold text-white">
                    {mode === 'signup' ? 'Create Account' : 'Login'}
                  </h2>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'signup' && (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Full Name</span>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 focus-within:border-primary/60">
                      <User className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        disabled={loading}
                        className="w-full bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                      />
                    </div>
                  </label>
                )}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Email</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 focus-within:border-primary/60">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder={mode === 'signup' ? 'your.email@example.com' : 'test@example.com'}
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">Password</span>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 focus-within:border-primary/60">
                    <LockKeyhole className="w-4 h-4 text-gray-400" />
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      disabled={loading}
                      className="w-full bg-transparent text-sm text-white placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
                    />
                  </div>
                </label>

                {error && (
                  <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                    {success}
                  </div>
                )}

                <MagneticButton
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary px-5 py-3 text-sm font-semibold text-white shadow-glow disabled:opacity-50 flex items-center justify-center gap-2"
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
