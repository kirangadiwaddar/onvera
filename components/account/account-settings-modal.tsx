"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarColor } from "@/lib/get-avatar-colors"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"
import { Separator } from "../ui/separator"
import { RefreshCw, UserPen, UserRoundPen, X } from "lucide-react"
import { Spinner } from "../ui/spinner"
import { normalizePlan } from "@/lib/billing/plans"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type AccountDeleteImpact = {
  ownedProjects: number
  ownedTeams: number
  ownedTemplates: number
  ownedTokens: number
  teamMemberships: number
  projectMemberships: number
  hasData: boolean
}

export function AccountSettingsModal({ open, onOpenChange }: Props) {
  const { user, profile, refreshProfile } = useAuth()
  const [activeTab, setActiveTab] = useState("profile")
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteWorkspaceDialog, setShowDeleteWorkspaceDialog] = useState(false)
  const [showWorkspaceRefreshPrompt, setShowWorkspaceRefreshPrompt] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false)
  const [deleteImpact, setDeleteImpact] = useState<AccountDeleteImpact | null>(null)
  const [deletingWorkspace, setDeletingWorkspace] = useState(false)
  const [resettingAccount, setResettingAccount] = useState(false)
  const [resetStatusLoading, setResetStatusLoading] = useState(false)
  const [resetHasData, setResetHasData] = useState(true)
  const [workspaceMeta, setWorkspaceMeta] = useState<{ ownsWorkspace: boolean; hasExternalWorkspace: boolean }>({
    ownsWorkspace: false,
    hasExternalWorkspace: false,
  })
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [resetCountdown, setResetCountdown] = useState(15)
  const currentRole =
    profile?.role ||
    (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
    null
  const canDeleteAccount = Boolean(
    currentRole === "super_admin" ||
    currentRole === "team_lead" ||
    currentRole === "team_member" ||
    currentRole === "project_member",
  )
  const canResetAccount = currentRole === "super_admin"
  const canDeleteWorkspace = currentRole === "super_admin" && workspaceMeta.hasExternalWorkspace
  const currentPlan = normalizePlan(
    profile?.plan || (typeof user?.user_metadata?.plan === "string" ? user.user_metadata.plan : null),
  )
  const deleteConfirmEmail = (typeof user?.email === "string" ? user.email : "").trim().toLowerCase()
  const resetTimerRef = useRef<number | null>(null)
  const resetOpenTimeoutRef = useRef<number | null>(null)
  const avatarInputRef = useRef<HTMLInputElement | null>(null)

  const displayInitial = useMemo(() => {
    const initialName =
      profile?.full_name ||
      (typeof user?.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "") ||
      ""
    const initialAvatar =
      (typeof user?.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : "") || ""
    return { initialName, initialAvatar }
  }, [profile?.full_name, user?.user_metadata?.avatar_url, user?.user_metadata?.full_name])

  useEffect(() => {
    if (!open) return
    setActiveTab("profile")
    setFullName(displayInitial.initialName)
    setAvatarUrl(displayInitial.initialAvatar)
    setAvatarRemoved(false)
    setNewPassword("")
    setConfirmPassword("")
    setDeleteConfirmText("")
    setShowResetDialog(false)
    if (resetOpenTimeoutRef.current !== null) {
      window.clearTimeout(resetOpenTimeoutRef.current)
      resetOpenTimeoutRef.current = null
    }
    if (user?.id) {
      setResetStatusLoading(true)
      fetchWithAuth("/api/account/reset/status", { cache: "no-store" })
        .then((res) => res.json().catch(() => null))
        .then((data: { hasData?: boolean } | null) => {
          setResetHasData(Boolean(data?.hasData))
        })
        .catch(() => {
          setResetHasData(true)
        })
        .finally(() => setResetStatusLoading(false))
    }
  }, [displayInitial.initialAvatar, displayInitial.initialName, open])

  useEffect(() => {
    if (!open || !user?.id) return
    let active = true
    const loadWorkspaces = async () => {
      try {
        const response = await fetchWithAuth("/api/workspaces", { cache: "no-store" })
        const data = await response.json().catch(() => null) as { workspaces?: Array<{ id: string }> } | null
        if (!active) return
        const items = Array.isArray(data?.workspaces) ? data!.workspaces! : []
        const ownsWorkspace = items.some((workspace) => workspace.id === user.id)
        const hasExternalWorkspace = items.some((workspace) => workspace.id !== user.id)
        setWorkspaceMeta({ ownsWorkspace, hasExternalWorkspace })
      } catch {
        if (active) setWorkspaceMeta({ ownsWorkspace: false, hasExternalWorkspace: false })
      }
    }
    void loadWorkspaces()
    return () => {
      active = false
    }
  }, [open, user?.id])


  const trimmedAvatarUrl = avatarUrl.trim()
  const hasAvatar =
    !avatarRemoved &&
    trimmedAvatarUrl.length > 0 &&
    trimmedAvatarUrl !== "null" &&
    trimmedAvatarUrl !== "undefined"
  const avatarSrc = hasAvatar ? trimmedAvatarUrl : undefined
  const avatarInitial = useMemo(() => {
    const name = fullName.trim() || displayInitial.initialName.trim()
    const email = typeof user?.email === "string" ? user.email : ""
    const seed = name || email || "U"
    return seed.trim().charAt(0).toUpperCase()
  }, [displayInitial.initialName, fullName, user?.email])

  const persistProfileData = async (name: string, avatar: string) => {
    if (!user?.id) {
      throw new Error("You must be signed in to update account settings.")
    }

    const supabase = createClient()
    const fallbackRole =
      profile?.role ||
      (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
      "team_lead"

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: name,
        avatar_url: avatar || null,
      },
    })

    if (metadataError) {
      throw new Error(metadataError.message)
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: user.id,
      full_name: name,
      role: fallbackRole,
    })

    if (profileError) {
      throw new Error(profileError.message)
    }
  }

  const handleSaveProfile = async () => {
    const trimmedFullName = fullName.trim()

    if (!trimmedFullName) {
      const message = "Full name is required."
      toast.error(message)
      return
    }

    setSavingProfile(true)

    try {
      await persistProfileData(trimmedFullName, avatarUrl.trim())
      await refreshProfile()
      toast.success("Profile details updated.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update profile details."
      toast.error(message)
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveAvatar = async () => {
    const trimmedFullName = fullName.trim() || displayInitial.initialName
    const trimmedAvatarUrl = avatarUrl.trim()

    if (trimmedAvatarUrl.length > 2000) {
      const message = "Avatar URL is too long."
      toast.error(message)
      return
    }

    setSavingAvatar(true)

    try {
      await persistProfileData(trimmedFullName, trimmedAvatarUrl)
      await refreshProfile()
      toast.success(trimmedAvatarUrl ? "Avatar updated." : "Avatar removed.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update avatar."
      toast.error(message)
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleSavePassword = async () => {
    const trimmedPassword = newPassword.trim()
    const trimmedConfirmPassword = confirmPassword.trim()

    if (!trimmedPassword) {
      const message = "New password is required."
      toast.error(message)
      return
    }

    if (trimmedPassword.length < 8) {
      const message = "New password must be at least 8 characters."
      toast.error(message)
      return
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      const message = "Password confirmation does not match."
      toast.error(message)
      return
    }

    setSavingPassword(true)

    try {
      const supabase = createClient()
      const { error: passwordError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      })

      if (passwordError) {
        toast.error(passwordError.message)
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update password."
      toast.error(message)
    } finally {
      setSavingPassword(false)
    }
  }


  const handleDeleteAccount = async (forceDelete = false) => {
    if (!user?.id) return
    setDeletingAccount(true)
    let closeDeleteDialog = forceDelete
    try {
      const response = await fetchWithAuth("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: forceDelete }),
      })
      const payload = await response.json().catch(() => null) as {
        message?: string
        hasData?: boolean
        impact?: AccountDeleteImpact
      } | null
      if (response.status === 409 && payload?.hasData) {
        setDeleteImpact(payload.impact ?? null)
        setShowDeleteDialog(true)
        closeDeleteDialog = false
        return
      }
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to delete account")
      }
      toast.success("Account deleted")
      const supabase = createClient()
      await supabase.auth.signOut({ scope: "global" })
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to delete account"
      toast.error(message)
    } finally {
      setDeletingAccount(false)
      if (closeDeleteDialog) {
        setShowDeleteDialog(false)
        setDeleteConfirmText("")
        setDeleteImpact(null)
      }
    }
  }

  const handleDeleteClick = async () => {
    if (!user?.id) return
    setDeleteConfirmText("")
    setDeleteImpact(null)
    setDeleteCheckLoading(true)
    try {
      const response = await fetchWithAuth("/api/account/delete", { cache: "no-store" })
      const payload = await response.json().catch(() => null) as {
        message?: string
        hasData?: boolean
        impact?: AccountDeleteImpact
      } | null
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to verify account data")
      }
      if (!payload?.hasData) {
        await handleDeleteAccount(false)
        return
      }
      setDeleteImpact(payload.impact ?? null)
      setShowDeleteDialog(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to verify account data"
      toast.error(message)
    } finally {
      setDeleteCheckLoading(false)
    }
  }

  const handleDeleteWorkspace = async () => {
    if (!user?.id) return
    setDeletingWorkspace(true)
    try {
      const response = await fetchWithAuth("/api/workspaces/delete", {
        method: "POST",
      })
      const data = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) {
        throw new Error(data?.message || "Failed to delete workspace")
      }
      toast.success("Workspace deleted.")
      setShowDeleteWorkspaceDialog(false)
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("onvera:workspace")
        window.localStorage.removeItem("onvera:ownsWorkspace")
        window.dispatchEvent(new Event("workspace:changed"))
      }
      await refreshProfile()
      setShowDeleteDialog(false)
      setShowResetDialog(false)
      onOpenChange(false)
      setShowWorkspaceRefreshPrompt(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete workspace."
      toast.error(message)
    } finally {
      setDeletingWorkspace(false)
    }
  }

  const handleResetAccount = async () => {
    if (!user?.id) return
    setResettingAccount(true)
    try {
      const response = await fetchWithAuth("/api/account/reset", {
        method: "POST",
      })
      const payload = await response.json().catch(() => null) as { message?: string } | null
      if (!response.ok) {
        throw new Error(payload?.message || "Failed to reset account data")
      }
      toast.success("Account data reset")
      setShowResetDialog(false)
      if (typeof window !== "undefined") {
        window.location.reload()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to reset account"
      toast.error(message)
    } finally {
      setResettingAccount(false)
    }
  }

  useEffect(() => {
    if (!showResetDialog) {
      if (resetTimerRef.current !== null) {
        window.clearInterval(resetTimerRef.current)
        resetTimerRef.current = null
      }
      setResetCountdown(15)
      return
    }

    setResetCountdown(15)
    resetTimerRef.current = window.setInterval(() => {
      setResetCountdown((prev) => {
        if (prev <= 1) {
          if (resetTimerRef.current !== null) {
            window.clearInterval(resetTimerRef.current)
            resetTimerRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (resetTimerRef.current !== null) {
        window.clearInterval(resetTimerRef.current)
        resetTimerRef.current = null
      }
    }
  }, [showResetDialog])

  const handleOpenResetDialog = () => {
    onOpenChange(false)
    if (resetOpenTimeoutRef.current !== null) {
      window.clearTimeout(resetOpenTimeoutRef.current)
      resetOpenTimeoutRef.current = null
    }
    setShowResetDialog(true)
  }

  const handleChooseAvatarFile = () => {
    avatarInputRef.current?.click()
  }

  const handleUploadAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      const message = "Please upload an image file."
      toast.error(message)
      return
    }

    setUploadingAvatar(true)
    const toastId = toast.loading("Uploading avatar...")

    try {
      const formData = new FormData()
      formData.set("file", file)

      const response = await fetchWithAuth("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; url?: string } | null
      if (!response.ok || !payload?.url) {
        const message = payload?.message || "Unable to upload avatar."
        toast.error(message, { id: toastId })
        return
      }

      setAvatarUrl(payload.url)
      setAvatarRemoved(false)
      toast.success("Avatar uploaded. Save to apply.", { id: toastId })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to upload avatar."
      toast.error(message, { id: toastId })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl("")
    setAvatarRemoved(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Account Settings</DialogTitle>
            <DialogDescription>Manage your profile and security settings.</DialogDescription>
          </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="bg-violet-50 p-2 rounded-lg gap-2 h-auto! dark:bg-violet-500/20" variant="default">
              <TabsTrigger className="rounded-sm font-normal cursor-pointer data-[state=active]:bg-violet-500 data-[state=active]:text-white dark:data-[state=active]:bg-violet-400 dark:data-[state=active]:text-white" value="profile">
                Profile
              </TabsTrigger>
              <TabsTrigger className="rounded-sm font-normal cursor-pointer data-[state=active]:bg-violet-500 data-[state=active]:text-white dark:data-[state=active]:bg-violet-400 dark:data-[state=active]:text-white" value="security">
                Security
              </TabsTrigger>
            </TabsList>

            {null}
          </div>

          <TabsContent value="profile" className="py-5">
            <FieldGroup>
              <div className="rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-5 space-y-3 text-sm text-priamry dark:text-white">
                <Field>
                  <FieldLabel htmlFor="full-name">Full Name</FieldLabel>
                  <Input
                    id="full-name"
                    value={fullName}
                    className="bg-white"
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" value={user?.email || ""} readOnly disabled />
                </Field>
              </div>

              {/* <Separator /> */}

              <div className="flex items-center gap-5 rounded-lg bg-zinc-100 dark:bg-zinc-800/50 pr-5 text-sm text-priamry dark:text-white">

                <Field className="w-auto">
                  <div className="border-r p-5">
                    {/* <FieldLabel>Avatar</FieldLabel> */}
                    <Avatar className="h-[72px] w-[72px] rounded-2xl">
                      {hasAvatar ? <AvatarImage src={avatarSrc} alt={fullName || "User"} /> : null}
                      {!hasAvatar ? (
                        <span className="absolute inset-0 flex items-center justify-center rounded-2xl font-medium text-2xl text-black bg-blue-100 dark:bg-blue-500/20 dark:text-blue-100">
                          {avatarInitial || "U"}
                        </span>
                      ) : null}
                      <AvatarFallback className={`rounded-2xl font-medium text-2xl ${getAvatarColor(avatarInitial)}`}>
                        {avatarInitial || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        if (file) {
                          void handleUploadAvatarFile(file)
                        }
                        event.currentTarget.value = ""
                      }}
                    />
                    <TooltipProvider delayDuration={200}>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="gradient"
                              size="icon"
                              className="rounded-full w-8 h-8"
                              onClick={handleChooseAvatarFile}
                              disabled={uploadingAvatar}
                            >
                              {uploadingAvatar ? <Spinner /> : hasAvatar ? <UserPen /> : <UserRoundPen />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            {uploadingAvatar ? <Spinner /> : hasAvatar ? "Change avatar" : "Upload avatar"}
                          </TooltipContent>
                        </Tooltip>
                        {hasAvatar ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="destructiveLight" size="icon" className="rounded-full w-8 h-8 border border-destructive" onClick={handleRemoveAvatar}>
                                <X />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">Remove avatar</TooltipContent>
                          </Tooltip>
                        ) : null}
                      </div>
                    </TooltipProvider>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="avatar-url">Avatar URL</FieldLabel>
                  <Input
                    id="avatar-url"
                    value={avatarUrl}
                    onChange={(event) => {
                      const nextValue = event.target.value
                      setAvatarUrl(nextValue)
                      if (nextValue.trim()) {
                        setAvatarRemoved(false)
                      }
                    }}
                    className="bg-white"
                    placeholder="https://example.com/avatar.png"
                  />
                </Field>
              </div>              

              <div className="flex justify-end">
                <div className="flex gap-2">
                  <Button type="button" variant="gradient" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="security" className="py-5">
            <FieldGroup>
              <div className="password-change-block rounded-lg bg-zinc-100 dark:bg-zinc-800/50 p-5 space-y-5 text-sm text-priamry  dark:text-white">
                <Field>
                  <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                  <PasswordInput
                    id="new-password"
                    value={newPassword}
                    className="bg-white"
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 8 characters"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
                  <PasswordInput
                    id="confirm-password"
                    value={confirmPassword}
                    className="bg-white"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter new password"
                  />
                </Field>

                <div className="flex justify-end">
                  <Button type="button" size="sm" variant="gradient" className="text-xs" onClick={handleSavePassword} disabled={savingPassword}>
                    {savingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </div>

              {canResetAccount ? (
                <>
                  {/* <Separator /> */}
                  <div className="flex items-end justify-between gap-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    <div className="reset-left">
                      <p className="font-medium">Reset account data</p>
                      <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">
                        This removes your projects, teams, templates, and onboarding tokens. Your login stays active.
                      </p>
                    </div>
                      <div className="flex flex-col items-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={handleOpenResetDialog}
                          disabled={resettingAccount || resetStatusLoading || !resetHasData}
                        >
                          Reset account
                        </Button>
                        {!resetStatusLoading && !resetHasData ? (
                          <p className="text-[11px] text-amber-700/80 dark:text-amber-200/80 mt-2">
                            No account data to reset.
                          </p>
                        ) : null}
                      </div>
                  </div>
                </>
              ) : null}

              {canDeleteAccount ? (
                <>
                  {/* <Separator /> */}
                  <div className="flex items-end justify-between gap-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    <div className="delete-left">
                      <p className="font-medium">Delete account</p>
                      <p className="mt-1 text-xs text-red-600/80 dark:text-red-200/80">
                        This will permanently delete your account and all associated data.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      onClick={() => void handleDeleteClick()}
                      disabled={deletingAccount || deleteCheckLoading}
                    >
                      {deleteCheckLoading ? "Checking..." : "Delete account"}
                    </Button>
                  </div>
                </>
              ) : null}

              {canDeleteWorkspace ? (
                <>
                  <div className="flex items-end justify-between gap-10 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                    <div className="delete-left">
                      <p className="font-medium">Delete workspace</p>
                      <p className="mt-1 text-xs text-red-600/80 dark:text-red-200/80">
                        Removes your workspace data and switches your account back to a collaborator-only account.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="text-xs"
                      onClick={() => setShowDeleteWorkspaceDialog(true)}
                      disabled={deletingWorkspace}
                    >
                      Delete workspace
                    </Button>
                  </div>
                </>
              ) : null}
            </FieldGroup>
          </TabsContent>
        </Tabs>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account and all related access?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is permanent. You will lose your workspace data and access to all related teams and projects.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {deleteImpact ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
                <p className="font-medium">This account currently has associated data/access:</p>
                <p className="mt-1">
                  Projects owned: {deleteImpact.ownedProjects} | Teams owned: {deleteImpact.ownedTeams} | Templates
                  owned: {deleteImpact.ownedTemplates}
                </p>
                <p className="mt-1">
                  Team memberships: {deleteImpact.teamMemberships} | Project memberships: {deleteImpact.projectMemberships}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Type <span className="font-semibold text-destructive">{user?.email || "your email"}</span> to confirm.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void handleDeleteAccount(true)}
                disabled={
                  deletingAccount ||
                  !deleteConfirmEmail ||
                  deleteConfirmText.trim().toLowerCase() !== deleteConfirmEmail
                }
              >
                {deletingAccount ? "Deleting..." : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      <AlertDialog open={showDeleteWorkspaceDialog} onOpenChange={setShowDeleteWorkspaceDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete your workspace projects, teams, templates, and onboarding tokens. You will remain
                an invited collaborator only.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Type <span className="font-semibold text-destructive">{user?.email || "your email"}</span> to confirm.
              </p>
              <Input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingWorkspace}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => void handleDeleteWorkspace()}
                disabled={
                  deletingWorkspace ||
                  !deleteConfirmEmail ||
                  deleteConfirmText.trim().toLowerCase() !== deleteConfirmEmail
                }
              >
                {deletingWorkspace ? "Deleting..." : "Delete workspace"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>

      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset your account data?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete your projects, teams, templates, and onboarding tokens. Your login and profile stay active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Please wait <span className="font-semibold text-destructive">{resetCountdown}s</span> before confirming.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resettingAccount}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => void handleResetAccount()}
              disabled={resettingAccount || resetCountdown > 0 || !resetHasData}
            >
              {resettingAccount ? "Resetting..." : "Reset data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showWorkspaceRefreshPrompt} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                <RefreshCw className="h-4 w-4" />
              </span>
              Refresh to update your workspace
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="pb-5">
            Your workspace was removed. Refresh once to update your access and workspace list.
          </DialogDescription>
          <DialogFooter>
            <Button
              size="sm"
              variant="gradient"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.setItem("onvera:post-refresh", "/projects")
                  window.location.reload()
                }
              }}
            >
              Refresh now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
