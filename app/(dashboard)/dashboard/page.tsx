"use client"

import { useEffect, useMemo, useState } from "react"
import dynamic from "next/dynamic"

import { SectionCards } from "@/components/dashboard/section-cards"
import { AlarmClockMinus, CalendarCheck, GalleryVerticalEnd, Pause, Timer, TriangleAlert } from "lucide-react"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"
import {
  DashboardChartCardSkeleton,
  DashboardChartsSkeleton,
  DashboardPanelSkeleton,
  DashboardStatsSkeleton,
} from "@/components/dashboard/dashboard-skeleton"

import { useAuth } from "@/components/providers/auth-provider"
import {
  useDashboardCountsQuery,
  useDashboardProjectsSummaryQuery,
  useDashboardRecentActivityQuery,
} from "@/lib/query/use-dashboard-init-query"
import { fetchWithAuth } from "@/lib/auth/client-fetch"

const loadCompletedProjectsChart = () =>
  import("@/components/dashboard/completedProjectsChart")
const loadMonthlyProjectsChart = () =>
  import("@/components/dashboard/monthlyProjects")
const loadRecentActivity = () =>
  import("@/components/dashboard/recentActivity")
const loadAttentionTable = () =>
  import("@/components/dashboard/attentionTable")

const CompletedProjectsChart = dynamic(
  () => loadCompletedProjectsChart().then((mod) => mod.CompletedProjectsChart),
  { ssr: false, loading: () => <DashboardChartCardSkeleton /> },
)

const MonthlyProjectsChart = dynamic(
  () => loadMonthlyProjectsChart().then((mod) => mod.MonthlyProjectsChart),
  { ssr: false, loading: () => <DashboardChartCardSkeleton /> },
)

const RecentActivity = dynamic(
  () => loadRecentActivity().then((mod) => mod.RecentActivity),
  { ssr: false, loading: () => <DashboardPanelSkeleton rows={5} /> },
)

const AttentionTable = dynamic(
  () => loadAttentionTable(),
  { ssr: false, loading: () => <DashboardPanelSkeleton compact rows={4} /> },
)

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

function ensureOwnerWorkspace(
  items: WorkspaceItem[],
  user: ReturnType<typeof useAuth>["user"],
  profile: ReturnType<typeof useAuth>["profile"],
): WorkspaceItem[] {
  if (!user?.id) return items
  const ownsFlag =
    typeof window !== "undefined" && window.localStorage.getItem("onvera:ownsWorkspace") === "true"
  const ownsByProfile =
    profile?.role === "super_admin" ||
    (typeof user.user_metadata?.role === "string" && user.user_metadata.role === "super_admin")
  if (!(ownsFlag || ownsByProfile)) return items
  if (items.some((workspace) => workspace.id === user.id)) return items
  const fallbackName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Workspace"
  const ownerWorkspace: WorkspaceItem = {
    id: user.id,
    name: String(fallbackName),
    email: user.email || null,
    plan: typeof profile?.plan === "string" ? profile.plan : "free",
    role: "super_admin",
  }
  return [ownerWorkspace, ...items]
}

