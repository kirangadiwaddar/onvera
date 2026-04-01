"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

import { SectionCards } from "@/components/dashboard/section-cards"
import { AlarmClockMinus, CalendarCheck, GalleryVerticalEnd, Pause, Timer, TriangleAlert } from "lucide-react"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"
import type { Project } from "@/types/project"
import { Skeleton } from "@/components/ui/skeleton"

import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"

function ChartPanelSkeleton() {
  return <Skeleton className="h-[280px] w-full rounded-xl" />
}

function ActivityPanelSkeleton() {
  return <Skeleton className="h-[360px] w-full rounded-2xl" />
}

function AttentionPanelSkeleton() {
  return <Skeleton className="h-[360px] w-full rounded-2xl" />
}

const CompletedProjectsChart = dynamic(
  () => import("@/components/dashboard/completedProjectsChart").then((mod) => mod.CompletedProjectsChart),
  { ssr: false, loading: () => <ChartPanelSkeleton /> },
)

const MonthlyProjectsChart = dynamic(
  () => import("@/components/dashboard/monthlyProjects").then((mod) => mod.MonthlyProjectsChart),
  { ssr: false, loading: () => <ChartPanelSkeleton /> },
)

const RecentActivity = dynamic(
  () => import("@/components/dashboard/recentActivity").then((mod) => mod.RecentActivity),
  { ssr: false, loading: () => <ActivityPanelSkeleton /> },
)

const AttentionTable = dynamic(
  () => import("@/components/dashboard/attentionTable"),
  { ssr: false, loading: () => <AttentionPanelSkeleton /> },
)

type DashboardResponse = {
  stats: {
    total: number
    waiting: number
    completed: number
    overdue: number
  }
  lists: {
    latestWaitingOverdue: Project[]
  }
  activities?: {
    id: string
    title: string
    project: string
    status: string
    actor?: "Admin" | "Client" | "Team Lead"
    timestamp?: string
  }[]
}

type DashboardInitResponse = {
  stats?: DashboardResponse["stats"]
  lists?: DashboardResponse["lists"]
}

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}


