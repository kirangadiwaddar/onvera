"use client"

import * as React from "react"

import { FolderOpenDot, LayoutPanelTop, CirclePile, LayoutGrid, Sparkles } from "lucide-react"

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
import type { Team } from "@/types/team"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { createClient } from "@/lib/supabase/client"
import { canUseTeams, normalizePlan, PLAN_LABELS } from "@/lib/billing/plans"
import Link from "next/link"
import { Button } from "./ui/button"


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
  const { user, profile, loading: authLoading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [serverIdentity, setServerIdentity] = useState<{
    user: { email: string | null; fullName: string | null } | null
    profile: { fullName: string | null; role?: string | null; plan?: string | null } | null
  } | null>(null)
  const [teamMembership, setTeamMembership] = useState<"none" | "member" | "lead">("none")

  useEffect(() => {
    setMounted(true)
  }, [])

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
  const rawPlan = profile?.plan || serverIdentity?.profile?.plan || null
  const currentPlan = rawPlan ? normalizePlan(rawPlan) : null
  const roleReady = !authLoading && (!user || !!currentRole)
  const managedByLabel =
    currentRole === "super_admin"
      ? currentPlan
        ? `${PLAN_LABELS[currentPlan]}`
        : null
      : currentRole === "team_lead"
        ? "Team Lead"
      : currentRole === "team_member"
        ? "Team Member"
        : currentRole === "project_member"
          ? "Project Member"
          : null
  const managedByPrefix = currentRole === "super_admin" && currentPlan ? "Current Plan" : "Managed by"
  const canAccessTeams = currentRole === "team_member" || teamMembership !== "none"
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
  const showUpgradePrompt = currentRole === "super_admin" && currentPlan === "free"
  const hideManagedBy = currentRole === "super_admin" && !currentPlan

  const navItems = roleReady
    ? currentRole === "project_member"
      ? data.navMain.filter((item) => item.url === "/projects" || (canAccessTeams && item.url === "/teams"))
      : currentRole === "team_member"
        ? data.navMain.filter((item) => item.url === "/projects" || item.url === "/teams")
        : currentRole === "team_lead"
          ? data.navMain.filter((item) => item.url === "/projects" || item.url === "/teams")
        : planAllowsTeams
          ? data.navMain
          : data.navMain.filter((item) => item.url !== "/teams")
    : []
  const filteredNavItems = navItems.filter(
    (item) => item.url !== "/admin/plan-manager" || isAdminEmail,
  )

  const showOngoingProjects = roleReady

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
        {roleReady ? (
          <>
            <NavMain items={filteredNavItems} />
            {showOngoingProjects ? <NavProjects /> : null}
          </>
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
          role={currentRole}
          managedByLabel={managedByLabel}
          managedByPrefix={managedByPrefix}
          hideManagedBy={hideManagedBy}
          onLogout={handleLogout}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
