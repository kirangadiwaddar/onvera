"use client"

import { useEffect, useState } from "react"
import { BadgeCheck, BadgeX, Bell } from "lucide-react"
import { ScrollArea } from "../ui/scroll-area"

type Activity = {
  id: number
  title: string
  status: "success" | "error"
  created_at: string
  project?: {
    id: number
    title: string
    slug: string
  }
}

export function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = async () => {
    try {
      const res = await fetch("/api/activities", {
        cache: "no-store",
      })

      if (!res.ok) return

      const data = await res.json()

      if (Array.isArray(data)) {
        setActivities(data)
      }
    } catch (err) {
      console.error("Activity fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {

    fetchActivities()

    /* Auto refresh every 30s */

    const interval = setInterval(fetchActivities, 30000)

    return () => clearInterval(interval)

  }, [])

  const formatTime = (date: string) => {

    const diff = Date.now() - new Date(date).getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes} mins ago`
    if (hours < 24) return `${hours} hrs ago`

    return `${days} days ago`
  }

  return (
    <div className="recent-activity border border-zinc-200 rounded-xl overflow-hidden h-full">

      <div className="flex items-center justify-between p-5 py-4 bg-violet-50">

        <p className="text-sm font-medium">Recent Activity</p>

        <div className="w-8 h-8 border border-zinc-200 bg-white rounded-full flex items-center justify-center">
          <Bell size={16} className="text-orange-600" />
        </div>

      </div>

      <ScrollArea className="flex-1 max-h-105 px-3 divide-y divide-zinc-100">

        {loading ? (

          <div className="py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>

        ) : activities.length === 0 ? (

          <div className="py-6 text-center text-sm text-muted-foreground">
            No activity yet
          </div>

        ) : (

          activities.map((activity) => (

            <div
              key={activity.id}
              className="flex items-start justify-between py-3"
            >

              <div className="space-y-1">

                <p className="text-sm flex items-center gap-1">

                  {activity.title}

                  {activity.status === "success" ? (

                    <BadgeCheck
                      size={18}
                      fill="#00c951"
                      stroke="#fff"
                    />

                  ) : (

                    <BadgeX
                      size={18}
                      fill="#fb2c36"
                      stroke="#fff"
                    />

                  )}

                </p>

                <p className="text-xs text-muted-foreground truncate">
                  {activity.project?.title || "Unknown Project"}
                </p>

              </div>

              <span className="text-xs mt-1 text-muted-foreground">
                {formatTime(activity.created_at)}
              </span>

            </div>

          ))

        )}

      </ScrollArea>

    </div>
  )
}