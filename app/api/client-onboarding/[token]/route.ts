import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  context: { params: Promise<{ token: string }> }
) {

  const supabase = await createClient()

  const { token } = await context.params

  if (!token) {
    return NextResponse.json(
      { error: "Missing token" },
      { status: 400 }
    )
  }

  /* -------------------------
     FETCH PROJECT BY TOKEN
  -------------------------- */

  const { data: project, error } = await supabase
    .from("projects")
    .select(`
      id,
      title,
      slug,
      template_id,
      created_at,
      updated_at,
      submissions,
      custom_sections,
      client_password,
      client_link_enabled,
      client_link_expires_at,

      teams:project_teams (
        team:teams (
          id,
          name,
          avatar_src
        )
      ),

      members:project_members (
        id,
        name,
        team_role,
        avatar_src,
        is_external
      )
    `)
    .eq("client_token", token)
    .maybeSingle()

  if (error) {

    console.error("Client onboarding error:", error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )

  }

  if (!project) {

    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    )

  }

  /* -------------------------
     SECURITY CHECKS
  -------------------------- */

  if (!project.client_link_enabled) {

    return NextResponse.json(
      { error: "Client link disabled" },
      { status: 403 }
    )

  }

  if (
    project.client_link_expires_at &&
    new Date(project.client_link_expires_at) < new Date()
  ) {

    return NextResponse.json(
      { error: "Client link expired" },
      { status: 403 }
    )

  }

  /* -------------------------
     FETCH TEAM MEMBERS
  -------------------------- */

  const teamsWithMembers = await Promise.all(

    (project.teams || []).map(async (t: any) => {

      const team = t.team

      if (!team?.id) return null

      const { data: members } = await supabase
        .from("team_members")
        .select(`
          id,
          name,
          team_role,
          designation
        `)
        .eq("team_id", team.id)

      return {
        ...team,
        members: members || []
      }

    })

  )

  /* -------------------------
     FINAL RESPONSE
  -------------------------- */

  return NextResponse.json({
    ...project,
    teams: teamsWithMembers.filter(Boolean)
  })

}