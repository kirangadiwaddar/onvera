"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/loadingState"
import { EmptyState } from "@/components/emptyState"

type InviteInfo = {
  contextType: "team" | "project"
  contextName: string
  contextSlug: string
  memberRole: "team_lead" | "team_member" | "project_member"
  email: string | null
  name: string | null
  isLead?: boolean
}

export default function InviteClient() {
  const { user, loading: authLoading, signOut } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = useMemo(() => searchParams.get("token")?.trim() || "", [searchParams])
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    if (!token) {
      setError("Missing invite token.")
      setLoading(false)
      return
    }
    let active = true
    const loadInvite = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/invitations/lookup?token=${encodeURIComponent(token)}`, { cache: "no-store" })
        const data = await res.json().catch(() => null) as { invite?: InviteInfo; message?: string } | null
        if (!active) return
        if (!res.ok || !data?.invite) {
          setError(data?.message || "Invite not found or expired.")
          setInvite(null)
          return
        }
        setInvite(data.invite)
        setError(null)
      } catch {
        if (active) setError("Unable to load invite.")
      } finally {
        if (active) setLoading(false)
      }
    }
    void loadInvite()
    return () => {
      active = false
    }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    try {
      const res = await fetchWithAuth("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => null) as {
        accepted?: boolean
        redirect?: string
        workspaceId?: string | null
        message?: string
      } | null
      if (!res.ok || !data?.accepted) {
        setError(data?.message || "Failed to accept invite.")
        return
      }
      if (typeof window !== "undefined" && data.workspaceId) {
        window.localStorage.setItem("onvera:workspace", data.workspaceId)
        window.dispatchEvent(new Event("workspace:changed"))
      }
      const redirect = data.redirect || "/dashboard"
      router.replace(redirect)
    } finally {
      setAccepting(false)
    }
  }

  const emailMatch = invite?.email && user?.email
    ? invite.email.toLowerCase() === user.email.toLowerCase()
    : true

  const nextPath = `/invite?token=${encodeURIComponent(token)}`
  const registerUrl = invite
    ? `/register?role=${encodeURIComponent(invite.memberRole)}&inviteToken=${encodeURIComponent(token)}&next=${encodeURIComponent(nextPath)}`
    : `/register?next=${encodeURIComponent(nextPath)}`
  const loginUrl = `/login?next=${encodeURIComponent(nextPath)}`

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <LoadingState title="Loading invite..." description="Checking your invite link." />
      </div>
    )
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <EmptyState
          title="Invite unavailable"
          description={error || "Invite not found."}
          buttonText="Go to login"
          onClick={() => router.push("/login")}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-[#0b0b13] dark:text-white">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-white/10 dark:bg-white/5">
        <div className="space-y-2">
          <p className="text-sm uppercase text-muted-foreground">You’re invited</p>
          <h1 className="text-2xl font-semibold">
            Join {invite.contextType === "team" ? "team" : "project"}: {invite.contextName}
          </h1>
          {invite.email ? (
            <p className="text-sm text-muted-foreground">
              This invite was sent to <span className="font-medium text-foreground">{invite.email}</span>.
            </p>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {user ? (
            emailMatch ? (
              <Button className="w-full" onClick={() => void handleAccept()} disabled={accepting}>
                {accepting ? "Accepting..." : "Accept Invite"}
              </Button>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You’re signed in as {user.email}. Please sign in with the invited email to accept.
                </p>
                <Button className="w-full" variant="outline" onClick={() => void signOut()}>
                  Switch account
                </Button>
              </>
            )
          ) : (
            <>
              <Button asChild className="w-full">
                <Link href={loginUrl}>Log in to accept</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={registerUrl}>Create account</Link>
              </Button>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          Need a different email? Ask your admin to resend the invite.
        </div>
      </div>
    </div>
  )
}
