import { BadgeCheck, BadgeX, Bell } from "lucide-react"

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
}: {
  activities?: Activity[]
  loading?: boolean
}) {
  return (
    <div className="recent-activity rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-violet-50 dark:bg-violet-500/10">
        <p className="text-sm font-medium">Recent Activity</p>
        <div className="notify flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white dark:border-white/10 dark:bg-white/5">
          <Bell size={16} className="text-orange-600 dark:text-orange-400" />
        </div>
      </div>

      <div className="activity-list max-h-120 overflow-y-auto divide-y divide-zinc-100 px-3 dark:divide-white/10">
        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No activity yet</div>
        ) : (
          activities.map((activity) => {
            const isSuccess =
              activity.status === "success" ||
              activity.status === "completed" ||
              activity.status === "ongoing" ||
              activity.status === "approved" ||
              activity.status === "generated" ||
              activity.status === "created"
            return (
              <div key={activity.id} className="activity-item flex items-start justify-between py-4">
                <div className="space-y-1 max-w-[80%]">
                  <p className="text-sm flex items-center gap-1">
                    {activity.title}
                    {isSuccess ? (
                      <BadgeCheck size={18} fill="#00c951" stroke="#fff" />
                    ) : (
                      <BadgeX size={18} fill="#fb2c36" stroke="#fff" />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {getProjectTitle(activity.project)}
                    {activity.actor ? ` • ${activity.actor}` : ""}
                  </p>
                </div>
                <span className="text-xs mt-1 text-muted-foreground">
                  {formatTime(activity.created_at || activity.timestamp)}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