export default function Page() {
  const { user, profile, loading: authLoading } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  const localRole = useMemo(() => {
    const raw =
      profile?.role ||
      (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
      null
    return raw ? raw.trim().toLowerCase().replace(/\s+/g, "_") : null
  }, [profile?.role, user?.user_metadata?.role])

  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const effectiveRole = currentWorkspace?.role || localRole

  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const preloadDashboardWidgets = async () => {
    await Promise.all([
      loadCompletedProjectsChart(),
      loadMonthlyProjectsChart(),
      loadRecentActivity(),
      loadAttentionTable(),
    ])
  }

  const isRestricted = effectiveRole !== "super_admin"
  const dashboardCountsQuery = useDashboardCountsQuery({
    userId: user?.id,
    enabled: !authLoading && Boolean(user?.id),
  })
  const dashboardProjectsSummaryQuery = useDashboardProjectsSummaryQuery({
    userId: user?.id,
    enabled: !authLoading && Boolean(user?.id),
  })
  const dashboardRecentActivityQuery = useDashboardRecentActivityQuery({
    userId: user?.id,
    enabled: !authLoading && Boolean(user?.id),
    limit: 12,
  })
  const statsData = dashboardCountsQuery.data?.stats ?? null
  const projectsSummary = dashboardProjectsSummaryQuery.data?.lists?.latestWaitingOverdue ?? []
  const recentActivities = dashboardRecentActivityQuery.data?.activities ?? []
  const error =
    (dashboardCountsQuery.error instanceof Error ? dashboardCountsQuery.error.message : null) ||
    (dashboardProjectsSummaryQuery.error instanceof Error ? dashboardProjectsSummaryQuery.error.message : null) ||
    (dashboardRecentActivityQuery.error instanceof Error ? dashboardRecentActivityQuery.error.message : null)

  const storageBase = user?.email ? `notifications:${user.email}` : "notifications:anonymous"
  const hiddenKey = `${storageBase}:hidden`

  useEffect(() => {
    if (authLoading || !user?.id) return
    let active = true
    const loadWorkspaces = async () => {
      try {
        const res = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
        const data = await res.json().catch(() => null) as { workspaces?: WorkspaceItem[] } | null
        if (!active) return
        let items = Array.isArray(data?.workspaces) ? data.workspaces : []
        items = ensureOwnerWorkspace(items, user, profile)
        setWorkspaces(items)
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("onvera:workspace") : null
        const preferred = stored && items.some((item) => item.id === stored) ? stored : null
        const fallback = items[0]?.id || null
        const nextId =
          preferred ||
          (items.some((item) => item.id === user.id) ? user.id : fallback)
        setSelectedWorkspaceId(nextId)
      } catch {
        setWorkspaces([])
      }
    }
    void loadWorkspaces()
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      void loadWorkspaces()
    }
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    return () => {
      active = false
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
    }
  }, [authLoading, profile, user])

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
    if (authLoading || !user?.id) return
    void preloadDashboardWidgets()
  }, [authLoading, user?.id])

  if (authLoading) {
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

  if (error && !statsData && !projectsSummary.length && !recentActivities.length) {
    return (
      <div className="py-8">
        <EmptyState
          title="Dashboard unavailable"
          description={error}
          buttonText="Retry"
          onClick={() => {
            void Promise.all([
              dashboardCountsQuery.refetch(),
              dashboardProjectsSummaryQuery.refetch(),
              dashboardRecentActivityQuery.refetch(),
            ])
          }}
          icon={<TriangleAlert />}
        />
      </div>
    )
  }

  const stats = [
    {
      title: "Total Projects",
      value: statsData?.total ?? 0,
      icon: GalleryVerticalEnd,
      color: "text-blue-500",
    },
    {
      title: "Waiting Projects",
      value: statsData?.waiting ?? 0,
      icon: Timer,
      color: "text-orange-500",
    },
    {
      title: "Completed Projects",
      value: statsData?.completed ?? 0,
      icon: CalendarCheck,
      color: "text-green-500",
    },
    {
      title: "Overdue Projects",
      value: statsData?.overdue ?? 0,
      icon: AlarmClockMinus,
      color: "text-destructive",
    },
    {
      title: "Onhold Projects",
      value: statsData?.overdue ?? 0,
      icon: Pause,
      color: "text-pink-500",
    },
  ]

  const isAnyQueryRefreshing =
    (dashboardCountsQuery.isFetching && Boolean(statsData)) ||
    (dashboardProjectsSummaryQuery.isFetching && dashboardProjectsSummaryQuery.data !== undefined) ||
    (dashboardRecentActivityQuery.isFetching && dashboardRecentActivityQuery.data !== undefined)

  return (
   <div className="flex flex-col gap-2 pb-4 md:pb-6">
      {isAnyQueryRefreshing ? (
        <div className="mx-5 rounded-lg border border-border/70 bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
          Refreshing dashboard data...
        </div>
      ) : null}
      {statsData ? <SectionCards stats={stats} /> : <DashboardStatsSkeleton />}

      {statsData ? (
        <div className="grid xl:grid-cols-3 gap-5 mx-5">
          <div className="col-span-2 rounded-xl w-full">
            <MonthlyProjectsChart />
          </div>

          <div className="rounded-xl w-full h-full space-y-5">
            <CompletedProjectsChart
              completed={statsData.completed}
              total={statsData.total}
            />
          </div>
        </div>
      ) : (
        <div className="mx-5">
          <DashboardChartsSkeleton />
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-5 mx-5 mt-5">
        <RecentActivity
          activities={recentActivities.filter((activity) => !hiddenIds.includes(activity.id))}
          loading={!dashboardRecentActivityQuery.data && (dashboardRecentActivityQuery.isLoading || dashboardRecentActivityQuery.isFetching)}
        />
        {dashboardProjectsSummaryQuery.data ? (
          <AttentionTable projects={projectsSummary} />
        ) : (
          <div className="xl:col-span-2">
            <DashboardPanelSkeleton compact rows={4} />
          </div>
        )}
      </div>

    </div>
  )
}
