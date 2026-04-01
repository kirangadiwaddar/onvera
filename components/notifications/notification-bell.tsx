"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCheck, Trash2, X } from "lucide-react"

import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
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

type Activity = {
  id: string
  title: string
  project?: string | { title?: string }
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  created_at?: string
  is_read?: boolean
}

export function NotificationBell() {
  const { user, loading: authLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const realtimeChannel = user?.id ? `notifications-${user.id}` : "notifications-anonymous"

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  const loadActivities = async () => {
    setLoadingActivities(true)
    try {
      const res = await fetchWithAuth("/api/notifications?limit=50", { cache: "no-store" })
      const payload = await res.json().catch(() => null) as { activities?: Activity[] } | null
      setActivities(Array.isArray(payload?.activities) ? payload!.activities! : [])
    } catch {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  useEffect(() => {
    if (authLoading) return
    if (!user?.id) return
    void loadActivities()
  }, [authLoading, user?.id])

  useEffect(() => {
    if (!open) return
    if (authLoading) return
    if (!user?.id) return
    void loadActivities()
  }, [open, authLoading, user?.id])

  useEffect(() => {
    if (authLoading || !user?.id || !supabase) return
    const userId = user.id
    const channel = supabase
      .channel(realtimeChannel)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void loadActivities(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [authLoading, realtimeChannel, supabase, user?.id])

  const unreadCount = activities.reduce((count, activity) => (activity.is_read ? count : count + 1), 0)

  const handleMarkAllSeen = async () => {
    await fetchWithAuth("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_all_read" }),
    }).catch(() => null)
    void loadActivities()
  }

  const handleClearAll = async () => {
    await fetchWithAuth("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss_all" }),
    }).catch(() => null)
    void loadActivities()
  }

  return (
    <>
      <button
        className="relative flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white"
        onClick={() => setOpen(true)}
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
          className="w-90 max-w-full m-2 h-[calc(100dvh-24px)] rounded-xl overflow-hidden shadow-none border border-zinc-200 dark:border-zinc-800"
          showCloseButton={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetHeader className="border-b border-zinc-100 dark:border-white/10">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
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
          <div className="px-4 h-[calc(100dvh-100px)] overflow-y-auto">
            <RecentActivity
              activities={activities}
              loading={loadingActivities}
              variant="list"
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
