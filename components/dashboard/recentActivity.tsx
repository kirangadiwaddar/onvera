import { BadgeCheck, BadgeX, Bell } from "lucide-react"
import { Badge } from "../ui/badge"
import { Skeleton } from "../ui/skeleton"

type Activity = {
  id: string
  title: string
  project?: string | { title?: string }
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  timestamp?: string
  created_at?: string
  is_read?: boolean
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

function statusTone(isFailure: boolean, isUnread: boolean) {
  if (isFailure) {
    return "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300"
  }
  if (isUnread) {
    return "bg-violet-50 text-violet-600 dark:bg-purple-500/10 dark:text-violet-300"
  }
  return "bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-300"
}

export function RecentActivity({
  activities = [],
  loading = false,
  variant = "default",
  seenAfter,
  onActivityClick,
}: {
  activities?: Activity[]
  loading?: boolean
  variant?: "default" | "bare" | "list"
  seenAfter?: string | null
  onActivityClick?: (activity: Activity) => void
}) {
  const isBare = variant === "bare" || variant === "list"
  const isList = variant === "list"
  const showUnreadStyling = isList
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
          <div className="space-y-3 p-3">
            {Array.from({ length: isList ? 5 : 4 }).map((_, index) => (
              <div key={index} className="flex items-start justify-between gap-4 py-1">
                {isList ? <Skeleton className="mt-1 h-2.5 w-2.5 rounded-full" /> : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {isList ? <Skeleton className="h-5 w-10 rounded-full" /> : null}
                  <Skeleton className="h-3 w-14" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">No activity yet</div>
        ) : (
          activities.map((activity) => {
            const isFailure =
              activity.status === "rejected" ||
              activity.status === "failed" ||
              activity.status === "error"
            const timestamp = activity.created_at || activity.timestamp
            const isUnread =
              showUnreadStyling &&
              (typeof activity.is_read === "boolean"
                ? !activity.is_read
                : Boolean(
                    timestamp &&
                    (seenAfterTime === null || new Date(timestamp).getTime() > seenAfterTime),
                  ))
            return (
              <button
                key={activity.id}
                type="button"
                onClick={() => onActivityClick?.(activity)}
                className={
                  `${isList ? "rounded-2xl px-3 border-none group flex w-full items-start justify-between gap-4 py-3.5 text-left" : "activity-item w-full flex items-start justify-between py-4 gap-6 text-left"} ` +
                  `${isUnread
                    ? "unread-notification bg-violet-50 dark:bg-violet-900/10 hover:bg-violet-100! dark:hover:bg-violet-900/20! mb-2"
                    : "read-notification"} ` +
                  `${onActivityClick ? "cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:bg-zinc-900/70" : "cursor-default"}`
                }
              >
                {isList ? (
                  <div className={isUnread ? "mr-0.5 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-violet-500" : "mr-0.5 mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700"} />
                ) : null}
                <div className={isList ? "min-w-0 flex-1 space-y-1" : "space-y-1 max-w-[78%]"}>
                  <div className={isList ? "flex items-start gap-2 text-sm" : "text-sm flex items-center gap-1"}>
                    <p className={`leading-5 text-xs capitalize ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/90"}`}>{activity.title}</p>
                    <span className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${statusTone(isFailure, isUnread)}`}>
                      {isFailure ? (
                        <BadgeX size={12} />
                      ) : (
                        <BadgeCheck size={12} />
                      )}
                    </span>
                  </div>
                  <p className="truncate text-xs capitalize text-muted-foreground">                    
                    <span className="font-medium text-violet-900 dark:text-violet-300">{activity.actor ? `${activity.actor} • ` : ""}</span>
                    <span className="font-normal text-xs capitalize">{getProjectTitle(activity.project)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 pl-2">
                  {showUnreadStyling && isUnread ? (
                      <Badge className="rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300">
                        New
                      </Badge>
                    ) : null}
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatTime(activity.created_at || activity.timestamp)}
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
