import { SearchX, AlertTriangle, ImageOff } from 'lucide-react'
import MagneticButton from './MagneticButton'
import Reveal from './Reveal'

export function EmptyState({ icon: Icon = SearchX, title = 'No products found', message = 'Try adjusting your search or filters.', actionLabel, onAction }) {
  return (
    <Reveal>
      <div className="rounded-4xl glass dark:glass p-10 sm:p-14 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-5">
          <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">{title}</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">{message}</p>
        {actionLabel && onAction && (
          <MagneticButton
            onClick={onAction}
            className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-sm shadow-glow"
          >
            {actionLabel}
          </MagneticButton>
        )}
      </div>
    </Reveal>
  )
}

export function ErrorState({ message = 'Unable to load products.', onRetry }) {
  return (
    <Reveal>
      <div className="rounded-4xl glass dark:glass p-10 sm:p-14 text-center">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
        </div>
        <h3 className="font-display text-xl sm:text-2xl font-bold mb-2">Unable to load products</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">{message}</p>
        {onRetry && (
          <MagneticButton
            onClick={onRetry}
            className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl glass dark:glass font-semibold text-sm"
          >
            Try Again
          </MagneticButton>
        )}
      </div>
    </Reveal>
  )
}

export function ImageUnavailable({ label = 'Image unavailable' }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
      <div className="w-14 h-14 rounded-2xl bg-white/60 dark:bg-white/10 flex items-center justify-center">
        <ImageOff className="w-6 h-6 text-gray-400 dark:text-gray-500" />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
    </div>
  )
}