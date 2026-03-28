import { BadgeCheck, BadgeX, Bell } from "lucide-react"
import { Badge } from "../ui/badge"

type Activity = {
  id: string
  title: string
  project?: string | { title?: string }
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  timestamp?: string
  created_at?: string
}

function formatTime(value?: string) {
  if (!value) return "just now"
  const diff = Date.now() - new Date(value).getTime()
  const mins = Math.floor(diff / (1000 * 60))
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return `${days} day ago`
}

function getProjectTitle(project?: string | { title?: string }) {
  if (!project) return "Unknown Project"
  if (typeof project === "string") return project
  return project.title || "Unknown Project"
}

export function RecentActivity({
  activities = [],
  loading = false,
  variant = "default",
  seenAfter,
}: {
  activities?: Activity[]
  loading?: boolean
  variant?: "default" | "bare" | "list"
  seenAfter?: string | null
}) {
  const isBare = variant === "bare" || variant === "list"
  const isList = variant === "list"
  const seenAfterTime = seenAfter ? new Date(seenAfter).getTime() : null
  return (
    <div className={isBare ? "recent-activity" : "recent-activity rounded-xl border border-border overflow-hidden"}>
      {isBare ? null : (
        <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-500/10">
          <p className="text-sm font-medium">Recent Activity</p>
          <div className="notify flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200  bg-white dark:border-white/10 dark:bg-white/5">
            <Bell size={16} className="text-orange-600 dark:text-orange-400" />
          </div>
        </div>
      )}

      <div
        className={
          isBare
            ? "activity-list divide-y divide-zinc-100 px-0 dark:divide-white/10"
            : "activity-list max-h-118 overflow-y-auto divide-y divide-zinc-100 px-3 dark:divide-white/10"
        }
      >
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No activity yet</div>
        ) : (
          activities.map((activity) => {
            const isFailure =
              activity.status === "rejected" ||
              activity.status === "failed" ||
              activity.status === "error"
            const timestamp = activity.created_at || activity.timestamp
            const isNew =
              seenAfterTime !== null &&
              timestamp &&
              new Date(timestamp).getTime() > seenAfterTime
            return (
              <div
                key={activity.id}
                className={isList ? "flex items-start justify-between -mx-3 px-3 py-3 gap-6" : "activity-item w-fll flex items-start justify-between py-4 gap-6"}
              >
                
                <div className={isList ? "space-y-1 max-w-[78%]" : "space-y-1 max-w-[78%]"}>
                  <div className={isList ? "text-sm flex items-center gap-2" : "text-sm flex items-center gap-1"}>
                    
                    <p>{activity.title}
                      {isFailure ? (
                        <BadgeX size={18} fill="#fb2c36" stroke="#fff" className="ml-1 inline-block" />
                      ) : (
                        <BadgeCheck size={18} fill="#00c951" stroke="#fff" className="ml-1 inline-block" />
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {getProjectTitle(activity.project)}
                    {activity.actor ? ` • ${activity.actor}` : ""}
                  </p>
                </div>
                <div className="flex flex-col gap-1 justify-end items-end shrink-0">
                  {isNew ? (
                      <Badge className="text-xs! bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        New
                      </Badge>
                    ) : null}
                  <span className="text-xs mt-1 text-muted-foreground shrink-0">
                    {formatTime(activity.created_at || activity.timestamp)}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
