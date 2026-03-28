"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Copy, ExternalLink, Handshake, Mail, RefreshCcw } from "lucide-react"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"
import { Spinner } from "../ui/spinner"

type TokenPayload = {
  token: string
  projectSlug: string
  expiresAt: string | null
  maxUses: number
  usedCount: number
  status: "active" | "revoked" | "expired" | "used_up"
  hasPassword: boolean
  password: string
  url: string
  createdAt: string
}

type Props = {
  projectSlug: string
  canManage?: boolean
}

function statusClass(status: TokenPayload["status"]) {
  if (status === "active") return "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/20"
  if (status === "revoked") return "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20"
  if (status === "expired") return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20"
  return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-white/5 dark:text-white/70 dark:border-white/10"
}

export default function ClientAccessModal({ projectSlug, canManage = true }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tokenData, setTokenData] = useState<TokenPayload | null>(null)

  const [password, setPassword] = useState("")
  const [expiresInDays, setExpiresInDays] = useState("5")
  const [maxUses, setMaxUses] = useState("1000")
  const [clientEmail, setClientEmail] = useState("")
  const [lastSentEmail, setLastSentEmail] = useState<string | null>(null)
  const [lastSentToken, setLastSentToken] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const [emailSending, setEmailSending] = useState(false)

  const absoluteUrl = useMemo(() => {
    if (!tokenData?.url) return ""
    if (typeof window === "undefined") return tokenData.url
    return `${window.location.origin}${tokenData.url}`
  }, [tokenData?.url])

  const normalizedClientEmail = clientEmail.trim().toLowerCase()
  const emailAlreadySent =
    Boolean(lastSentEmail && lastSentToken && tokenData?.token) &&
    lastSentEmail === normalizedClientEmail &&
    lastSentToken === tokenData?.token

  const fetchToken = useCallback(async () => {
    setLoading(true)
    setErrorMessage("")
    try {
      const response = await fetchWithAuth(`/api/onboarding/token?projectSlug=${projectSlug}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || "Unable to load onboarding link")
      }
      const current = (data?.token ?? null) as TokenPayload | null
      setTokenData(current)
      setPassword(current?.password ?? "")
    } catch (error) {
      setTokenData(null)
      setErrorMessage(error instanceof Error ? error.message : "Unable to load onboarding link")
    } finally {
      setLoading(false)
    }
  }, [projectSlug])

  useEffect(() => {
    if (!open) return
    void fetchToken()
  }, [open, fetchToken])

  useEffect(() => {
    if (!tokenData?.token) return
    if (lastSentToken && lastSentToken !== tokenData.token) {
      setLastSentEmail(null)
      setLastSentToken(null)
    }
  }, [lastSentToken, tokenData?.token])

  const handleGenerate = async () => {
    setSaving(true)
    setErrorMessage("")
    try {
      const response = await fetchWithAuth("/api/onboarding/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug,
          password: password.trim(),
          expiresInDays: Math.max(1, Number(expiresInDays) || 5),
          maxUses: Math.max(1, Number(maxUses) || 1000),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || "Failed to generate onboarding link")
      }
      setTokenData(data as TokenPayload)
      setPassword((data as TokenPayload).password ?? "")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate link")
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (action: "activate" | "revoke" | "reset-usage") => {
    if (!tokenData?.token) return
    setSaving(true)
    setErrorMessage("")
    try {
      const payload =
        action === "revoke"
          ? { token: tokenData.token, revoked: true }
          : action === "activate"
            ? { token: tokenData.token, revoked: false }
            : { token: tokenData.token, resetUsage: true }

      const response = await fetchWithAuth("/api/onboarding/token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update link status")
      }
      setTokenData((data?.token ?? null) as TokenPayload | null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update link status")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!tokenData?.token) return
    setSaving(true)
    setErrorMessage("")
    try {
      const response = await fetchWithAuth("/api/onboarding/token", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenData.token, password: password.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.message || "Failed to update password")
      }
      setTokenData((data?.token ?? null) as TokenPayload | null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to update password")
    } finally {
      setSaving(false)
    }
  }

  const handleCopyLink = async () => {
    if (!absoluteUrl) return
    setErrorMessage("")
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      toast.success("Link copied")
    } catch {
      setErrorMessage("Clipboard copy failed")
      toast.error("Clipboard copy failed")
    }
  }

  const handleEmailClient = async () => {
    if (!absoluteUrl) {
      setErrorMessage("Generate link first")
      return
    }
    if (!clientEmail.trim()) {
      setErrorMessage("Enter client email")
      return
    }
    if (!tokenData?.token) {
      setErrorMessage("Generate link first")
      return
    }
    setErrorMessage("")
    setEmailSending(true)
    try {
      const response = await fetchWithAuth("/api/onboarding/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectSlug,
          token: tokenData.token,
          email: clientEmail.trim(),
          url: absoluteUrl,
          password: tokenData.password || "",
        }),
      })
      const payload = await response.json().catch(() => null) as { message?: string; sent?: boolean } | null
      if (!response.ok || payload?.sent === false) {
        throw new Error(payload?.message || "Failed to send email")
      }
      toast.success("Client access email sent.")
      setLastSentEmail(clientEmail.trim().toLowerCase())
      setLastSentToken(tokenData.token)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send email"
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setEmailSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="gradient" size="sm">
          <Handshake />
          Client Access
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Client Access</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading access details...</div>
        ) : (
          <div className="space-y-5">
            {errorMessage && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {errorMessage}
              </div>
            )}
            {tokenData ? (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Current Link</div>
                  <Badge className={`capitalize border ${statusClass(tokenData.status)}`}>{tokenData.status}</Badge>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Input value={absoluteUrl} readOnly className="text-xs bg-white" />
                    <Button variant="outline" size="icon" onClick={() => void handleCopyLink()} disabled={!absoluteUrl}>
                      <Copy className="size-4" />
                    </Button>
                    {/* <Button variant="outline" size="icon" onClick={() => window.open(absoluteUrl, "_blank")}>
                      <ExternalLink className="size-4" />
                    </Button> */}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="py-1.5 px-2 text-xs bg-white text-zinc-700 dark:bg-white/10 dark:text-white/70">
                      Password: {tokenData.password || "None"}
                    </Badge>
                    <Badge className="py-1.5 px-2 text-xs bg-white text-zinc-700 dark:bg-white/10 dark:text-white/70">
                      Usage: {tokenData.usedCount}/{tokenData.maxUses}
                    </Badge>
                  </div>
                  {canManage ? (
                    <div className="flex flex-row-reverse items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        disabled={saving || tokenData.status === "active"}
                        onClick={() => void handleStatusUpdate("activate")}
                        className="text-xs"
                      >
                        Activate
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs"
                        disabled={saving || tokenData.status === "revoked"}
                        onClick={() => void handleStatusUpdate("revoke")}
                      >
                        Revoke
                      </Button>
                      {tokenData.status === "used_up" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={saving}
                          className="text-xs"
                          onClick={() => void handleStatusUpdate("reset-usage")}
                        >
                          Reset Usage
                        </Button>
                      )}
                    </div>
                  ) : null}
                </div>


              </div>
            ) : (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-5 text-sm text-muted-foreground">
                No onboarding link generated yet.
              </div>
            )}

            {canManage ? (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Manage Link</p>
                  <Button variant="gradient" size="sm" className="text-xs" onClick={() => void handleGenerate()} disabled={saving}>
                    <RefreshCcw className="mr-1 size-3.5" />
                    {tokenData ? "Regenerate" : "Generate"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Expire (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={expiresInDays}
                        className="bg-white"
                        onChange={(event) => setExpiresInDays(event.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max Uses</Label>
                      <Input
                        type="number"
                        min={1}
                        value={maxUses}
                        className="bg-white"
                        onChange={(event) => setMaxUses(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="password-block">
                    <Label className="text-xs mb-2">Password</Label>
                    <div className="flex items-center gap-2">                    
                    <div className="space-y-1 flex-1">                      
                      <Input
                        type="text"
                        placeholder="Optional password"
                        value={password}
                        className="bg-white"
                        onChange={(event) => setPassword(event.target.value)}
                      />
                    </div>
                    {tokenData && (
                        <Button className="text-xs bg-violet-600 hover:bg-violet-800 text-white h-auto py-2.5 dark:bg-violet-900 dark:text-white" onClick={() => void handlePasswordUpdate()} disabled={saving}>
                          Update Password
                        </Button>
                    )}
                  </div>
                  </div>                  
                </div>
              </div>
            ) : (
              <div className="rounded-lg  bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-800/50 dark:text-white/70">
                View-only access. Only team leads can manage onboarding links.
              </div>
            )}

            {canManage && tokenData ? (
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-5 space-y-3">
                <p className="text-sm font-medium">Email Client</p>
                <div className="flex items-center justify-between gap-2">
                  <Input
                    type="email"
                    placeholder="client@example.com"
                    value={clientEmail}
                    className="bg-white"
                    onChange={(event) => setClientEmail(event.target.value)}
                  />
                  <Button                    
                    onClick={handleEmailClient}
                    disabled={emailSending || !tokenData || !normalizedClientEmail || emailAlreadySent}
                    className="border border-zinc-200 dark:border-zinc-600"
                  >
                    {emailSending ? <Spinner /> : <Mail className="size-3.5" />}
                    {emailSending ? "Sending..." : emailAlreadySent ? "Sent" : "Send"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  We’ll send the current onboarding link and password (if set).
                </p>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter>
          <Button variant="destructiveLight" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