export default function Page() {
  const { user, profile, loading: authLoading } = useAuth()
  const [shellReady, setShellReady] = useState(false)
  const [workspaceVersion, setWorkspaceVersion] = useState(0)

  const localRole = useMemo(() => {
    const raw =
      profile?.role ||
      (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
      null
    return raw ? raw.trim().toLowerCase().replace(/\s+/g, "_") : null
  }, [profile?.role, user?.user_metadata?.role])

  const effectiveRole = localRole

  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(false)

  const loadSummary = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetchWithAuth("/api/dashboard-summary", { cache: "no-store" })
      const payload = await res.json().catch(() => null) as DashboardInitResponse | null

      if (!res.ok) {
        throw new Error((payload as { message?: string } | null)?.message || `Failed to load dashboard (${res.status})`)
      }

      if (!payload?.stats || !payload?.lists) {
        throw new Error("Dashboard response is invalid")
      }
      setData((prev) => ({
        activities: prev?.activities || [],
        stats: payload.stats!,
        lists: payload.lists!,
      }))
      setError(null)
    } catch (fetchError) {
      if (!silent) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard")
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const loadActivities = useCallback(async () => {
    try {
      setActivitiesLoading(true)
      const res = await fetchWithAuth("/api/dashboard-details?limit=50", { cache: "no-store" })
      const payload = await res.json().catch(() => null) as { activities?: DashboardResponse["activities"] } | null
      setData((prev) =>
        prev
          ? {
              ...prev,
              activities: Array.isArray(payload?.activities) ? payload.activities : [],
            }
          : prev,
      )
    } catch {
      // keep existing activities payload
    } finally {
      setActivitiesLoading(false)
    }
  }, [])

  const loadShell = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/api/dashboard-shell", { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to load dashboard shell")
      setShellReady(true)
    } catch {
      setShellReady(true)
    }
  }, [])

  const isRestricted = effectiveRole !== "super_admin"

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  const storageBase = user?.email ? `notifications:${user.email}` : "notifications:anonymous"
  const hiddenKey = `${storageBase}:hidden`

  useEffect(() => {
    if (typeof window === "undefined") return
    const readHidden = () => {
      const storedHidden = window.localStorage.getItem(hiddenKey)
      if (storedHidden) {
        try {
          const parsed = JSON.parse(storedHidden) as string[]
          if (Array.isArray(parsed)) {
            setHiddenIds(parsed)
            return
          }
        } catch {
          setHiddenIds([])
        }
      } else {
        setHiddenIds([])
      }
    }

    readHidden()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === hiddenKey) {
        readHidden()
      }
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener("notifications:updated", readHidden)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("notifications:updated", readHidden)
    }
  }, [hiddenKey])

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) {
      setLoading(false)
      setShellReady(true)
      return
    }
    void Promise.all([loadShell(), loadSummary(false)])
  }, [authLoading, loadShell, loadSummary, user?.id, workspaceVersion])

  useEffect(() => {
    if (authLoading || !user?.id) return
    void loadActivities()
  }, [authLoading, loadActivities, user?.id, workspaceVersion])

  useEffect(() => {
    if (typeof window === "undefined") return
    const syncWorkspace = () => setWorkspaceVersion((prev) => prev + 1)
    window.addEventListener("workspace:changed", syncWorkspace)
    window.addEventListener("storage", syncWorkspace)
    return () => {
      window.removeEventListener("workspace:changed", syncWorkspace)
      window.removeEventListener("storage", syncWorkspace)
    }
  }, [])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel("dashboard-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          void loadSummary(true)
          void loadActivities()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "onboarding_tokens" },
        () => {
          void loadSummary(true)
          void loadActivities()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadSummary, loadActivities, supabase])

  if (authLoading || !shellReady) {
    return (
      <LoadingState title="Loading dashboard..." description="Checking your access permissions." />
    )
  }

  if (user && isRestricted) {
    return (
      <EmptyState
        icon={<TriangleAlert className="text-destructive" />}
        title="Dashboard Unavailable"
        description="Dashboard is available only to workspace admins."
      />
    )
  }

  if (error && !data) {
    return (
      <div className="py-8">
        <EmptyState
          title="Dashboard unavailable"
          description={error}
          buttonText="Retry"
          onClick={() => void loadSummary()}
          icon={<TriangleAlert />}
        />
      </div>
    )
  }
  const dashboardData: DashboardResponse = data ?? {
    stats: {
      total: 0,
      waiting: 0,
      completed: 0,
      overdue: 0,
    },
    lists: {
      latestWaitingOverdue: [],
    },
    activities: [],
  }

  const stats = [
    {
      title: "Total Projects",
      value: dashboardData.stats.total,
      icon: GalleryVerticalEnd,
      color: "text-blue-500",
    },
    {
      title: "Waiting Projects",
      value: dashboardData.stats.waiting,
      icon: Timer,
      color: "text-orange-500",
    },
    {
      title: "Completed Projects",
      value: dashboardData.stats.completed,
      icon: CalendarCheck,
      color: "text-green-500",
    },
    {
      title: "Overdue Projects",
      value: dashboardData.stats.overdue,
      icon: AlarmClockMinus,
      color: "text-destructive",
    },
    {
      title: "Onhold Projects",
      value: dashboardData.stats.overdue,
      icon: Pause,
      color: "text-pink-500",
    },
  ]

  return (
   <div className="flex flex-col gap-2 pb-4 md:pb-6">
      {loading && data ? (
        <div className="mx-5 rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
          Refreshing dashboard data...
        </div>
      ) : null}
      <SectionCards stats={stats} />

      <div className="grid xl:grid-cols-3 gap-5 mx-5">
        <div className="col-span-2 rounded-xl w-full">
          <Suspense fallback={<ChartPanelSkeleton />}>
            <MonthlyProjectsChart />
          </Suspense>
        </div>

        <div className="rounded-xl w-full h-full space-y-5">
          <Suspense fallback={<ChartPanelSkeleton />}>
            <CompletedProjectsChart
              completed={dashboardData.stats.completed}
              total={dashboardData.stats.total}
            />
          </Suspense>
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mx-5 mt-5">
        <Suspense fallback={<ActivityPanelSkeleton />}>
          <RecentActivity
            activities={(dashboardData.activities || []).filter((activity) => !hiddenIds.includes(activity.id))}
            loading={loading || activitiesLoading}
          />
        </Suspense>
        <Suspense fallback={<AttentionPanelSkeleton />}>
          <AttentionTable projects={dashboardData.lists.latestWaitingOverdue} />
        </Suspense>
      </div>

    </div>
  )
}
