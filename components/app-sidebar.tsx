"use client"

import * as React from "react"

import { Home, FolderOpenDot, LayoutPanelTop, CirclePile, BookText, Settings, HelpCircle, Bell } from "lucide-react"

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
import UpgradeBlock from "./sidebar/upgrade-block"
import { NavProjects } from "./sidebar/nav-projects"
import { Separator } from "./ui/separator"
import { NavSecondary } from "./sidebar/nav-secondary"


const data = {
  user: {
    name: "Kiran Gadiwaddar",
    email: "kgadiwaddar@gmail.com",
    avatar: "https://randomuser.me/api/portraits/men/20.jpg",
  },
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
  navSecondary: [
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: Settings,
    // },
    // {
    //   title: "Get Help",
    //   url: "#",
    //   icon: HelpCircle,
    // },
    {
      title: "Notifications",
      url: "#",
      icon: Bell,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
        <NavMain items={data.navMain} />  
        <Separator className="group-data-[collapsible=icon]:hidden" />
        <NavProjects />
         {/* <UpgradeBlock /> */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />  
      </SidebarContent>
      <SidebarFooter>        
        <NavUser user={data.user} /> 
      </SidebarFooter>
    </Sidebar>
  )
}
