import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { render } from "@react-email/render"
import { ClientAccessEmail } from "@/components/emails/client-access-email"

function isAdminRole(role?: string | null) {
  return role === "super_admin" || role === "team_lead"
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
  const html = render(
    ClientAccessEmail({
      url,
      password,
    }),
  )
  const text = render(
    ClientAccessEmail({
      url,
      password,
    }),
    { plainText: true },
  )

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
      text,
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
