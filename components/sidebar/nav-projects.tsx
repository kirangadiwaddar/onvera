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

import type { Project } from "@/types/project"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { useAuth } from "@/components/providers/auth-provider"

export function NavProjects() {
  const [projects, setProjects] = useState<
    Array<Pick<Project, "id" | "slug" | "title" | "status" | "createdAt" | "updatedAt" | "createdBy">>
  >([])
  const { user, loading: authLoading } = useAuth()
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user?.id) return
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      const stored = window.localStorage.getItem("onvera:workspace")
      setSelectedWorkspaceId(stored)
    }
    handleWorkspace()
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    let isActive = true
    let intervalId: ReturnType<typeof setInterval> | null = null
    const POLL_INTERVAL_MS = 30000

    const fetchProjects = async () => {
      try {
        const res = await fetchWithAuth("/api/projects?summary=1", {
          cache: "no-store",
        })

        if (!res.ok) return

        const data = await res.json()
        const allProjects: Array<Pick<Project, "id" | "slug" | "title" | "status" | "createdAt" | "updatedAt" | "createdBy">> = Array.isArray(data)
          ? data
          : Array.isArray(data?.projects)
            ? data.projects
            : []

        const ongoingProjects = allProjects
          .filter((project) => !selectedWorkspaceId || project.createdBy === selectedWorkspaceId)
          .filter((project) => project.status === "ongoing")
          .sort((a, b) => {
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return bTime - aTime
          })
          .slice(0, 7)

        if (isActive) {
          setProjects(ongoingProjects)
        }
      } catch (err) {
        console.error("Sidebar project fetch failed:", err)
      }
    }

    void fetchProjects()
    intervalId = setInterval(() => {
      void fetchProjects()
    }, POLL_INTERVAL_MS)

    const handleFocus = () => {
      void fetchProjects()
    }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void fetchProjects()
      }
    }
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      isActive = false
      if (intervalId) clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
    }
  }, [authLoading, selectedWorkspaceId, user?.id])

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      {/* <Separator className="mb-5"/> */}
      {projects.length === 0 ? (
        <SidebarGroupLabel className="text-destructive text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-destructive/80 mr-2"></span>
          No Ongoing Projects
        </SidebarGroupLabel>
      ) : (
        <SidebarGroupLabel className="text-violet-600 text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-600 mr-2"></span>
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
