export default function ProductSkeleton() {
  return (
    <div className="snap-start shrink-0 w-[280px] sm:w-[320px]">
      <div className="h-full rounded-4xl overflow-hidden glass dark:glass">
        {/* Image skeleton */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gray-200 dark:bg-gray-800">
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-700" />
        </div>

        {/* Content skeleton */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="h-3 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-3 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>

          <div className="h-4 w-3/4 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
          <div className="h-3 w-1/2 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mb-4" />

          <div className="flex items-center gap-2">
            <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="h-3 w-12 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}