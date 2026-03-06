"use client"

import * as React from "react"

import {
  Home,
  FolderOpenDot,
  LayoutPanelTop,
  CirclePile,
  Bell
} from "lucide-react"

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
import { NavProjects } from "./sidebar/nav-projects"
import { Separator } from "./ui/separator"

import { User } from "@supabase/supabase-js"
import { ProjectDialog } from "./project-dialog"
import { Project } from "@/types/project"
import { useRouter } from "next/navigation"

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

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  user: User
}

export function AppSidebar({ user, ...props }: AppSidebarProps) {

  const [projects, setProjects] = React.useState<Project[]>([])
  const [role, setRole] = React.useState<string | undefined>(undefined)

  const router = useRouter()

  /* LOAD ROLE */

  React.useEffect(() => {

    const loadRole = async () => {
      const res = await fetch("/api/me")
      const data = await res.json()
      setRole(data.role)
    }

    loadRole()

  }, [])

  /* FILTER SIDEBAR */

 const filteredNav = data.navMain.filter(item => {
  // Freelancer → hide teams
  if (role === "freelancer" && item.url === "/teams") {
    return false
  }
  // Member → hide dashboard and templates
  if (role === "member" && (item.url === "/dashboard" || item.url === "/templates")) {
    return false
  }
  return true
})
  

  const displayName =
    user.user_metadata?.display_name || "User"

  return (

    <Sidebar collapsible="icon" {...props}>

      <SidebarHeader>

        <SidebarMenu>

          <SidebarMenuItem>

            <SidebarMenuButton
              asChild
              size="lg"
              className="data-[slot=sidebar-menu-button]:p-2 group-data-[slot=collapsed]:p-0! group-data-[slot=collapsed]:justify-center! rounded-full"
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
        {role !== "member" && (
        <ProjectDialog
          mode="create"
          onSaved={(project) => {

            setProjects((prev) => [project, ...prev])

            router.push(`/projects/${project.slug}`)

          }}
        />)}

        {/* FILTERED NAVIGATION */}
        <NavMain items={filteredNav} />

        <Separator className="group-data-[collapsible=icon]:hidden" />

        <NavProjects />

      </SidebarContent>

      <SidebarFooter>

        <NavUser user={user} role={role} />

      </SidebarFooter>

    </Sidebar>

  )

}