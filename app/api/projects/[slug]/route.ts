import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> }
) {

  try {

    const supabase = await createClient()

    const { slug } = await context.params

    if (!slug) {
      return NextResponse.json(
        { error: "Missing slug" },
        { status: 400 }
      )
    }

    /* -------------------------
       FETCH PROJECT
    -------------------------- */

    const { data: project, error } = await supabase
      .from("projects")
      .select(`
        *,
        activities (
    id,
    title,
    status,
    created_at
  ),
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
          role,
          avatar_src,
          is_external
        )
      `)
      .eq("slug", slug)
      .maybeSingle()

    if (error) {

      console.error("Project fetch error:", error)

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
       AUTO OVERDUE CHECK
    -------------------------- */

    if (
      project.status !== "completed" &&
      project.status !== "onhold" &&
      project.last_client_activity
    ) {

      const lastActivity = new Date(project.last_client_activity)

      const overdueDate = new Date(lastActivity)
      overdueDate.setDate(overdueDate.getDate() + 5)

      if (new Date() > overdueDate && project.status !== "overdue") {

        await supabase
          .from("projects")
          .update({ status: "overdue" })
          .eq("id", project.id)

        project.status = "overdue"

      }

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
          id: team.id,
          name: team.name,
          avatar_src: team.avatar_src,
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

  } catch (err) {

    console.error("API crash:", err)

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    )

  }

}