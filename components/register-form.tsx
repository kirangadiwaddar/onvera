"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { USER_ROLE_LABELS, getDefaultPathForRole, isUserRole, type UserRole } from "@/lib/auth/roles"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const publicRoles = ["agency", "freelancer"] as const
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const inviteRoleParam = searchParams.get("role")
  const inviteRole =
    inviteRoleParam && isUserRole(inviteRoleParam) &&
    (inviteRoleParam === "project_member" || inviteRoleParam === "team_member")
      ? inviteRoleParam
      : null

  useEffect(() => {
    if (typeof window === "undefined") return
    const hash = window.location.hash?.replace(/^#/, "") || ""
    const params = new URLSearchParams(hash)
    const token = params.get("inviteToken")
    setInviteToken(token && token.trim() ? token.trim() : null)
  }, [])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasSupabaseEnv()) {
      setError("Supabase environment variables are not configured")
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    const formData = new FormData(event.currentTarget)
    const fullName = String(formData.get("fullname") ?? "")
    const email = String(formData.get("email") ?? "")
    const password = String(formData.get("password") ?? "")
    const confirmPassword = String(formData.get("confirm-password") ?? "")
    const formRole = String(formData.get("role") ?? "") as UserRole
    const role = (inviteRole || formRole || "agency") as UserRole

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: fullName,
            role,
          },
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user?.id) {
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName,
          role,
        })
      }

      if (!data.session) {
        setSuccess("Account created. Check your email to verify your account.")
        return
      }

      router.replace(getDefaultPathForRole(role))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props} onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-medium">Register for an account</h1>
          <p className="text-muted-foreground text-xs text-balance mt-2">
            Enter your details to create a new account.
          </p>
        </div>
        {/* <FieldSeparator></FieldSeparator> */}
        <Field>
          <FieldLabel htmlFor="fullname">Full Name</FieldLabel>
          <Input id="fullname" name="fullname" type="text" placeholder="Write your full name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" placeholder="Write your email address" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="role">Role</FieldLabel>
          {inviteRole ? (
            <>
              <Input
                id="role"
                name="role"
                value={inviteRole}
                readOnly
                className="hidden"
              />
              <div className="border-input w-full rounded-md border bg-muted/40 px-3 py-2 text-sm">
                {USER_ROLE_LABELS[inviteRole]}
              </div>
            </>
          ) : (
            <select
              id="role"
              name="role"
              required
              defaultValue={publicRoles[0]}
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
            >
              {publicRoles.map((role) => (
                <option key={role} value={role}>
                  {USER_ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          )}
        </Field>
        {inviteToken && (
          <Field>
            <FieldLabel htmlFor="inviteToken">Invite Token</FieldLabel>
            <Input id="inviteToken" name="inviteToken" type="text" value={inviteToken} readOnly />
          </Field>
        )}
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <PasswordInput id="password" name="password" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          </div>
          <PasswordInput id="confirm-password" name="confirm-password" required />
        </Field>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600">{success}</p>}
        <Field>
          <Button type="submit" variant="gradient" size="lg" disabled={loading}>
            {loading ? "Creating account..." : "Register"} <ArrowRight />
          </Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium no-underline!">
              Login
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
