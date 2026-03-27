import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

function isAdminRole(role?: string | null) {
  return role === "agency" || role === "freelancer" || role === "admin"
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  if (!isAdminRole(identity.role)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as
    | {
        email?: string
        url?: string
        password?: string
        projectSlug?: string
      }
    | null

  const email = body?.email?.trim().toLowerCase()
  const url = body?.url?.trim()
  const password = body?.password?.trim()

  if (!email || !url) {
    return NextResponse.json({ message: "Missing email or link" }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.INVITE_FROM_EMAIL

  if (!resendKey || !fromEmail) {
    return NextResponse.json(
      {
        sent: false,
        message: "Email service is not configured. Set RESEND_API_KEY and INVITE_FROM_EMAIL.",
      },
      { status: 200 },
    )
  }

  const subject = "Your Client Access Link"
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Client Access</h2>
      <p>Hi,</p>
      <p>Here is your onboarding link:</p>
      <p><a href="${url}">${url}</a></p>
      <p>Password: <strong>${password || "Not required"}</strong></p>
      <p>If you have any questions, just reply to this email.</p>
    </div>
  `

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [email],
      subject,
      html,
    }),
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    return NextResponse.json(
      {
        sent: false,
        message: data?.message || "Failed to send email",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ sent: true })
}
