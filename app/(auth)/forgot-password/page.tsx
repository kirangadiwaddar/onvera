"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { createClient } from "@/lib/supabase/client"
import { hasSupabaseEnv } from "@/lib/supabase/env"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [confirmEmail, setConfirmEmail] = useState("")
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const suggestEmail = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    const match = trimmed.match(/^([^@]+)@([^@]+)$/)
    if (!match) return null
    const [, local, domain] = match
    const domainMap: Record<string, string> = {
      "gmal.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gmai.com": "gmail.com",
      "gmail.con": "gmail.com",
      "hotnail.com": "hotmail.com",
      "hotmai.com": "hotmail.com",
      "outlok.com": "outlook.com",
      "yaho.com": "yahoo.com",
      "yahho.com": "yahoo.com",
      "icloud.con": "icloud.com",
    }
    const corrected = domainMap[domain]
    if (!corrected) return null
    return `${local}@${corrected}`
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!hasSupabaseEnv()) {
      setError("Supabase environment variables are not configured")
      return
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      if (email.trim().toLowerCase() !== confirmEmail.trim().toLowerCase()) {
        setError("Emails do not match.")
        return
      }

      const supabase = createClient()
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

      if (resetError) {
        throw resetError
      }

      setSuccess("Check your inbox for a password reset link.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-medium">Forgot your password?</h1>
          <p className="text-muted-foreground text-xs text-balance mt-2">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="eg. email@example.com"
            value={email}
            onChange={(event) => {
              const nextValue = event.target.value
              setEmail(nextValue)
              setSuggestion(suggestEmail(nextValue))
            }}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirm-email">Confirm Email</FieldLabel>
          <Input
            id="confirm-email"
            name="confirm-email"
            type="email"
            placeholder="Re-enter your email address"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            required
          />
        </Field>
        {suggestion ? (
          <p className="text-xs text-muted-foreground">
            Did you mean{" "}
            <button
              type="button"
              className="text-primary font-medium underline-offset-4 hover:underline"
              onClick={() => {
                setEmail(suggestion)
                setConfirmEmail(suggestion)
                setSuggestion(null)
              }}
            >
              {suggestion}
            </button>
            ?
          </p>
        ) : null}
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-emerald-600">{success}</p>}
        <Field>
          <Button type="submit" variant="gradient" size="lg" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Remembered your password?{" "}
            <Link href="/login" className="text-primary cursor-pointer font-medium no-underline!">
              Back to login
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
