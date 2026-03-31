"use client"

import * as React from "react"

import { FolderOpenDot, LayoutPanelTop, CirclePile, LayoutGrid, Sparkles, RefreshCw } from "lucide-react"

// import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/sidebar/nav-main"
import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Logo from "./ui/logo"
import { useAuth } from "./providers/auth-provider"
import { NavProjects } from "./sidebar/nav-projects"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { Team } from "@/types/team"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
import { canUseTeams, normalizePlan, PLAN_LABELS } from "@/lib/billing/plans"
import { USER_ROLE_LABELS, isUserRole } from "@/lib/auth/roles"
import Link from "next/link"
import { Button } from "./ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}


const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutGrid,
    },
    {
      title: "Projects",
      url: "/projects",
      icon: FolderOpenDot,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: LayoutPanelTop,
    },
    {
      title: "Team",
      url: "/teams",
      icon: CirclePile,
    },
    {
      title: "Plan Manager",
      url: "/admin/plan-manager",
      icon: Sparkles,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [serverIdentity, setServerIdentity] = useState<{
    user: { email: string | null; fullName: string | null } | null
    profile: {
      fullName: string | null
      role?: string | null
      workspaceRole?: string | null
      plan?: string | null
    } | null
  } | null>(null)
  const [teamMembership, setTeamMembership] = useState<"none" | "member" | "lead">("none")
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const [creatingWorkspace, setCreatingWorkspace] = useState(false)
  const [openCreateWorkspace, setOpenCreateWorkspace] = useState(false)
  const [workspaceSwitching, setWorkspaceSwitching] = useState(true)
  const [showRefreshPrompt, setShowRefreshPrompt] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    if (typeof window === "undefined") return
    const target = window.localStorage.getItem("onvera:post-refresh")
    if (target) {
      window.localStorage.removeItem("onvera:post-refresh")
      router.replace(target)
    }
  }, [mounted, router])

  useEffect(() => {
    if (authLoading || !user?.id) return
    const loadServerIdentity = async () => {
      try {
        const response = await fetchWithAuth("/api/auth/me", {
          cache: "no-store",
        })
        if (!response.ok) return
        const data = await response.json()
        setServerIdentity(data)
      } catch {
        setServerIdentity(null)
      }
    }

    void loadServerIdentity()
  }, [authLoading, user?.id])

  useEffect(() => {
    if (authLoading || !user?.id) return
    const metadataRole =
      typeof user?.user_metadata?.role === "string"
        ? user.user_metadata.role
        : null
    const currentRole = profile?.role || serverIdentity?.profile?.role || metadataRole || null
    const currentEmail = (user?.email || serverIdentity?.user?.email || "").trim().toLowerCase()

    const detectTeamMembership = async () => {
      if (!currentEmail || (currentRole !== "team_member" && currentRole !== "project_member")) {
        setTeamMembership("none")
        return
      }
      try {
        const response = await fetchWithAuth("/api/teams", {
          cache: "no-store",
        })
        if (!response.ok) {
          setTeamMembership("none")
          return
        }
        const data = await response.json() as { teams?: Team[] }
        const teams = Array.isArray(data.teams) ? data.teams : []
        const leadFound = teams.some((team) => (team.lead?.email || "").trim().toLowerCase() === currentEmail)
        if (leadFound) {
          setTeamMembership("lead")
          return
        }
        const memberFound = teams.some((team) =>
          (team.members || []).some((member) => (member.email || "").trim().toLowerCase() === currentEmail),
        )
        setTeamMembership(memberFound ? "member" : "none")
      } catch {
        setTeamMembership("none")
      }
    }

    void detectTeamMembership()
  }, [
    authLoading,
    user?.id,
    profile?.role,
    serverIdentity?.profile?.role,
    user?.email,
    user?.user_metadata?.role,
    serverIdentity?.user?.email,
  ])

  const ensureOwnerWorkspace = (items: WorkspaceItem[]) => {
    if (!user?.id) return items
    const ownsFlag =
      typeof window !== "undefined" && window.localStorage.getItem("onvera:ownsWorkspace") === "true"
    const ownsByProfile =
      profile?.role === "super_admin" ||
      (typeof user.user_metadata?.role === "string" && user.user_metadata.role === "super_admin")
    if (!(ownsFlag || ownsByProfile)) return items
    if (items.some((workspace) => workspace.id === user.id)) return items
    const fallbackName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Workspace"
    return [
      {
        id: user.id,
        name: fallbackName,
        email: user.email || null,
        plan: profile?.plan || "free",
        role: "super_admin",
      },
      ...items,
    ]
  }

  useEffect(() => {
    if (!mounted || authLoading || !user?.id) return
    let active = true
    const loadWorkspaces = async () => {
      try {
        const res = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
        const data = await res.json().catch(() => null) as { workspaces?: WorkspaceItem[] } | null
        if (!active) return
        let items = Array.isArray(data?.workspaces) ? data.workspaces : []
        items = ensureOwnerWorkspace(items)
        setWorkspaces(items)
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("onvera:workspace") : null
        const preferred = stored && items.some((item) => item.id === stored) ? stored : null
        const fallback = items[0]?.id || null
        const nextId =
          preferred ||
          (items.some((item) => item.id === user.id) ? user.id : fallback)
        setSelectedWorkspaceId(nextId)
        if (nextId && typeof window !== "undefined") {
          window.localStorage.setItem("onvera:workspace", nextId)
        }
      } catch {
        setWorkspaces([])
      } finally {
        if (active) setWorkspaceSwitching(false)
      }
    }
    void loadWorkspaces()
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      setWorkspaceSwitching(true)
      void loadWorkspaces()
    }
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    return () => {
      active = false
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
    }
  }, [authLoading, mounted, user?.id])

  if (!mounted) {
    return null
  }

  const name =
    profile?.full_name ||
    serverIdentity?.profile?.fullName ||
    user?.user_metadata?.full_name ||
    serverIdentity?.user?.fullName ||
    user?.email?.split("@")[0] ||
    "User"

  const email = user?.email || serverIdentity?.user?.email || "No email"
  const avatar =
    (typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "") || ""
  const metadataRole =
    typeof user?.user_metadata?.role === "string"
      ? user.user_metadata.role
      : null
  const currentRole = profile?.role || serverIdentity?.profile?.role || metadataRole || null
  const workspaceRole = serverIdentity?.profile?.workspaceRole || null
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const isCreateWorkspaceView = selectedWorkspaceId === "__create__"
  const effectiveRole = workspaceRole || currentRole
  const ownsWorkspaceFlag =
    typeof window !== "undefined" && window.localStorage.getItem("onvera:ownsWorkspace") === "true"
  const ownsWorkspace =
    !!user?.id &&
    (ownsWorkspaceFlag ||
      profile?.role === "super_admin" ||
      (typeof user.user_metadata?.role === "string" && user.user_metadata.role === "super_admin") ||
      workspaces.some((workspace) => workspace.id === user.id))
  const isOwnerWorkspace = !!user?.id && !!selectedWorkspaceId && selectedWorkspaceId === user.id
  const hasExternalWorkspace =
    !!user?.id && workspaces.some((workspace) => workspace.id !== user.id)
  const showWorkspaceSwitcher = hasExternalWorkspace
  const displayRole =
    isCreateWorkspaceView
      ? "project_member"
      : selectedWorkspace?.role || workspaceRole || currentRole
  const rawPlan = isCreateWorkspaceView ? "free" : selectedWorkspace?.plan || profile?.plan || serverIdentity?.profile?.plan || null
  const currentPlan = rawPlan ? normalizePlan(rawPlan) : null
  const workspaceReady = !workspaceSwitching && (!workspaces.length || !!selectedWorkspaceId)
  const roleReady = !authLoading && (!user || !!currentRole) && workspaceReady
  const managedByLabel =
    isOwnerWorkspace && currentPlan
      ? `${PLAN_LABELS[currentPlan]}`
      : effectiveRole === "super_admin"
        ? currentPlan
          ? `${PLAN_LABELS[currentPlan]}`
          : null
        : isCreateWorkspaceView
          ? "Collaborator"
          : displayRole && isUserRole(displayRole)
            ? USER_ROLE_LABELS[displayRole]
            : "Collaborator"
  const managedByPrefix =
    isOwnerWorkspace && currentPlan
      ? "Current Plan"
      : effectiveRole === "super_admin" && currentPlan
      ? "Current Plan"
      : isCreateWorkspaceView
        ? "Managed by"
        : "Managed by"
  const canAccessTeams = displayRole === "team_member" || displayRole === "team_lead" || teamMembership !== "none"
  const adminEmailList =
    typeof process.env.NEXT_PUBLIC_ADMIN_EMAILS === "string"
      ? process.env.NEXT_PUBLIC_ADMIN_EMAILS
          .split(",")
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      : []
  const isAdminEmail =
    currentRole === "super_admin" &&
    !!email &&
    adminEmailList.includes(email.trim().toLowerCase())

  const planAllowsTeams = canUseTeams(currentPlan)
  const showUpgradePrompt = isOwnerWorkspace && currentPlan === "free" && !isCreateWorkspaceView
  const hideManagedBy = effectiveRole === "super_admin" && !currentPlan

  const navItems = roleReady
    ? displayRole === "project_member"
      ? data.navMain.filter((item) => item.url === "/projects")
      : displayRole === "team_member"
        ? data.navMain.filter((item) => item.url === "/projects" || item.url === "/teams")
        : displayRole === "team_lead"
          ? data.navMain.filter((item) => item.url === "/projects" || item.url === "/teams")
        : planAllowsTeams
          ? data.navMain
          : data.navMain.filter((item) => item.url !== "/teams")
    : []
  const filteredNavItems = navItems.filter(
    (item) => item.url !== "/admin/plan-manager" || isAdminEmail,
  )

  const showOngoingProjects = roleReady && !isCreateWorkspaceView

  const handleLogout = () => {
    const supabase = createClient()
    supabase.auth.signOut().finally(() => {
      window.location.assign("/")
    })
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-2 group-data-[slot=collapsed]:p-0! group-data-[slot=collapsed]:justify-center!"
            >
              <a>
                <Logo className="w-8! h-8!" />
                <span className="text-base font-semibold">Onvera</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {showWorkspaceSwitcher ? (
          <div className="px-3 pb-2">
            <Select
              value={selectedWorkspaceId ?? ""}
              onValueChange={(value) => {
                setWorkspaceSwitching(true)
                setSelectedWorkspaceId(value)
                if (value !== "__create__" && typeof window !== "undefined") {
                  window.localStorage.setItem("onvera:workspace", value)
                  window.dispatchEvent(new Event("workspace:changed"))
                }
                if (value === "__create__") {
                  setOpenCreateWorkspace(true)
                }
              }}
            >
              <div className="relative">
                <SelectTrigger className="h-9 w-full text-xs pr-8">
                  <SelectValue placeholder="Select workspace" />
                </SelectTrigger>
              </div>
              <SelectContent>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
                {!ownsWorkspace ? (
                  <SelectItem value="__create__">Create your own workspace</SelectItem>
                ) : null}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {roleReady ? (
          !isCreateWorkspaceView ? (
            <>
              <NavMain items={filteredNavItems} />
              {showOngoingProjects ? <NavProjects /> : null}
            </>
          ) : null
        ) : (
          <div className="px-4 py-3 text-xs text-muted-foreground">Loading menu...</div>
        )}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" />   */}
      </SidebarContent>
      <SidebarFooter>        
        {showUpgradePrompt ? (
          <div className="pb-8 px-3">
            <div className="bg-violet-100 dark:bg-violet-500/20 rounded-xl p-5 space-y-2 text-center group-data-[state=collapsed]:hidden">
              <div className="space-y-3">
                  <p className="mt-1 text-sm font-semibold text-violet-700 dark:text-white/80">Unlock full features</p>
                  <p className="mt-1 text-xs text-violet-700 dark:text-white/40">
                    Teams, notes, and unlimited templates.
                  </p>
              <Link href="/billing" className="mt-3 inline-block w-full">
                <Button variant="gradient" size="sm" className="rounded-full text-xs py-2">
                  <Sparkles className="w-3.5! h-3.5!" /> Upgrade plan
                </Button>
              </Link>
            </div>
          </div>
          </div>
        ) : null}
        <NavUser
          user={{ name, email, avatar }}
          role={displayRole}
          managedByLabel={managedByLabel}
          managedByPrefix={managedByPrefix}
          hideManagedBy={hideManagedBy}
          onLogout={handleLogout}
        />
      </SidebarFooter>
      <Dialog open={openCreateWorkspace} onOpenChange={setOpenCreateWorkspace}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create your workspace</DialogTitle>
          </DialogHeader>
          <div className="pb-5 text-sm text-muted-foreground">
            <p>Start a new workspace on this account with a Free plan and be a Super Admin.</p>
          </div>
          <DialogFooter>
          {/* <div className="flex justify-end gap-2 pt-2"> */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpenCreateWorkspace(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="gradient"
              disabled={creatingWorkspace}
              onClick={async () => {
                setCreatingWorkspace(true)
                setWorkspaceSwitching(true)
                const toastId = toast.loading("Workspace loading...")
                try {
                  const res = await fetchWithAuth("/api/workspaces/create", { method: "POST" })
                  const data = await res.json().catch(() => null) as { message?: string } | null
                  if (!res.ok) {
                    throw new Error(data?.message || "Failed to create workspace")
                  }
                  await refreshProfile()
                  let items: WorkspaceItem[] = []
                  const maxAttempts = 6
                  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                    const refreshed = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
                    const refreshedData = await refreshed.json().catch(() => null) as { workspaces?: WorkspaceItem[] } | null
                    items = Array.isArray(refreshedData?.workspaces) ? refreshedData.workspaces : []
                    if (user?.id && items.some((workspace) => workspace.id === user.id)) {
                      break
                    }
                    await new Promise((resolve) => setTimeout(resolve, 400))
                  }
                  items = ensureOwnerWorkspace(items)
                  setWorkspaces(items)
                  if (user?.id) {
                    setSelectedWorkspaceId(user.id)
                    if (typeof window !== "undefined") {
                      window.localStorage.setItem("onvera:workspace", user.id)
                      window.localStorage.setItem("onvera:ownsWorkspace", "true")
                      window.dispatchEvent(new Event("workspace:changed"))
                    }
                  }
                  if (user?.id && !items.some((workspace) => workspace.id === user.id)) {
                    setOpenCreateWorkspace(false)
                    setShowRefreshPrompt(true)
                  }
                  try {
                    const identityRes = await fetchWithAuth("/api/auth/me", { cache: "no-store" })
                    if (identityRes.ok) {
                      const identityData = await identityRes.json().catch(() => null)
                      setServerIdentity(identityData)
                    }
                  } catch {
                    // ignore
                  }
                  toast.success("Workspace ready", { id: toastId })
                  setOpenCreateWorkspace(false)
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Failed to create workspace", { id: toastId })
                } finally {
                  setCreatingWorkspace(false)
                  setWorkspaceSwitching(false)
                }
              }}
            >
              {creatingWorkspace ? "Creating..." : "Create workspace"}
            </Button>
          {/* </div> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showRefreshPrompt} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <RefreshCw className="h-4 w-4" />
              </span>
              Refresh to explore features
            </DialogTitle>
          </DialogHeader>
          <div className="pb-4 text-sm text-muted-foreground">
            Your workspace was created successfully. Please refresh once to load the latest access and features.
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("onvera:post-refresh", "/dashboard")
                  window.location.reload()
                }
              }}
            >
              Refresh now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
