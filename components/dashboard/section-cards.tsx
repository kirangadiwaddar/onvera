

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"

import type { LucideIcon } from "lucide-react"

type StatItem = {
  title: string
  value: number
  icon: LucideIcon
  color?: string
}

type Props = {
  stats: StatItem[]
}

export function SectionCards({ stats }: Props) {
  return (
    <div className="*:data-[slot=card]:p-5 *:data-[slot=card]:border-none *:data-[slot=card]:shadow-xs *:data-[slot=card]:rounded-2xl *:data-[slot=card]:bg-white/90 *:data-[slot=card]:backdrop-blur-2xl dark:*:data-[slot=card]:bg-white/5 dark:*:data-[slot=card]:border dark:*:data-[slot=card]:border-white/10 grid grid-cols-1 gap-5 bg-linear-to-b from-violet-50 to-transparent p-5 lg:px-4 dark:from-violet-500/10 @xl/main:grid-cols-5 @5xl/main:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon

        return (
          <Card key={stat.title}>
            <div className="absolute top-3 right-5 flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white dark:border-white/10 dark:bg-white/5">
                  <Icon
                    className={`size-5 ${stat.color ?? "text-primary"}`}
                    strokeWidth={2}
                  />
                </div>
            <CardHeader className="p-0 gap-0">
              <CardDescription className="relative">                
                <div>                  
                  <p className="text-4xl text-primary font-medium tabular-nums @[250px]/card:text-3xl">
                    {(stat.value ?? 0).toString().padStart(2, "0")}
                  </p>
                </div>                
              </CardDescription>
              <span className="text-xs text-muted-foreground mt-2">
                    {stat.title}
                  </span>
            </CardHeader>
          </Card>
        )
      })}
    </div>
  )
}
