import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertOctagon, RefreshCw, Home, Mail } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

/**
 * React Error Boundary that catches render-time exceptions.
 * Prevents the entire React tree from unmounting to a blank page.
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorId: null
        }
    }

    static getDerivedStateFromError(error) {
        // Generate a unique error ID for tracking
        const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
        return {
            hasError: true,
            error,
            errorId
        }
    }

    componentDidCatch(error, errorInfo) {
        // Log to console in development
        if (import.meta.env.DEV) {
            console.error('ErrorBoundary caught an error:', error, errorInfo)
        }

        // In production, this would send to an error tracking service (e.g., Sentry)
        // For now, we log with the error ID for correlation
        console.error(`[${this.state.errorId}] Error caught by boundary:`, error?.message)

        // Call optional onError prop if provided
        if (this.props.onError) {
            this.props.onError(error, errorInfo)
        }
    }

    resetError = () => {
        this.setState({ hasError: false, error: null, errorId: null })
    }

    render() {
        if (this.state.hasError) {
            return (
                <ErrorFallback
                    error={this.state.error}
                    errorId={this.state.errorId}
                    onReset={this.resetError}
                    showErrorId={this.props.showErrorId}
                />
            )
        }

        return this.props.children
    }
}

// ============================================================================
// ERROR FALLBACK UI
// ============================================================================

function ErrorFallback({ error, errorId, onReset, showErrorId }) {
    const navigate = useNavigate()
    const location = useLocation()
    const isHomePage = location.pathname === '/'

    // Build mailto link for error reporting
    const reportSubject = encodeURIComponent(`StyleVerse Error Report`)
    const reportBody = encodeURIComponent(
        `Error ID: ${errorId}\n` +
        `Page: ${location.pathname}\n` +
        `Time: ${new Date().toISOString()}\n\n` +
        `Description:\n[Please describe what you were doing when this error occurred]`
    )
    const mailtoLink = `mailto:support@styleverse.ai?subject=${reportSubject}&body=${reportBody}`

    return (
        <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
            {/* Background gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-pink-900/10 via-transparent to-violet-900/10 pointer-events-none" />

            <AnimatePresence mode="wait">
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="relative w-full max-w-md"
                >
                    {/* Card container */}
                    <div className="relative bg-dark-surface/80 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
                        {/* Gradient border effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 p-px">
                            <div className="w-full h-full rounded-3xl bg-dark-surface" />
                        </div>

                        {/* Content */}
                        <div className="relative p-8 text-center">
                            {/* Error icon with glow */}
                            <div className="relative inline-flex mb-6">
                                {/* Glow effect */}
                                <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full" />
                                {/* Icon */}
                                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-rose-500/20 border border-red-500/30 flex items-center justify-center">
                                    <AlertOctagon className="w-10 h-10 text-red-400" />
                                </div>
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl font-display font-bold text-white mb-3">
                                Something went wrong
                            </h1>

                            {/* Description */}
                            <p className="text-dark-secondary mb-6 leading-relaxed">
                                We encountered an unexpected error. This has been logged and we'll look into it.
                            </p>

                            {/* Error ID (optional, for support) */}
                            {showErrorId && errorId && (
                                <div className="mb-6 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <p className="text-xs text-dark-secondary mb-1">Reference ID</p>
                                    <p className="text-sm font-mono text-white/80">{errorId}</p>
                                </div>
                            )}

                            {/* Action buttons */}
                            <div className="space-y-3">
                                {/* Try Again button */}
                                <button
                                    onClick={onReset}
                                    className="w-full group relative inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-secondary rounded-xl text-white font-medium transition-all duration-300 hover:shadow-glow hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
                                    Try Again
                                </button>

                                {/* Go Home button */}
                                {!isHomePage && (
                                    <button
                                        onClick={() => navigate('/')}
                                        className="w-full group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 font-medium transition-all duration-300 hover:text-white hover:border-white/20"
                                    >
                                        <Home className="w-4 h-4" />
                                        Go Home
                                    </button>
                                )}

                                {/* Refresh page button (alternative) */}
                                {isHomePage && (
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full group inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/80 font-medium transition-all duration-300 hover:text-white hover:border-white/20"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Refresh Page
                                    </button>
                                )}
                            </div>

                            {/* Report issue link */}
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <a
                                    href={mailtoLink}
                                    className="inline-flex items-center gap-2 text-sm text-dark-secondary hover:text-white/80 transition-colors duration-200"
                                >
                                    <Mail className="w-4 h-4" />
                                    Report this issue
                                </a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Decorative floating elements */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/5 rounded-full blur-3xl pointer-events-none" />
        </div>
    )
}

// ============================================================================
// HIGHER-ORDER COMPONENT WRAPPER
// ============================================================================

/**
 * HOC that wraps a component with an ErrorBoundary.
 * Provides a cleaner API for applying error boundaries to specific components.
 *
 * @param {React.Component} WrappedComponent - Component to wrap
 * @param {React.Component} FallbackComponent - Optional custom fallback UI
 * @param {Object} errorBoundaryProps - Props to pass to ErrorBoundary
 * @returns {React.Component} Wrapped component with error boundary
 */
export function withErrorBoundary(WrappedComponent, FallbackComponent, errorBoundaryProps = {}) {
    const wrappedComponentName = WrappedComponent.displayName || WrappedComponent.name || 'Component'

    function WithErrorBoundary(props) {
        return (
            <ErrorBoundary {...errorBoundaryProps}>
                <WrappedComponent {...props} />
            </ErrorBoundary>
        )
    }

    WithErrorBoundary.displayName = `withErrorBoundary(${wrappedComponentName})`
    return WithErrorBoundary
}

// ============================================================================
// CONSOLE ERROR CONTAINER (Development Only)
// ============================================================================

/**
 * Global error handler for uncaught errors.
 * Only active in development mode.
 */
export function initializeGlobalErrorHandler() {
    if (import.meta.env.DEV) {
        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled Promise Rejection:', event.reason)
        })

        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught Error:', event.error)
        })
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { ErrorBoundary }
export default ErrorBoundary
