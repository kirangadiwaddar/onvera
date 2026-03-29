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
import { USER_ROLE_LABELS, isUserRole, type UserRole } from "@/lib/auth/roles"
import { hasSupabaseEnv } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/client"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [step, setStep] = useState<"form" | "otp">("form")
  const [pendingEmail, setPendingEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [resendLoading, setResendLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextParam = searchParams.get("next")
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const inviteRoleParam = searchParams.get("role")
  const inviteRole =
    inviteRoleParam && isUserRole(inviteRoleParam) &&
    (inviteRoleParam === "project_member" || inviteRoleParam === "team_member")
      ? inviteRoleParam
      : null

  useEffect(() => {
    if (typeof window === "undefined") return
    const queryToken = searchParams.get("inviteToken")
    if (queryToken && queryToken.trim()) {
      setInviteToken(queryToken.trim())
      return
    }
    const hash = window.location.hash?.replace(/^#/, "") || ""
    const params = new URLSearchParams(hash)
    const token = params.get("inviteToken")
    setInviteToken(token && token.trim() ? token.trim() : null)
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasSupabaseEnv()) {
      setError("Supabase environment variables are not configured")
      return
    }
    setLoading(true)
    setError(null)
    setSuccess(null)

    const role = (inviteRole || "super_admin") as UserRole

    try {
      const supabase = createClient()
      if (step === "form") {
        if (password !== confirmPassword) {
          setError("Passwords do not match")
          setLoading(false)
          return
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName,
              role,
              plan: "free",
            },
          },
        })

      if (signUpError) {
        if (signUpError.message.toLowerCase().includes("rate limit")) {
          setError("Too many attempts. Please wait a couple of minutes and try again.")
        } else {
          setError(signUpError.message)
        }
        return
      }

        setPendingEmail(email.trim())
        setOtpCode("")
        setStep("otp")
        setSuccess("Account created. Enter the one-time code sent to your email to verify.")
        return
      }

      if (!pendingEmail) {
        setError("Missing email for verification. Please register again.")
        setStep("form")
        return
      }

      if (otpCode.trim().length !== 8) {
        setError("Enter the 8-digit verification code.")
        setLoading(false)
        return
      }

      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otpCode.trim(),
        type: "signup",
      })

      if (verifyError) {
        if (verifyError.message.toLowerCase().includes("rate limit")) {
          setError("Too many attempts. Please wait a couple of minutes and try again.")
        } else {
          setError(verifyError.message)
        }
        return
      }

      if (verifyData.user?.id) {
        await supabase.from("profiles").upsert({
          id: verifyData.user.id,
          full_name: fullName,
          role,
          plan: "free",
        })
      }

      await supabase.auth.signOut()
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("suppress-auth-redirect")
      }
      toast.success("Account verified. Redirecting to login...")
      window.setTimeout(() => {
        const next = nextParam && nextParam.startsWith("/") ? `?next=${encodeURIComponent(nextParam)}` : ""
        router.replace(`/login${next}`)
      }, 700)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register")
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!hasSupabaseEnv()) {
      setError("Supabase environment variables are not configured")
      return
    }
    if (!pendingEmail) {
      setError("Missing email for verification. Please register again.")
      setStep("form")
      return
    }
    try {
      setResendLoading(true)
      setError(null)
      setSuccess(null)
      const supabase = createClient()
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pendingEmail,
      })
      if (resendError) {
        if (resendError.message.toLowerCase().includes("rate limit")) {
          setError("Too many attempts. Please wait a couple of minutes and try again.")
        } else {
          setError(resendError.message)
        }
        return
      }
      setSuccess("Verification code resent. Please check your inbox.")
      setResendCooldown(30)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resend code")
    } finally {
      setResendLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return
    if (step === "otp") {
      window.sessionStorage.setItem("suppress-auth-redirect", "1")
      setResendCooldown(30)
    } else {
      window.sessionStorage.removeItem("suppress-auth-redirect")
    }
  }, [step])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

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
        {step === "form" ? (
          <>
            <Field>
              <FieldLabel htmlFor="fullname">Full Name</FieldLabel>
              <Input
                id="fullname"
                name="fullname"
                type="text"
                placeholder="Write your full name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Write your email address"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Field>
            {inviteRole ? (
              <Field>
                <FieldLabel htmlFor="role">Role</FieldLabel>
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
              </Field>
            ) : null}
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
              <PasswordInput
                id="password"
                name="password"
                placeholder="Write Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>
            <Field>
              <div className="flex items-center">
                <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
              </div>
              <PasswordInput
                id="confirm-password"
                name="confirm-password"
                placeholder="Write Password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                 required
              />
            </Field>
          </>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="otp" className="w-full justify-center mb-2">Email Verification Code</FieldLabel>

              <div className="mt-2 mb-5 flex items-center justify-center">
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  maxLength={8}
                  onChange={(event) => {
                    const next = event.target.value.replace(/\\D/g, "").slice(0, 8)
                    setOtpCode(next)
                  }}
                  className="h-12 max-w-[220px] text-center text-lg font-semibold tracking-[0.4em]"
                  placeholder="••••••••"
                  required
                />
              </div>
              <FieldDescription className="mt-3 text-center">
                We sent a one-time code to <span className="font-medium text-primary">{pendingEmail}</span>.
              </FieldDescription>
            </Field>
            <div className="flex items-center justify-between">
              <Button
                variant="secondary"
                className="text-xs font-medium text-violet-700 dark:text-white"
                onClick={handleResendOtp}
                disabled={resendLoading || resendCooldown > 0}
              >
                {resendLoading
                  ? "Resending..."
                  : resendCooldown > 0
                    ? `Resend in ${resendCooldown}s`
                    : "Resend code"}
              </Button>
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => {
                  setStep("form")
                  setError(null)
                  setSuccess(null)
                  if (typeof window !== "undefined") {
                    window.sessionStorage.removeItem("suppress-auth-redirect")
                  }
                }}
              >
                Edit email
              </Button>
            </div>
          </>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-600">{success}</p>}
        <Field>
          <Button
            type="submit"
            variant="gradient"
            size="lg"
            disabled={loading || (step === "otp" && otpCode.trim().length !== 8)}
          >
            {loading
              ? step === "otp"
                ? "Verifying..."
                : "Creating account..."
              : step === "otp"
                ? "Verify email"
                : "Register"}{" "}
            <ArrowRight />
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
