"use client"

import { useState, useEffect } from "react"

import AttentionTable from "@/components/dashboard/attentionTable"
import { CompletedProjectsChart } from "@/components/dashboard/completedProjectsChart"
import { SectionCards } from "@/components/dashboard/section-cards"
import { LoadingState } from "@/components/loadingState"
import { RecentActivity } from "@/components/dashboard/recentActivity"
import { MonthlyProjectsChart } from "@/components/dashboard/monthlyProjects"

import { AlarmClockMinus, CalendarCheck, GalleryVerticalEnd, Pause, Timer } from "lucide-react"

import { User } from "@supabase/supabase-js"

type Props = {
  user: User,
}

export default function DashboardUI({ user }: Props) {

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [templatesList, setTemplatesList] = useState<any[]>([])

  useEffect(() => {
    console.log("User:", user)
  }, [user])

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(res => {
        setData(res)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const fetchTemplates = async () => {
      const res = await fetch("/api/templates", { cache: "no-store" })
      const data = await res.json()
      setTemplatesList(Array.isArray(data) ? data : [])
    }

    fetchTemplates()
  }, [])

  const templateMap = templatesList.reduce(
    (acc: Record<string, string>, t) => {
      acc[t.id] = t.title
      return acc
    },
    {}
  )

  if (loading || !data) {
    return (
      <div>
        <LoadingState title="No Data Found" />
      </div>
    )
  }

  const stats = [
    {
      title: "Total Projects",
      value: data.stats.total,
      icon: GalleryVerticalEnd,
      color: "text-sky-500",
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
      title: "Onhold Projects",
      value: data.stats.onhold,
      icon: Pause,
      color: "text-rose-500",
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
        <RecentActivity />
        <AttentionTable projects={data.lists.latestWaitingOverdue} />
      </div>

    </div>
  )
}