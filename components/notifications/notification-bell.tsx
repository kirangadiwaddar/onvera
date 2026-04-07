"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Bell, CheckCheck, Trash2, X } from "lucide-react"

import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { useAuth } from "@/components/providers/auth-provider"
import { RecentActivity } from "@/components/dashboard/recentActivity"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useNotificationsPreviewQuery, type NotificationPreviewItem } from "@/lib/query/use-notifications-preview-query"
import { prefetchNotificationsPreview } from "@/lib/query/notifications-query"
import { useWorkspaceId } from "@/lib/query/use-workspace-id"

export function NotificationBell() {
  const { user, loading: authLoading } = useAuth()
  const queryClient = useQueryClient()
  const workspaceId = useWorkspaceId()
  const [open, setOpen] = useState(false)
  const notificationsQuery = useNotificationsPreviewQuery({
    userId: user?.id,
    enabled: !authLoading && Boolean(user?.id),
    limit: 10,
  })
  const activities = notificationsQuery.data?.activities || []
  const unreadCount = notificationsQuery.data?.unreadCount || 0
  const refetchNotifications = notificationsQuery.refetch

  useEffect(() => {
    if (!open || !user?.id) return
    const isPreviewStale =
      !notificationsQuery.data || Date.now() - notificationsQuery.dataUpdatedAt > 30_000
    if (!isPreviewStale) return
    void refetchNotifications()
  }, [notificationsQuery.data, notificationsQuery.dataUpdatedAt, open, refetchNotifications, user?.id])

  const warmNotifications = () => {
    void prefetchNotificationsPreview(queryClient, {
      userId: user?.id,
      workspaceId,
      limit: 10,
    })
  }

  const handleMarkAllSeen = async () => {
    await fetchWithAuth("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    }).catch(() => null)
    await queryClient.invalidateQueries({ queryKey: ["notifications-preview", user?.id ?? "anonymous"] })
  }

  const handleClearAll = async () => {
    await fetchWithAuth("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_all" }),
    }).catch(() => null)
    await queryClient.invalidateQueries({ queryKey: ["notifications-preview", user?.id ?? "anonymous"] })
  }

  const handleNotificationClick = async (activity: NotificationPreviewItem) => {
    if (!activity.id || activity.is_read) return

    queryClient.setQueriesData(
      { queryKey: ["notifications-preview", user?.id ?? "anonymous"] },
      (current: { activities?: NotificationPreviewItem[]; unreadCount?: number } | undefined) => {
        if (!current) return current
        const activities = (current.activities || []).map((item) =>
          item.id === activity.id ? { ...item, is_read: true } : item,
        )
        const unreadCount = Math.max(
          0,
          typeof current.unreadCount === "number" ? current.unreadCount - 1 : 0,
        )
        return { ...current, activities, unreadCount }
      },
    )

    const res = await fetchWithAuth("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read", id: activity.id }),
    }).catch(() => null)

    if (!res?.ok) {
      await queryClient.invalidateQueries({ queryKey: ["notifications-preview", user?.id ?? "anonymous"] })
    }
  }

  return (
    <>
      <button
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
        onClick={() => setOpen(true)}
        onMouseEnter={warmNotifications}
        onFocus={warmNotifications}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-4 rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-[90%] md:w-auto rounded-2xl rounded-r-none border borer-r-0 border-zinc-200 bg-white p-0 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
          showCloseButton={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetHeader className="border-b border-zinc-100 px-5 py-4 dark:border-white/10">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1">
                <SheetTitle>Notifications</SheetTitle>
                <p className="text-xs text-muted-foreground">Your project & team updates</p>
              </div>
              <TooltipProvider delayDuration={300}>
                <div className="flex items-center gap-2 pr-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full focus-visible:ring-0 focus-visible:ring-offset-0"
                        onClick={handleMarkAllSeen}
                        aria-label="Mark all seen"
                      >
                        <CheckCheck className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Mark all seen</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 focus-visible:ring-0 focus-visible:ring-offset-0"
                        onClick={handleClearAll}
                        aria-label="Clear all"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Clear all</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 rounded-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 focus-visible:ring-0 focus-visible:ring-offset-0"
                          aria-label="Close"
                        >
                          <X className="size-4" />
                        </Button>
                      </SheetClose>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Close</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </div>
          </SheetHeader>
          <div className="themed-scrollbar h-[calc(100dvh-96px)] overflow-y-auto px-2">
            <RecentActivity
              activities={activities}
              loading={notificationsQuery.isLoading || (notificationsQuery.isFetching && activities.length === 0)}
              variant="list"
              onActivityClick={handleNotificationClick}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
