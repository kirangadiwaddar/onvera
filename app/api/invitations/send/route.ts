import { NextResponse } from "next/server"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"
import { render } from "@react-email/render"
import { InviteEmail } from "@/components/emails/invite-email"

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
        name?: string
        memberRole?: "project_member" | "team_member"
        token?: string
        contextName?: string
        contextType?: "project" | "team"
      }
    | null

  const email = body?.email?.trim().toLowerCase()
  const name = body?.name?.trim() || "Member"
  const memberRole = body?.memberRole
  const token = body?.token?.trim()
  const contextName = body?.contextName?.trim() || "Onvera"
  const contextType = body?.contextType || "project"

  if (!email || !memberRole || !token) {
    return NextResponse.json({ message: "Missing invite payload" }, { status: 400 })
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

  const origin = new URL(request.url).origin
  const inviteUrl = `${origin}/invite?token=${encodeURIComponent(token)}`

  const subject = `You're invited to ${contextType === "team" ? "team" : "project"}: ${contextName}`
  const html = render(
    InviteEmail({
      name,
      inviteUrl,
      memberRole,
      contextName,
      contextType,
    }),
  )
  const text = render(
    InviteEmail({
      name,
      inviteUrl,
      memberRole,
      contextName,
      contextType,
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
        message: data?.message || "Failed to send invite email",
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ sent: true })
}
