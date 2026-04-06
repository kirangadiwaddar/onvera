import { Skeleton } from "@/components/ui/skeleton"

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 px-5 pt-5 @xl/main:grid-cols-5 @5xl/main:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="relative rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900"
        >
          <Skeleton className="absolute right-5 top-3 h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-3">
            <Skeleton className="h-10 w-20 bg-zinc-200 dark:bg-zinc-800" />
            <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function DashboardPanelSkeleton({
  compact = false,
  rows = 5,
}: {
  compact?: boolean
  rows?: number
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
      <div className="flex items-center justify-between px-4 py-3">
        <Skeleton className="h-5 w-32 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className={compact ? "space-y-4 p-5" : "space-y-4 p-4"}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <Skeleton className="h-3 w-14 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            {index < rows - 1 ? <div className="border-t border-zinc-200/80 dark:border-zinc-800" /> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function DashboardChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 px-5 lg:grid-cols-2">
      <DashboardChartCardSkeleton />
      <DashboardChartCardSkeleton />
    </div>
  )
}

export function DashboardChartCardSkeleton() {
  return (
    <div className="rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
      <div className="space-y-3">
        <Skeleton className="h-5 w-36 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-3 w-28 bg-zinc-200 dark:bg-zinc-800" />
        <Skeleton className="h-56 w-full rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    </div>
  )
}

export function DashboardPageSkeleton() {
  return (
    <div className="flex flex-col gap-2 pb-4 md:pb-6">
      <DashboardStatsSkeleton />
      <DashboardChartsSkeleton />
      <div className="mx-5 mt-5 grid gap-5 xl:grid-cols-3">
        <DashboardPanelSkeleton rows={5} />
        <div className="xl:col-span-2">
          <DashboardPanelSkeleton compact rows={4} />
        </div>
      </div>
    </div>
  )
}

export function ProjectsPageSkeleton() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col items-center justify-between gap-4 px-7 lg:flex-row lg:gap-5">
        <div className="w-full flex-1 space-y-2">
          <Skeleton className="h-4 w-80 max-w-full bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-4 w-60 max-w-full bg-zinc-200 dark:bg-zinc-800" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-10 w-44 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          <Skeleton className="h-10 w-32 rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 p-7 pb-0 pt-0 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl bg-zinc-100 p-5 dark:bg-zinc-900">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <Skeleton className="h-10 w-10 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-6 w-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-44 bg-zinc-200 dark:bg-zinc-800" />
                <Skeleton className="h-4 w-28 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <Skeleton className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />
              <Skeleton className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
