"use client"

import TemplateCards from '@/components/templateCard'
import { ProjectsPageSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { EmptyState } from '@/components/emptyState'
import { useAuth } from '@/components/providers/auth-provider'
import React, { useEffect, useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import { fetchWithAuth } from "@/lib/auth/client-fetch"

type WorkspaceItem = {
  id: string
  name: string
  email: string | null
  plan: string | null
  role: "super_admin" | "team_lead" | "team_member" | "project_member"
}

export default function Page() {
  const { profile, user, loading } = useAuth()
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null)
  const ensureOwnerWorkspace = (items: WorkspaceItem[]): WorkspaceItem[] => {
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
    const ownerWorkspace: WorkspaceItem = {
      id: user.id,
      name: String(fallbackName),
      email: user.email || null,
      plan: typeof profile?.plan === "string" ? profile.plan : "free",
      role: "super_admin",
    }
    return [ownerWorkspace, ...items]
  }
  const currentWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null
  const currentRole =
    currentWorkspace?.role ||
    profile?.role ||
    (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
    null
  const canAccessTemplates = currentRole === "super_admin"

  useEffect(() => {
    if (loading || !user?.id) return
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
      } catch {
        setWorkspaces([])
      }
    }
    void loadWorkspaces()
    const handleWorkspace = () => {
      if (typeof window === "undefined") return
      void loadWorkspaces()
    }
    window.addEventListener("workspace:changed", handleWorkspace)
    window.addEventListener("storage", handleWorkspace)
    return () => {
      active = false
      window.removeEventListener("workspace:changed", handleWorkspace)
      window.removeEventListener("storage", handleWorkspace)
    }
  }, [loading, user?.id])

  if (loading) {
    return <ProjectsPageSkeleton />
  }

  if (!canAccessTemplates) {
    return (
      <EmptyState
      icon={<TriangleAlert className='text-destructive' />}
        title="Templates Unavailable"
        description="Templates are available only to workspace admins."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
    <TemplateCards canSeed={canAccessTemplates} />
    </div>
  )
}
