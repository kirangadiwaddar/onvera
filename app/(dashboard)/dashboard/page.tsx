"use client"

import { useState, useEffect } from "react"

import AttentionTable from "@/components/dashboard/attentionTable"
import { CompletedProjectsChart } from "@/components/dashboard/completedProjectsChart"
import { SectionCards } from "@/components/dashboard/section-cards"
import { ProjectCard, ProjectCardProps } from "@/components/project-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { AlarmClockMinus, ArrowUp, CalendarCheck, CircleDot, ClipboardClock, GalleryVerticalEnd, Timer } from "lucide-react"
import Link from "next/link"
import { LoadingState } from "@/components/loadingState"
import { RecentActivity } from "@/components/dashboard/recentActivity"

import { Project } from "@/types/project"

import { getTemplateMap } from "@/lib/templateUtils";
import { MonthlyProjectsChart } from "@/components/dashboard/monthlyProjects"



export default function Page() {

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/dashboard")
      .then(res => res.json())
      .then(res => {
        setData(res)
        setLoading(false)
      })
  }, [])

  if (loading || !data) return <div><LoadingState title="No Data Found" /></div>

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
      title: "Pending Projects",
      value: data.stats.overdue,
      icon: ClipboardClock,
      color: "text-violet-500",
    },
  ]

  //  const projectCards = data?.lists?.latestOngoing?.slice(0, 6) ?? []
  const projectCards: Project[] = data.lists.latestOngoing

  const templateMap = getTemplateMap();

  return (

    <div className="flex flex-col gap-2 pb-4 md:pb-6"> 
      <SectionCards stats={stats} />
      {/* <Separator className="my-0 bg-gray-100" /> */}
      <div className="grid xl:grid-cols-3 gap-5 mx-5">
        <div className="col-span-2 rounded-xl w-full">
          {/* <AttentionTable projects={data.lists.latestWaitingOverdue} /> */}
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
