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

  //  const projectCards = data?.lists?.latestOngoing?.slice(0, 6) ?? []
  const projectCards: Project[] = data.lists.latestOngoing

  const templateMap = getTemplateMap();

  return (

    <div className="flex flex-col gap-2 pb-4 md:pb-6">
      <SectionCards stats={stats} />
      {/* <Separator className="my-0 bg-gray-100" /> */}
      <div className="grid xl:grid-cols-3 gap-5 mx-5">
        <div className="col-span-2 rounded-xl w-full">
          <AttentionTable projects={data.lists.latestWaitingOverdue} />
        </div>
        <div className="rounded-xl w-full space-y-5">
          <CompletedProjectsChart
            completed={data.stats.completed}
            total={data.stats.total}
          />
          <RecentActivity />
        </div>
      </div>
      <Separator className="my-5 bg-gray-100" />
      <div className="trending-projects">
        <div className="dash-title  flex items-center justify-between px-7">
          <div>
            <h1 className="text-xl font-medium">Ongoing Projects ({projectCards.length})</h1>
            <p className="text-sm text-muted-foreground">Projects that require ongoing attention.</p>
          </div>          
          <Link href="/projects"><Button variant="gradient" size="sm" className="text-xs">View All Projects <ArrowUp /></Button></Link>
        </div>
        <div className="grid lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 mx-5 my-5">
          {projectCards.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              slug={project.slug}
              title={project.title}
              templateTitle={templateMap[project.templateId]}
              // status={project.status}
              createdAt={project.createdAt}
              avatarSrc={project.avatarSrc}
              // teams={project.teams}
              members={project.members}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
