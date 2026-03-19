"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, CheckCheck, Trash2, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { RecentActivity } from "@/components/dashboard/recentActivity"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type Activity = {
  id: string
  title: string
  project?: string | { title?: string }
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  timestamp?: string
  created_at?: string
}

function getActivityTimestamp(activity: Activity) {
  return activity.timestamp ?? activity.created_at ?? null
}

type OnboardingNotificationBellProps = {
  slug?: string | null
  token?: string | null
  className?: string
}

export function OnboardingNotificationBell({ slug, token, className }: OnboardingNotificationBellProps) {
  const [open, setOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [seenAt, setSeenAt] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])

  const storageBase = slug ? `notifications:onboarding:${slug}:${token || "public"}` : "notifications:onboarding:unknown"
  const hiddenKey = `${storageBase}:hidden`
  const seenKey = `${storageBase}:seen_at`

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  const readStorage = () => {
    if (typeof window === "undefined") return
    const storedHidden = window.localStorage.getItem(hiddenKey)
    const storedSeenAt = window.localStorage.getItem(seenKey)
    if (storedHidden) {
      try {
        const parsed = JSON.parse(storedHidden) as string[]
        if (Array.isArray(parsed)) setHiddenIds(parsed)
      } catch {
        setHiddenIds([])
      }
    }
    if (storedSeenAt) setSeenAt(storedSeenAt)
  }

  useEffect(() => {
    readStorage()
  }, [hiddenKey, seenKey])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = () => readStorage()
    window.addEventListener("notifications:updated", handler)
    return () => window.removeEventListener("notifications:updated", handler)
  }, [hiddenKey, seenKey])

  const loadActivities = async () => {
    if (!slug) return
    setLoadingActivities(true)
    try {
      const params = new URLSearchParams({ slug })
      if (token) params.set("token", token)
      const res = await fetch(`/api/onboarding/activity?${params.toString()}`, { cache: "no-store" })
      const payload = (await res.json().catch(() => null)) as { activities?: Activity[] } | null
      setActivities(Array.isArray(payload?.activities) ? payload!.activities! : [])
    } catch {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  useEffect(() => {
    if (!slug) return
    void loadActivities()
  }, [slug, token])

  useEffect(() => {
    if (!slug || !supabase) return
    const channel = supabase
      .channel(`onboarding-notifications-${slug}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `slug=eq.${slug}` },
        () => void loadActivities(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "onboarding_tokens", filter: `project_slug=eq.${slug}` },
        () => void loadActivities(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [slug, supabase])

  const visibleActivities = activities.filter(
    (activity) => !hiddenIds.includes(activity.id) && activity.actor === "Admin",
  )

  const unreadCount = visibleActivities.reduce((count, activity) => {
    const timestamp = getActivityTimestamp(activity)
    if (!timestamp) return count
    if (!seenAt) return count + 1
    return new Date(timestamp).getTime() > new Date(seenAt).getTime() ? count + 1 : count
  }, 0)

  const handleMarkAllSeen = () => {
    const now = new Date().toISOString()
    setSeenAt(now)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(seenKey, now)
      window.dispatchEvent(new Event("notifications:updated"))
    }
  }

  const handleClearAll = () => {
    const nextHidden = Array.from(new Set([...hiddenIds, ...activities.map((activity) => activity.id)]))
    setHiddenIds(nextHidden)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(hiddenKey, JSON.stringify(nextHidden))
      window.dispatchEvent(new Event("notifications:updated"))
    }
  }

  return (
    <>
      <button
        className={`relative flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white/80 text-zinc-500 transition hover:text-zinc-900 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:text-white ${className ?? ""}`}
        onClick={() => setOpen(true)}
        aria-label="Notifications"
        type="button"
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
          className="w-90 max-w-full m-2 h-[calc(100dvh-24px)] rounded-xl overflow-hidden"
          showCloseButton={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <SheetHeader className="border-b border-zinc-100 dark:border-white/10">
            <div className="flex items-center justify-between">
              <SheetTitle>Project Updates</SheetTitle>
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
              activities={visibleActivities}
              loading={loadingActivities}
              variant="list"
              seenAfter={seenAt}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
