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
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"
import { fetchWithAuth } from "@/lib/auth/client-fetch"

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
  const [success, setSuccess] = useState<string | null>(null)
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
    setSuccess(null)
  }, [displayInitial.initialAvatar, displayInitial.initialName, open])

  const hasAvatar = avatarUrl.trim().length > 0

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
      setError("Full name is required.")
      return
    }

    setSavingProfile(true)
    setError(null)
    setSuccess(null)

    try {
      await persistProfileData(trimmedFullName, avatarUrl.trim())
      await refreshProfile()
      setSuccess("Profile details updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update profile details.")
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveAvatar = async () => {
    const trimmedFullName = fullName.trim() || displayInitial.initialName
    const trimmedAvatarUrl = avatarUrl.trim()

    if (trimmedAvatarUrl.length > 2000) {
      setError("Avatar URL is too long.")
      return
    }

    setSavingAvatar(true)
    setError(null)
    setSuccess(null)

    try {
      await persistProfileData(trimmedFullName, trimmedAvatarUrl)
      await refreshProfile()
      setSuccess(trimmedAvatarUrl ? "Avatar updated." : "Avatar removed.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update avatar.")
    } finally {
      setSavingAvatar(false)
    }
  }

  const handleSavePassword = async () => {
    const trimmedPassword = newPassword.trim()
    const trimmedConfirmPassword = confirmPassword.trim()

    if (!trimmedPassword) {
      setError("New password is required.")
      return
    }

    if (trimmedPassword.length < 8) {
      setError("New password must be at least 8 characters.")
      return
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      setError("Password confirmation does not match.")
      return
    }

    setSavingPassword(true)
    setError(null)
    setSuccess(null)

    try {
      const supabase = createClient()
      const { error: passwordError } = await supabase.auth.updateUser({
        password: trimmedPassword,
      })

      if (passwordError) {
        setError(passwordError.message)
        return
      }

      setNewPassword("")
      setConfirmPassword("")
      setSuccess("Password updated.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update password.")
    } finally {
      setSavingPassword(false)
    }
  }

  const handleChooseAvatarFile = () => {
    avatarInputRef.current?.click()
  }

  const handleUploadAvatarFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.")
      return
    }

    setUploadingAvatar(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.set("file", file)

      const response = await fetchWithAuth("/api/uploads/avatar", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json().catch(() => null)) as { message?: string; url?: string } | null
      if (!response.ok || !payload?.url) {
        setError(payload?.message || "Unable to upload avatar.")
        return
      }

      setAvatarUrl(payload.url)
      setSuccess("Avatar uploaded. Save in Avatar tab to apply.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload avatar.")
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
          <DialogDescription>Manage your profile, avatar, and security settings.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full" variant="default">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="avatar">Avatar</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <FieldGroup>
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

              <div className="flex justify-end">
                <Button type="button" onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="avatar">
            <FieldGroup>
              <Field>
                <FieldLabel>Avatar</FieldLabel>
                <div className="flex items-center gap-3 flex-wrap">
                  <Avatar className="h-12 w-12 rounded-full">
                    <AvatarImage src={avatarUrl} alt={fullName || "User"} />
                    <AvatarFallback className="rounded-full font-bold text-black bg-blue-100 dark:bg-blue-500/20 dark:text-blue-100">
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

                  <Button type="button" variant="outline" size="sm" onClick={handleChooseAvatarFile} disabled={uploadingAvatar}>
                    {uploadingAvatar ? "Uploading..." : hasAvatar ? "Change Image" : "Upload Image"}
                  </Button>
                  {hasAvatar ? (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveAvatar}>
                      Remove Image
                    </Button>
                  ) : null}
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

              <div className="flex justify-end">
                <Button type="button" onClick={handleSaveAvatar} disabled={savingAvatar}>
                  {savingAvatar ? "Saving..." : "Save Avatar"}
                </Button>
              </div>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="security">
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
                <Button type="button" onClick={handleSavePassword} disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </FieldGroup>
          </TabsContent>
        </Tabs>

        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        {success ? <p className="text-xs text-green-600">{success}</p> : null}
      </DialogContent>
    </Dialog>
  )
}
