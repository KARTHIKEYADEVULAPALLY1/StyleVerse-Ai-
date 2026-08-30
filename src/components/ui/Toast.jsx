import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

// ============================================================================
// CONTEXT & PROVIDER
// ============================================================================

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const MAX_TOASTS = 3

    const addToast = useCallback((type, message, options = {}) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const toast = {
            id,
            type,
            message,
            duration: options.duration ?? 4000,
            action: options.action ?? null,
        }

        setToasts((prev) => {
            const updated = [...prev, toast]
            // Keep only MAX_TOASTS most recent
            if (updated.length > MAX_TOASTS) {
                return updated.slice(-MAX_TOASTS)
            }
            return updated
        })

        // Auto dismiss
        if (toast.duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, toast.duration)
        }

        return id
    }, [])

    const dismiss = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toastApi = {
        success: (message, options) => addToast('success', message, options),
        error: (message, options) => addToast('error', message, options),
        info: (message, options) => addToast('info', message, options),
        warning: (message, options) => addToast('warning', message, options),
        dismiss,
    }

    return (
        <ToastContext.Provider value={toastApi}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    )
}

// ============================================================================
// HOOK
// ============================================================================

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

// ============================================================================
// TOAST CONFIGURATION
// ============================================================================

const TOAST_CONFIG = {
    success: {
        icon: CheckCircle,
        gradient: 'from-emerald-500/20 to-teal-500/20',
        border: 'border-emerald-500/30',
        iconColor: 'text-emerald-400',
        glowColor: 'rgba(16, 185, 129, 0.2)',
    },
    error: {
        icon: XCircle,
        gradient: 'from-red-500/20 to-rose-500/20',
        border: 'border-red-500/30',
        iconColor: 'text-red-400',
        glowColor: 'rgba(239, 68, 68, 0.2)',
    },
    info: {
        icon: Info,
        gradient: 'from-blue-500/20 to-indigo-500/20',
        border: 'border-blue-500/30',
        iconColor: 'text-blue-400',
        glowColor: 'rgba(59, 130, 246, 0.2)',
    },
    warning: {
        icon: AlertTriangle,
        gradient: 'from-amber-500/20 to-orange-500/20',
        border: 'border-amber-500/30',
        iconColor: 'text-amber-400',
        glowColor: 'rgba(245, 158, 11, 0.2)',
    },
}

// ============================================================================
// INDIVIDUAL TOAST COMPONENT
// ============================================================================

function Toast({ toast, onDismiss }) {
    const config = TOAST_CONFIG[toast.type]
    const Icon = config.icon

    const handleClick = () => {
        if (toast.action?.onClick) {
            toast.action.onClick()
        }
        onDismiss(toast.id)
    }

    const handleDismiss = (e) => {
        e.stopPropagation()
        onDismiss(toast.id)
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
            transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
                layout: { duration: 0.3 },
            }}
            onClick={handleClick}
            className={`
        relative w-80 overflow-hidden rounded-2xl cursor-pointer
        backdrop-blur-xl bg-dark-surface/90 border
        ${config.border}
        shadow-card
        hover:scale-[1.02] hover:shadow-lg
        transition-shadow duration-200
      `}
            style={{
                boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px ${config.glowColor}`,
            }}
        >
            {/* Gradient background accent */}
            <div
                className={`absolute inset-0 bg-gradient-to-br ${config.gradient} opacity-60`}
            />

            {/* Glow effect */}
            <div
                className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-40"
                style={{ backgroundColor: config.glowColor.replace('0.2', '0.4') }}
            />

            <div className="relative z-10 flex items-start gap-3 p-4">
                {/* Icon */}
                <div className={`flex-shrink-0 mt-0.5 ${config.iconColor}`}>
                    <Icon size={22} strokeWidth={2} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 leading-snug">
                        {toast.message}
                    </p>

                    {/* Action button */}
                    {toast.action && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                toast.action.onClick()
                            }}
                            className={`
                mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg
                bg-white/10 hover:bg-white/20
                border border-white/10
                transition-all duration-200
                ${config.iconColor.replace('text-', 'hover:text-')}
              `}
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>

                {/* Dismiss button */}
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            </div>

            {/* Progress bar for auto-dismiss */}
            {toast.duration > 0 && (
                <ToastProgress duration={toast.duration} color={config.glowColor} />
            )}
        </motion.div>
    )
}

// ============================================================================
// PROGRESS BAR
// ============================================================================

function ToastProgress({ duration, color }) {
    const [progress, setProgress] = useState(100)

    useEffect(() => {
        const startTime = Date.now()
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
            setProgress(remaining)
            if (remaining <= 0) {
                clearInterval(interval)
            }
        }, 50)

        return () => clearInterval(interval)
    }, [duration])

    return (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
            <div
                className="h-full transition-all duration-50 ease-linear rounded-b-2xl"
                style={{
                    width: `${progress}%`,
                    background: `linear-gradient(to right, ${color.replace('0.2', '0.5')}, ${color.replace('0.2', '0.3')})`,
                }}
            />
        </div>
    )
}

// ============================================================================
// TOAST CONTAINER
// ============================================================================

function ToastContainer({ toasts, onDismiss }) {
    return (
        <div
            className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none"
            aria-live="polite"
            aria-label="Notifications"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <div key={toast.id} className="pointer-events-auto">
                        <Toast toast={toast} onDismiss={onDismiss} />
                    </div>
                ))}
            </AnimatePresence>
        </div>
    )
}

// ============================================================================
// EXAMPLES / USAGE (commented out for reference)
// ============================================================================

/*
// Wrap your app with ToastProvider in main.jsx or App.jsx:
import { ToastProvider } from './components/ui/Toast'

function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  )
}

// Use the hook in any component:
import { useToast } from './components/ui/Toast'

function MyComponent() {
  const toast = useToast()

  const handleAddToWishlist = async () => {
    try {
      await addToWishlist(product)
      toast.success('Added to Wishlist', { duration: 3000 })
    } catch (error) {
      toast.error('Unable to add to wishlist', {
        duration: 5000,
        action: { label: 'Retry', onClick: handleAddToWishlist }
      })
    }
  }

  const handleSessionExpired = () => {
    toast.info('Session expired', {
      duration: 0, // No auto-dismiss
      action: { label: 'Log in', onClick: () => navigate('/login') }
    })
  }

  const handleLowStock = () => {
    toast.warning('Only 2 items left!', { duration: 4000 })
  }

  return <button onClick={handleAddToWishlist}>Add to Wishlist</button>
}
*/
