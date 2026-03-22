import { NextResponse } from "next/server"
import { resolveInviteByToken } from "@/lib/invitations/resolve-invite"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")?.trim()

  if (!token) {
    return NextResponse.json({ message: "Missing invite token" }, { status: 400 })
  }

  const invite = await resolveInviteByToken(token)
  if (!invite) {
    return NextResponse.json({ message: "Invite not found" }, { status: 404 })
  }

  return NextResponse.json({
    invite: {
      contextType: invite.contextType,
      contextName: invite.contextName,
      contextSlug: invite.contextSlug,
      memberRole: invite.memberRole,
      email: invite.member.email ?? null,
      name: invite.member.name ?? null,
      isLead: invite.memberLocation === "team_lead",
    },
  })
}
