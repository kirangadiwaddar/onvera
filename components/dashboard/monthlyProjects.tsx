"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { LoadingState } from "@/components/loadingState"

type Project = {
  id: number
  createdAt?: string
  created_at?: string
  updatedAt?: string | null
  updated_at?: string | null
  status: string
}

type MonthlyData = {
  label: string
  month: number
  year: number
  created: number
  completed: number
  overdue: number
}

const chartConfig = {
  created: { label: "Created", color: "var(--chart-1)" },
  completed: { label: "Completed", color: "var(--chart-2)" },
  overdue: { label: "Overdue", color: "var(--chart-3)" },
} satisfies ChartConfig

export function MonthlyProjectsChart() {
  const [range, setRange] = React.useState("12m")
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetchWithAuth("/api/projects?summary=1", {
          cache: "no-store",
        })

        if (!res.ok) return

        const data = await res.json()
        const projectList = Array.isArray(data?.projects) ? data.projects : []
        setProjects(projectList)
      } catch (err) {
        console.error("Chart fetch failed:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const fullData = React.useMemo<MonthlyData[]>(() => {
    const now = new Date()
    const months: MonthlyData[] = []

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)

      months.push({
        label: date.toLocaleString("default", { month: "short" }),
        month: date.getMonth(),
        year: date.getFullYear(),
        created: 0,
        completed: 0,
        overdue: 0,
      })
    }

    projects.forEach((project) => {
      const createdSource = project.createdAt ?? project.created_at
      if (!createdSource) return

      const createdDate = new Date(createdSource)
      const createdIndex = months.findIndex(
        (m) =>
          m.month === createdDate.getMonth() &&
          m.year === createdDate.getFullYear()
      )

      if (createdIndex !== -1) {
        months[createdIndex].created++
      }

      const updatedSource = project.updatedAt ?? project.updated_at

      if (project.status === "completed" && updatedSource) {
        const completedDate = new Date(updatedSource)
        const completedIndex = months.findIndex(
          (m) =>
            m.month === completedDate.getMonth() &&
            m.year === completedDate.getFullYear()
        )

        if (completedIndex !== -1) {
          months[completedIndex].completed++
        }
      }

      if (project.status === "overdue") {
        const overdueDate = new Date(updatedSource ?? createdSource)
        const overdueIndex = months.findIndex(
          (m) =>
            m.month === overdueDate.getMonth() &&
            m.year === overdueDate.getFullYear()
        )

        if (overdueIndex !== -1) {
          months[overdueIndex].overdue++
        }
      }
    })

    return months
  }, [projects])

  const filteredData = React.useMemo(() => {
    if (range === "3m") return fullData.slice(-3)
    if (range === "6m") return fullData.slice(-6)
    return fullData
  }, [range, fullData])

  const rangeLabelMap: Record<string, string> = {
    "3m": "last 3 months",
    "6m": "last 6 months",
    "12m": "last 12 months",
  }

  if (loading) {
    return (
      <div className="p-6">
        <LoadingState title="Loading chart..." />
      </div>
    )
  }

  return (
    <Card className="relative gap-0 overflow-hidden py-0 shadow-none">
      <CardHeader className="mb-0 flex flex-col gap-3 border-b border-border bg-card/80 py-4! sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Monthly Project Overview</CardTitle>
          <CardDescription className="text-xs">
            Showing total projects for the {rangeLabelMap[range]}
          </CardDescription>
        </div>

        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full rounded-full text-xs sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="12m">Last 12 months</SelectItem>
            <SelectItem value="6m">Last 6 months</SelectItem>
            <SelectItem value="3m">Last 3 months</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>

     <CardContent className="relative overflow-visible px-0 pt-1">
  <div className="chart-grid absolute inset-0 z-0 opacity-40 pointer-events-none" />

  <ChartContainer
    config={chartConfig}
    className="h-[240px] w-full overflow-visible sm:h-[280px]"
  >
    <AreaChart
      data={filteredData}
      margin={{ top: 24, right: 20, left: 12, bottom: 32 }}
    >
      <defs>
        <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.08} />
        </linearGradient>

        <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
        </linearGradient>

        <linearGradient id="fillOverdue" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.08} />
        </linearGradient>
      </defs>

      <CartesianGrid vertical={false} strokeOpacity={0.06} />

      <XAxis
        dataKey="label"
        tickLine={false}
        axisLine={false}
        tickMargin={14}
        interval={0}
        minTickGap={12}
        padding={{ left: 20, right: 20 }}
      />

      <YAxis
        hide
        domain={[0, "dataMax + 2"]}
      />

      <ChartTooltip
        cursor={false}
        content={<ChartTooltipContent indicator="dot" />}
      />

      <Area
        type="bumpX"
        dataKey="overdue"
        stroke="#ef4444"
        strokeWidth={2.5}
        fill="url(#fillOverdue)"
        fillOpacity={1}
      />

      <Area
        type="bumpX"
        dataKey="completed"
        stroke="#22c55e"
        strokeWidth={2.5}
        fill="url(#fillCompleted)"
        fillOpacity={1}
      />

      <Area
        type="bumpX"
        dataKey="created"
        stroke="#8b5cf6"
        strokeWidth={2.5}
        fill="url(#fillCreated)"
        fillOpacity={1}
      />

      <ChartLegend content={<ChartLegendContent />} />
    </AreaChart>
  </ChartContainer>
</CardContent>
    </Card>
  )
}
