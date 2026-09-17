import { Loader2, Sparkles, Shirt, Upload, BarChart3, Database } from 'lucide-react'

export function RouteLoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center p-8 rounded-3xl glass dark:glass border border-primary/20 max-w-sm w-full text-center shadow-2xl animate-pulse">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary/20 via-secondary/20 to-accent-cyan/20 flex items-center justify-center mb-4 border border-primary/30">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
        </div>
        <div className="h-5 w-36 bg-primary/20 rounded-full mb-3" />
        <div className="h-3 w-48 bg-gray-300 dark:bg-gray-700 rounded-full" />
      </div>
    </div>
  )
}

export function AdminDashboardSkeleton({ title = 'Admin Dashboard' }) {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="h-4 w-28 bg-primary/20 rounded-full mb-2" />
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-xl mb-2" />
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 rounded-3xl glass dark:glass border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-8 h-8 rounded-xl bg-primary/10" />
            </div>
            <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>

      {/* Main Table / Data Panel */}
      <div className="rounded-3xl glass dark:glass border border-white/10 p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-9 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-200/50 dark:bg-gray-800/50 rounded-2xl flex items-center px-4 justify-between">
              <div className="h-4 w-36 bg-gray-300 dark:bg-gray-700 rounded" />
              <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded" />
              <div className="h-4 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function VirtualTryOnSkeleton() {
  return (
    <section id="tryon" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 animate-pulse">
          <div className="h-7 w-44 bg-primary/20 rounded-full mx-auto mb-4" />
          <div className="h-10 w-72 sm:w-96 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4" />
          <div className="h-4 w-60 sm:w-80 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto" />
        </div>

        {/* 2-Column Studio */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="h-[460px] rounded-4xl glass dark:glass border border-primary/20 flex flex-col items-center justify-center p-8 animate-pulse text-center">
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
              <Upload className="w-8 h-8 text-primary opacity-60" />
            </div>
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-800 rounded mb-6" />
            <div className="h-11 w-40 bg-primary/20 rounded-full" />
          </div>

          <div className="h-[460px] rounded-4xl glass dark:glass border border-secondary/20 flex flex-col items-center justify-center p-8 animate-pulse text-center">
            <div className="w-16 h-16 rounded-3xl bg-secondary/10 flex items-center justify-center mb-6 border border-secondary/20">
              <Shirt className="w-8 h-8 text-secondary opacity-60" />
            </div>
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl mb-3" />
            <div className="h-4 w-52 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function ThreeDMannequinSkeleton() {
  return (
    <div className="w-full h-[500px] md:h-[600px] rounded-4xl glass dark:glass border border-primary/20 flex flex-col items-center justify-center p-8 text-center animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary/5" />
      <div className="relative z-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/30 to-secondary/30 flex items-center justify-center mx-auto mb-4 border border-primary/30 shadow-glow">
          <Sparkles className="w-9 h-9 text-primary animate-spin" />
        </div>
        <div className="h-5 w-44 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-2" />
        <div className="h-3 w-28 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto" />
      </div>
    </div>
  )
}

export function ProductDetailsSkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-pulse">
      <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded mb-8" />
      <div className="grid lg:grid-cols-2 gap-12 items-start">
        {/* Gallery skeleton */}
        <div className="aspect-[4/5] rounded-4xl glass dark:glass border border-white/10 flex items-center justify-center">
          <Shirt className="w-16 h-16 text-gray-400 dark:text-gray-600 opacity-40" />
        </div>
        {/* Info skeleton */}
        <div className="space-y-6">
          <div className="h-4 w-24 bg-primary/20 rounded-full" />
          <div className="h-9 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-2xl" />
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          <div className="h-20 bg-gray-200/40 dark:bg-gray-800/40 rounded-2xl" />
          <div className="h-12 w-full bg-primary/20 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function DiscoverySkeleton() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-pulse">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="h-8 w-72 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-3" />
        <div className="h-4 w-96 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto" />
      </div>
      <div className="h-14 max-w-2xl mx-auto rounded-full glass border border-white/10 mb-12" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="aspect-[4/5] rounded-4xl glass dark:glass border border-white/10 p-4">
            <div className="h-2/3 bg-gray-200/50 dark:bg-gray-800/50 rounded-3xl mb-4" />
            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
