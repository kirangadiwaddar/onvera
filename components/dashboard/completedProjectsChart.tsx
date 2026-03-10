"use client"

import { TrendingUp } from "lucide-react"
import {
  Label,
  PolarGrid,
  PolarRadiusAxis,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart"

type Props = {
  completed: number
  total: number
}

export function CompletedProjectsChart({ completed, total }: Props) {
  const percentage =
    total === 0 ? 0 : Math.round((completed / total) * 100)

  const chartData = [
    {
      name: "completed",
      projects: percentage,
      fill: "#8b5cf6", // green
    },
  ]

  const chartConfig = {
    projects: {
      label: "Projects",
    },
  } satisfies ChartConfig

  return (
    
    <Card className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card/80 pt-0 shadow-none dark:bg-card/60">
      <CardHeader className="items-center justify-center bg-violet-50 py-4 text-center dark:bg-violet-500/10">
        <CardTitle className="text-sm!">Completed Projects</CardTitle>
        <CardDescription className="text-xs">{completed} of {total} Total Finished</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-44 mt-3"
        >
          <RadialBarChart
            data={chartData}
            startAngle={90}
            endAngle={-270}
            innerRadius={80}
            outerRadius={110}
          >
            <PolarAngleAxis
              type="number"
              domain={[0, 100]}
              tick={false}
            />

            <PolarGrid
              gridType="circle"
              radialLines={false}
              stroke="none"
              className="first:fill-muted last:fill-background"
              polarRadius={[86, 74]}
            />

            <RadialBar
              dataKey="projects"
              background
              cornerRadius={10}
            />

            <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-4xl font-bold"
                        >
                          {percentage}%
                        </tspan>

                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Completed
                        </tspan>
                      </text>
                    )
                  }
                  return null
                }}
              />
            </PolarRadiusAxis>
          </RadialBarChart>
        </ChartContainer>
        <div className="flex items-center justify-center gap-2 leading-none font-medium mt-10 text-sm">
          {percentage}% completion rate <TrendingUp className="size-4" />
        </div>
      </CardContent>
    </Card>
  )
}
