"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { fetchWithAuth } from "@/lib/auth/client-fetch"
import { toast } from "sonner"
import { Separator } from "../ui/separator"
import { CircleX, UserPen, UserRoundPen, X } from "lucide-react"
import { Spinner } from "../ui/spinner"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
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
  const [error, setError] = useState<string | null>(null)
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
    setNewPassword("")
    setConfirmPassword("")
    setError(null)
  }, [displayInitial.initialAvatar, displayInitial.initialName, open])

  const trimmedAvatarUrl = avatarUrl.trim()
  const hasAvatar = trimmedAvatarUrl.length > 0
  const avatarSrc = hasAvatar ? trimmedAvatarUrl : undefined

  const persistProfileData = async (name: string, avatar: string) => {
    if (!user?.id) {
      throw new Error("You must be signed in to update account settings.")
    }

    const supabase = createClient()
    const fallbackRole =
      profile?.role ||
      (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
      "agency"

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
      setError(message)
      toast.error(message)
      return
    }

    setSavingProfile(true)
    setError(null)

    try {
      await persistProfileData(trimmedFullName, avatarUrl.trim())
      await refreshProfile()
      toast.success("Profile details updated.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update profile details."
      setError(message)
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
      setError(message)
      toast.error(message)
      return
    }

    setSavingAvatar(true)
    setError(null)

    try {
      await persistProfileData(trimmedFullName, trimmedAvatarUrl)
      await refreshProfile()
      toast.success(trimmedAvatarUrl ? "Avatar updated." : "Avatar removed.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update avatar."
      setError(message)
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
      setError(message)
      toast.error(message)
      return
    }

    if (trimmedPassword.length < 8) {
      const message = "New password must be at least 8 characters."
      setError(message)
      toast.error(message)
      return
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      const message = "Password confirmation does not match."
      setError(message)
      toast.error(message)
      return
    }

    setSavingPassword(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: passwordError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      })

      if (passwordError) {
        setError(passwordError.message)
        toast.error(passwordError.message)
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password updated.")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to update password."
      setError(message)
      toast.error(message)
    } finally {
      setSavingPassword(false)
    }
  }

  const handleChooseAvatarFile = () => {
    avatarInputRef.current?.click()
  }

  const handleUploadAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      const message = "Please upload an image file."
      setError(message)
      toast.error(message)
      return
    }

    setUploadingAvatar(true)
    setError(null)
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
        setError(message)
        toast.error(message, { id: toastId })
        return
      }

      setAvatarUrl(payload.url)
      toast.success("Avatar uploaded. Save to apply.", { id: toastId })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to upload avatar."
      setError(message)
      toast.error(message, { id: toastId })
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleRemoveAvatar = () => {
    setAvatarUrl("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>Manage your profile and security settings.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-violet-50 p-2 rounded-lg gap-2 h-auto! dark:bg-violet-500/20" variant="default">
            <TabsTrigger className="rounded-sm data-[state=active]:bg-violet-500 data-[state=active]:text-white dark:data-[state=active]:bg-violet-400 dark:data-[state=active]:text-white" value="profile">
              Profile
            </TabsTrigger>
            <TabsTrigger className="rounded-sm data-[state=active]:bg-violet-500 data-[state=active]:text-white dark:data-[state=active]:bg-violet-400 dark:data-[state=active]:text-white" value="security">
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="py-5">
            <FieldGroup>
              <div className="flex items-center gap-5">
                <Field>
                  <FieldLabel htmlFor="full-name">Full Name</FieldLabel>
                  <Input
                    id="full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your full name"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input id="email" type="email" value={user?.email || ""} readOnly disabled />
                </Field>
              </div>

              <Separator />

              <div className="flex items-end gap-5">

                <Field className="w-auto">
                  <FieldLabel>Avatar</FieldLabel>
                  <div className="flex items-center gap-2 border-r pr-5">
                  <Avatar className="h-18 w-18 rounded-2xl">
                    <AvatarImage src={avatarSrc} alt={fullName || "User"} />
                      <AvatarFallback className="rounded-2xl font-medium text-2xl text-black bg-blue-100 dark:bg-blue-500/20 dark:text-blue-100">
                        {(fullName || user?.email || "U").charAt(0).toUpperCase()}
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
                      <div className="space-y-2">
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
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    placeholder="https://example.com/avatar.png"
                  />
                </Field>
              </div>

              <div className="flex justify-end">
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={handleSaveAvatar} disabled={savingAvatar}>
                    {savingAvatar ? "Saving..." : "Save Avatar"}
                  </Button>
                  <Button type="button" variant="gradient" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </div>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="security" className="py-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="new-password">New Password</FieldLabel>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter new password"
                />
              </Field>

              <div className="flex justify-end">
                <Button type="button" variant="gradient" onClick={handleSavePassword} disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </FieldGroup>
          </TabsContent>
        </Tabs>

        {/* {error ? <p className="text-xs text-red-600">{error}</p> : null} */}
      </DialogContent>
    </Dialog>
  )
}
