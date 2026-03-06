"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { Project } from "@/types/project"
import { Badge } from "../ui/badge"

export function NavProjects() {
  const { isMobile } = useSidebar()

  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch("/api/projects?status=ongoing&limit=5", {
          cache: "no-store",
        })

        if (!res.ok) return

        const data = await res.json()
        setProjects(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Sidebar project fetch failed:", err)
      }
    }

    fetchProjects()
  }, [])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      {projects.length === 0 ? 
      <SidebarGroupLabel className="text-destructive">
        <span className="w-3 h-3 rounded-full bg-destructive/80 mr-2"></span>
        No Ongoing Projects
      </SidebarGroupLabel> : 
      <SidebarGroupLabel className="text-violet-600">
        <span className="w-3 h-3 rounded-full bg-violet-600 mr-2"></span>
        Ongoing Projects
      </SidebarGroupLabel>
      }

      <SidebarMenu>
        {projects.map((project) => (
          <SidebarMenuItem key={project.id}>
            <SidebarMenuButton
              asChild
              className="text-xs text-zinc-600 h-auto py-1"
              size="sm"
            >
              <Link href={`/projects/${project.slug}`}>
                <span>{project.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}