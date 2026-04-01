"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronsUpDown, CircleUserRound, LogOut, CheckCheck, Trash2, CreditCard } from "lucide-react"
import { USER_ROLE_LABELS, isUserRole } from "@/lib/auth/roles"
import { AccountSettingsModal } from "@/components/account/account-settings-modal"
import { RecentActivity } from "@/components/dashboard/recentActivity"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
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

export function NavUser({
  user,
  role,
  managedByLabel,
  managedByPrefix = "Managed by",
  hideManagedBy = false,
  onLogout,
}: {
  user: {
    id?: string
    name: string
    email: string
    avatar?: string
  }
  role?: string | null
  managedByLabel?: string | null
  managedByPrefix?: string
  hideManagedBy?: boolean
  onLogout?: () => Promise<void> | void
}) {
  const { isMobile } = useSidebar()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)
  const roleLabel = role === "super_admin" ? "Super Admin" : role && isUserRole(role) ? USER_ROLE_LABELS[role] : "User"
  const managedBy = managedByLabel || roleLabel

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
      setActivities(Array.isArray(payload?.activities) ? payload.activities : [])
    } catch {
      setActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  useEffect(() => {
    if (!showNotifications) return
    void loadActivities()
  }, [showNotifications])

  useEffect(() => {
    if (!showNotifications || !supabase) return
    const userId = user.id
    if (!userId) return
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => void loadActivities(),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [showNotifications, supabase, user.id])

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
    {!hideManagedBy ? (
      <div className="text-center group-data-[collapsible=icon]:hidden">
        <div className="inline-block rounded-sm bg-violet-100 px-2 py-1 text-xs capitalize text-primary dark:bg-violet-500/15">
          {managedByPrefix} -{" "}
          <span className="text-violet-900 font-semibold capitalize dark:text-violet-200">
            {managedBy}
          </span>
        </div>
      </div>
    ) : null}
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="pl-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground bg-white rounded-2xl border border-violet-100 dark:border-white/10 dark:bg-white/5"
              >
                
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className={`rounded-full font-bold ${getAvatarColor(user.name)}`}>
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
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
              className="w-(--radix-dropdown-menu-trigger-width) min-w-54 rounded-xl p-0"
              // side={isMobile ? "bottom" : "right"}
              align="end"
              // sideOffset={}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 p-3 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-full">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className={`rounded-full font-bold ${getAvatarColor(user.name)}`}>
                      {user.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
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
                    setShowAccountDialog(true)
                    setMenuOpen(false)
                  }}
                >
                  <CircleUserRound />
                  Account
                </DropdownMenuItem>
                {role === "super_admin" ? (
                  <DropdownMenuItem
                    asChild
                    onSelect={() => {
                      setMenuOpen(false)
                    }}
                  >
                    <Link href="/billing">
                      <CreditCard />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                ) : null}
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
          <SheetHeader className="border-b border-zinc-100 pr-12">
            <div className="flex items-center justify-between">
              <SheetTitle>Notifications</SheetTitle>
              <TooltipProvider delayDuration={150}>
                <div className="flex items-center gap-2 pr-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handleMarkAllSeen}>
                        <CheckCheck className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Mark all seen</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="destructiveLight" size="icon" onClick={handleClearAll}>
                        <Trash2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Clear all</TooltipContent>
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
