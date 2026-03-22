"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"

const RESTRICTED_ROLES = new Set(["project_member", "team_member"])

function normalizeRole(value: string | null) {
  if (!value) return null
  return value.trim().toLowerCase().replace(/\s+/g, "_")
}

function isAllowedForRestricted(pathname: string | null, role: string | null) {
  if (!pathname || !role) return false
  if (role === "project_member") {
    return pathname.startsWith("/projects")
  }
  if (role === "team_member") {
    return pathname.startsWith("/projects") || pathname.startsWith("/teams")
  }
  return true
}

function isRestrictedInfoPage(pathname: string | null) {
  if (!pathname) return false
  return (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/templates") ||
    pathname.startsWith("/teams")
  )
}

export function DashboardAccessGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [resolvedRole, setResolvedRole] = useState<string | null>(null)
  const [roleLoading, setRoleLoading] = useState(false)

  const role = useMemo(() => {
    if (profile?.role) return normalizeRole(profile.role)
    if (typeof user?.user_metadata?.role === "string") return normalizeRole(user.user_metadata.role)
    return null
  }, [profile?.role, user?.user_metadata?.role])

  useEffect(() => {
    if (!user || role || resolvedRole || roleLoading) return
    let active = true
    const resolve = async () => {
      setRoleLoading(true)
      try {
      const res = await fetchWithAuth("/api/auth/me", { cache: "no-store" })
        const data = await res.json().catch(() => null) as { profile?: { role?: string | null } } | null
        if (!active) return
        const nextRole =
          typeof data?.profile?.role === "string" ? normalizeRole(data.profile.role) : null
        setResolvedRole(nextRole)
      } catch {
        if (active) setResolvedRole(null)
      } finally {
        if (active) setRoleLoading(false)
      }
    }
    void resolve()
    return () => {
      active = false
    }
  }, [user, role, resolvedRole, roleLoading])

  const effectiveRole = role || resolvedRole

  useEffect(() => {
    if (loading) return
    if (!user) return

    if (RESTRICTED_ROLES.has(effectiveRole || "")) {
      if (!isAllowedForRestricted(pathname, effectiveRole)) {
        if (!isRestrictedInfoPage(pathname) && pathname !== "/projects") {
          router.replace("/projects")
        }
      }
    }
  }, [loading, user, effectiveRole, pathname, router])

  if (loading) return null
  if (!user) return null
  if (roleLoading) return null
  if (RESTRICTED_ROLES.has(effectiveRole || "") && !isAllowedForRestricted(pathname, effectiveRole)) {
    if (isRestrictedInfoPage(pathname)) {
      return <>{children}</>
    }
    if (pathname !== "/projects") {
      router.replace("/projects")
    }
    return null
  }

  return <>{children}</>
}
