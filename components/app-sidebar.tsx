"use client"

import * as React from "react"

import { Home, FolderOpenDot, LayoutPanelTop, CirclePile } from "lucide-react"

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


const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
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
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, profile } = useAuth()
  const [serverIdentity, setServerIdentity] = useState<{
    user: { email: string | null; fullName: string | null } | null
    profile: { fullName: string | null; role?: string | null } | null
  } | null>(null)
  const [teamMembership, setTeamMembership] = useState<"none" | "member" | "lead">("none")

  useEffect(() => {
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
  }, [])

  useEffect(() => {
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
  }, [profile?.role, serverIdentity?.profile?.role, user?.email, user?.user_metadata?.role, serverIdentity?.user?.email])

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
  const managedByLabel =
    teamMembership === "lead"
      ? "Team Lead"
      : teamMembership === "member"
        ? "Team Member"
        : currentRole === "project_member"
        ? "Project Member"
        : null
  const canAccessTeams = currentRole === "team_member" || teamMembership !== "none"

  const navItems =
    currentRole === "freelancer"
      ? data.navMain.filter((item) => item.url !== "/teams")
      : currentRole === "project_member"
      ? data.navMain.filter((item) => item.url === "/projects" || (canAccessTeams && item.url === "/teams"))
      : currentRole === "team_member"
        ? data.navMain.filter((item) => item.url === "/projects" || item.url === "/teams")
        : data.navMain

  const showOngoingProjects = currentRole !== "team_member"

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
        <NavMain items={navItems} />  
        {showOngoingProjects ? (
          <NavProjects />
        ) : null}
        {/* <UpgradeBlock /> */}
        {/* <NavSecondary items={data.navSecondary} className="mt-auto" />   */}
      </SidebarContent>
      <SidebarFooter>        
        <NavUser user={{ name, email, avatar }} role={currentRole} managedByLabel={managedByLabel} onLogout={handleLogout} /> 
      </SidebarFooter>
    </Sidebar>
  )
}
