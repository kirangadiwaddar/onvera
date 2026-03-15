"use client"

import { useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { getDefaultPathForRole } from "@/lib/auth/roles"

export default function AuthCallbackPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getSession()
      const next = searchParams.get("next")
      if (!data.session) {
        router.replace("/login?error=auth_callback")
        return
      }

      if (next && next.startsWith("/")) {
        router.replace(next)
        return
      }

      const profileResponse = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .single()

      const role =
        (profileResponse.data?.role as string | null) ||
        (typeof data.session.user.user_metadata?.role === "string"
          ? data.session.user.user_metadata.role
          : null)

      router.replace(getDefaultPathForRole(role))
    }
    void run()
  }, [router, searchParams])

  return (
    <div className="p-6 text-sm text-muted-foreground">Completing sign-in...</div>
  )
}
