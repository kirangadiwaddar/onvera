"use client"

import { useEffect, useMemo, useState } from "react"
import { Bell, ChevronsUpDown, CircleUserRound, LogOut } from "lucide-react"
import { USER_ROLE_LABELS, isUserRole } from "@/lib/auth/roles"
import { AccountSettingsModal } from "@/components/account/account-settings-modal"
import { RecentActivity } from "@/components/dashboard/recentActivity"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

type Activity = {
  id: string
  title: string
  project?: string | { title?: string }
  status: string
  actor?: "Admin" | "Client" | "Team Lead"
  timestamp?: string
  created_at?: string
}

export function NavUser({
  user,
  role,
  managedByLabel,
  onLogout,
}: {
  user: {
    name: string
    email: string
    avatar?: string
  }
  role?: string | null
  managedByLabel?: string | null
  onLogout?: () => Promise<void> | void
}) {
  const { isMobile } = useSidebar()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const [seenAt, setSeenAt] = useState<string | null>(null)
  const [hiddenIds, setHiddenIds] = useState<string[]>([])
  const roleLabel = role === "admin" ? "Admin" : role && isUserRole(role) ? USER_ROLE_LABELS[role] : "User"
  const managedBy = managedByLabel || roleLabel
  const storageBase = user.email ? `notifications:${user.email}` : "notifications:anonymous"
  const hiddenKey = `${storageBase}:hidden`
  const seenKey = `${storageBase}:seen_at`

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
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
  }, [hiddenKey, seenKey])

  useEffect(() => {
    if (!showNotifications) return
    let ignore = false

    const loadActivities = async () => {
      setLoadingActivities(true)
      try {
        const res = await fetchWithAuth("/api/dashboard?limit=50", { cache: "no-store" })
        const payload = await res.json().catch(() => null) as { activities?: Activity[] } | null
        if (!ignore) {
          setActivities(Array.isArray(payload?.activities) ? payload!.activities! : [])
        }
      } catch {
        if (!ignore) {
          setActivities([])
        }
      } finally {
        if (!ignore) {
          setLoadingActivities(false)
        }
      }
    }

    void loadActivities()

    return () => {
      ignore = true
    }
  }, [showNotifications])

  useEffect(() => {
    if (!showNotifications || !supabase) return
    const channel = supabase
      .channel(`notifications-${storageBase}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => {
          void (async () => {
            const res = await fetchWithAuth("/api/dashboard?limit=50", { cache: "no-store" })
            const payload = await res.json().catch(() => null) as { activities?: Activity[] } | null
            setActivities(Array.isArray(payload?.activities) ? payload!.activities! : [])
          })()
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "onboarding_tokens" },
        () => {
          void (async () => {
            const res = await fetchWithAuth("/api/dashboard?limit=50", { cache: "no-store" })
            const payload = await res.json().catch(() => null) as { activities?: Activity[] } | null
            setActivities(Array.isArray(payload?.activities) ? payload!.activities! : [])
          })()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showNotifications, storageBase, supabase])

  const visibleActivities = activities.filter((activity) => !hiddenIds.includes(activity.id))

  const handleMarkAllSeen = () => {
    const now = new Date().toISOString()
    setSeenAt(now)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(seenKey, now)
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
    <div className="text-center group-data-[collapsible=icon]:hidden">
      <div className="inline-block rounded-sm bg-violet-100 px-2 py-1 text-xs capitalize text-primary dark:bg-violet-500/15">Managed by - <span className="text-violet-900 font-semibold capitalize dark:text-violet-200">{managedBy}</span></div>
    </div> 
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="pl-1 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-white rounded-full border border-violet-100 dark:border-white/10 dark:bg-white/5"
              >
                <div className="h-10 w-10 rounded-full flex items-center justify-center border border-violet-500">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg font-bold text-black bg-blue-100 dark:bg-blue-500/20 dark:text-blue-100">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {user.email}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl p-0"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={30}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 p-3 text-left text-sm">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center border border-violet-500">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-full font-bold text-black bg-blue-100 dark:bg-blue-500/20 dark:text-blue-100">
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup className="p-1">
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setShowAccountDialog(true)
                  }}
                >
                  <CircleUserRound />
                  Account
                </DropdownMenuItem>
                {/* <DropdownMenuItem asChild>
                  <Link href="/billing">
                    <CreditCard />
                    Billing
                  </Link>
                </DropdownMenuItem> */}
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    setShowNotifications(true)
                  }}
                >
                  <Bell />
                  Notifications
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={(event) => {
                    event.preventDefault()
                    setShowLogoutDialog(true)
                  }}
                >
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                void onLogout?.()
              }}
            >
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AccountSettingsModal open={showAccountDialog} onOpenChange={setShowAccountDialog} />
      <Sheet open={showNotifications} onOpenChange={setShowNotifications}>
        <SheetContent side="right" className="w-90 max-w-full">
          <SheetHeader className="border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleMarkAllSeen}>
                  Mark all seen
                </Button>
                <Button variant="destructiveLight" size="sm" onClick={handleClearAll}>
                  Clear
                </Button>
              </div>
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
