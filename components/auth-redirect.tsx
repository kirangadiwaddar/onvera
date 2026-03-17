"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { getDefaultPathForRole } from "@/lib/auth/roles"

export function AuthRedirect() {
  const { user, loading, profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (typeof window !== "undefined") {
      const suppressed = window.sessionStorage.getItem("suppress-auth-redirect")
      if (suppressed === "1") return
    }
    if (user) {
      if (pathname?.startsWith("/reset-password")) return
      const role = profile?.role || (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null)
      router.replace(getDefaultPathForRole(role))
    }
  }, [loading, user, profile, router, pathname])

  return null
}
