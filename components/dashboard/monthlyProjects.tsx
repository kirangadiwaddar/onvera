"use client"

import * as React from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis } from "recharts"

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

import projects from "@/src/mocks/data/projects.json"

type MonthlyData = {
    label: string
    month: number
    year: number
    created: number
    completed: number
    overdue: number
}

const chartConfig = {
    created: {
        label: "Created",
        color: "var(--chart-1)",
    },
    completed: {
        label: "Completed",
        color: "var(--chart-2)",
    },
    overdue: {
        label: "Overdue",
        color: "var(--chart-3)",
    },
} satisfies ChartConfig

export function MonthlyProjectsChart() {
    const [range, setRange] = React.useState("12m")

    // Build full 12-month dataset
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

        projects.projects.forEach((project) => {
            const createdDate = new Date(project.createdAt)

            const createdIndex = months.findIndex(
                (m) =>
                    m.month === createdDate.getMonth() &&
                    m.year === createdDate.getFullYear()
            )

            if (createdIndex !== -1) {
                months[createdIndex].created++
            }

            if (project.status === "completed" && project.updatedAt) {
                const completedDate = new Date(project.updatedAt)

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
                const overdueDate = new Date(
                    project.updatedAt ?? project.createdAt
                )

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
    }, [])

    // Filter dataset based on dropdown
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

    return (
        <Card className="pt-0 shadow-none relative overflow-hidden gap-0">
            <CardHeader className="flex items-center justify-between border-b py-4! bg-white">
                <div className="">
                    <CardTitle className="text-sm">Monthly Project Overview</CardTitle>
                    <CardDescription className="text-xs">
                        Showing total projects for the {rangeLabelMap[range]}
                    </CardDescription>
                </div>


                <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-40 rounded-full text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="12m">Last 12 months</SelectItem>
                        <SelectItem value="6m">Last 6 months</SelectItem>
                        <SelectItem value="3m">Last 3 months</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>

            <CardContent className="px-0 pt-6 relative">
                <div
                    className="absolute top-0 left-0 bottom-0 right-0 inset-0 z-0 opacity-40"
                    style={{
                        background: "white",
                        backgroundImage: `
                linear-gradient(to right, rgba(71,85,105,0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(71,85,105,0.15) 1px, transparent 1px),
                radial-gradient(circle at 50% 60%, rgba(236,72,153,0.15) 0%, rgba(168,85,247,0.05) 40%, transparent 70%)`,
                        backgroundSize: "40px 40px, 40px 40px, 100% 100%",
                    }}
                />
                <ChartContainer config={chartConfig} className="h-60 w-full">
                    <AreaChart data={filteredData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            {/* Created - Violet */}
                            <linearGradient id="fillCreated" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.08} />
                            </linearGradient>

                            {/* Completed - Green */}
                            <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0.08} />
                            </linearGradient>
                            {/* Overdue - Red */}
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
                            tickMargin={8}
                            interval={0}
                            padding={{ left: 20, right: 20, }}
                        />

                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="dot" />}
                        />

                        {/* Overdue first (bottom layer) */}
                        <Area
                            type="natural"
                            dataKey="overdue"
                            stroke="#ef4444"
                            strokeWidth={2.5}
                            fill="url(#fillOverdue)"
                            stackId="1"
                        />

                        {/* Completed first (second bottom layer) */}
                        <Area
                            type="natural"
                            dataKey="completed"
                            stroke="#22c55e"
                            strokeWidth={2.5}
                            fill="url(#fillCompleted)"
                            stackId="1"
                        />

                        {/* Created on top */}
                        <Area
                            type="natural"
                            dataKey="created"
                            stroke="#8b5cf6"
                            strokeWidth={2.5}
                            fill="url(#fillCreated)"
                            stackId="1"
                        />

                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}