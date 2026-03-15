"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import AttentionTable from "@/components/dashboard/attentionTable"
import { CompletedProjectsChart } from "@/components/dashboard/completedProjectsChart"
import { SectionCards } from "@/components/dashboard/section-cards"
import { AlarmClockMinus, CalendarCheck, ClipboardClock, GalleryVerticalEnd, Timer } from "lucide-react"
import { LoadingState } from "@/components/loadingState"
import { RecentActivity } from "@/components/dashboard/recentActivity"
import type { Project } from "@/types/project"

import { MonthlyProjectsChart } from "@/components/dashboard/monthlyProjects"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"

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


export default function Page() {
  const { user } = useAuth()

  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const load = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetchWithAuth("/api/dashboard?limit=50", { cache: "no-store" })
      const payload = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(payload?.message || `Failed to load dashboard (${res.status})`)
      }

      if (!payload?.stats || !payload?.lists) {
        throw new Error("Dashboard response is invalid")
      }

      setData(payload)
      setError(null)
    } catch (fetchError) {
      if (!silent) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load dashboard")
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

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
    void load()
  }, [load])

  useEffect(() => {
    if (!supabase) return
    const channel = supabase
      .channel("dashboard-activity")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => void load(true),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "onboarding_tokens" },
        () => void load(true),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load, supabase])

  if (loading) return <div><LoadingState title="Loading dashboard..." /></div>
  if (error) return <div><LoadingState title="Dashboard unavailable" description={error} /></div>
  if (!data) return <div><LoadingState title="No Data Found" /></div>

  const stats = [
    {
      title: "Total Projects",
      value: data.stats.total,
      icon: GalleryVerticalEnd,
      color: "text-blue-500",
    },
    {
      title: "Waiting Projects",
      value: data.stats.waiting,
      icon: Timer,
      color: "text-orange-500",
    },
    {
      title: "Completed Projects",
      value: data.stats.completed,
      icon: CalendarCheck,
      color: "text-green-500",
    },
    {
      title: "Overdue Projects",
      value: data.stats.overdue,
      icon: AlarmClockMinus,
      color: "text-destructive",
    },
    {
      title: "Pending Projects",
      value: data.stats.overdue,
      icon: ClipboardClock,
      color: "text-orange-500",
    },
  ]

  return (

   <div className="flex flex-col gap-2 pb-4 md:pb-6">
      <SectionCards stats={stats} />

      <div className="grid xl:grid-cols-3 gap-5 mx-5">
        <div className="col-span-2 rounded-xl w-full">
          <MonthlyProjectsChart />
        </div>

        <div className="rounded-xl w-full h-full space-y-5">
          <CompletedProjectsChart
            completed={data.stats.completed}
            total={data.stats.total}
          />
        </div>
      </div>

      <div className="grid xl:grid-cols-3 gap-5 mx-5 mt-5">
        <RecentActivity
          activities={(data.activities || []).filter((activity) => !hiddenIds.includes(activity.id))}
          loading={loading}
        />
        <AttentionTable projects={data.lists.latestWaitingOverdue} />
      </div>

    </div>
  )
}
