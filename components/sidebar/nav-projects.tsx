"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

import { Project } from "@/types/project"
import { fetchWithAuth } from "@/lib/auth/client-fetch"

export function NavProjects() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetchWithAuth("/api/projects", {
          cache: "no-store",
        })

        if (!res.ok) return

        const data = await res.json()
        const allProjects: Project[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.projects)
            ? data.projects
            : []

        const ongoingProjects = allProjects
          .filter((project) => project.status === "ongoing")
          .slice(0, 5)

        setProjects(ongoingProjects)
      } catch (err) {
        console.error("Sidebar project fetch failed:", err)
      }
    }

    fetchProjects()
  }, [])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <Separator className="mb-5"/>
      {projects.length === 0 ? (
        <SidebarGroupLabel className="text-destructive">
          <span className="w-3 h-3 rounded-full bg-destructive/80 mr-2"></span>
          No Ongoing Projects
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel className="text-violet-600">
          <span className="w-3 h-3 rounded-full bg-violet-600 mr-2"></span>
          Ongoing Projects
        </SidebarGroupLabel>
      )}
      <SidebarMenu>
        {projects.map((project) => (
          <SidebarMenuItem key={project.id}>
            <SidebarMenuButton
              asChild
              className="text-xs text-zinc-600 dark:text-zinc-400 hover:dark:text-white h-auto py-1"
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
