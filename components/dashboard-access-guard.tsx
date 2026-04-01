"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"

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

  const role = useMemo(() => {
    if (profile?.role) return normalizeRole(profile.role)
    if (typeof user?.user_metadata?.role === "string") return normalizeRole(user.user_metadata.role)
    return null
  }, [profile?.role, user?.user_metadata?.role])
  const effectiveRole = role

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
