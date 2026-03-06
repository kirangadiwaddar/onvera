import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/* =========================
   GET PROJECTS
========================= */

export async function GET(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const { searchParams } = new URL(req.url)

  const status = searchParams.get("status")
  const limitParam = searchParams.get("limit")

 /* =========================
   MEMBER PROJECTS
========================= */

if (profile?.role === "member") {

  // get teams where the logged user belongs
  const { data: memberTeams } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("user_id", user.id)

  const teamIds = memberTeams?.map(t => t.team_id) || []

  if (!teamIds.length) {
    return NextResponse.json([])
  }

  // get project ids attached to those teams
  const { data: links } = await supabase
    .from("project_teams")
    .select("project_id")
    .in("team_id", teamIds)

  const projectIds = links?.map(p => p.project_id) || []

  if (!projectIds.length) {
    return NextResponse.json([])
  }

  // now fetch projects normally
  const { data, error } = await supabase
    .from("projects")
    .select(`
      *,
      template:templates ( id, title ),
      project_members ( id, name, avatar_src, role ),
      project_teams (
        teams (
          id,
          name
        )
      )
    `)
    .in("id", projectIds)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Member project fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data ?? []).map((p: any) => ({
    ...p,
    members: [
      ...(p.project_members ?? []),
      ...(p.project_teams ?? []).map((pt: any) => ({
        id: `team-${pt.teams.id}`,
        name: pt.teams.name,
        avatar_src: pt.teams.avatar_src
      }))
    ]
  }))

  return NextResponse.json(projects)
}

  /* =========================
     OWNER PROJECTS
  ========================= */

  let query = supabase
    .from("projects")
    .select(`
      *,
      template:templates ( id, title ),
      project_members ( id, name, avatar_src, role ),
      project_teams (
        teams (
          id,
          name
        )
      )
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  if (limitParam) {
    query = query.limit(Number(limitParam))
  }

  const { data, error } = await query

  if (error) {
    console.error("Projects fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projects = (data ?? []).map((p: any) => ({
    ...p,
    members: [
      ...(p.project_members ?? []),
      ...(p.project_teams ?? []).map((pt: any) => ({
        id: `team-${pt.teams.id}`,
        name: pt.teams.name,
        avatar_src: pt.teams.avatar_src
      }))
    ]
  }))

  return NextResponse.json(projects)
}


/* =========================
   CREATE PROJECT
========================= */

export async function POST(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  const { title, template_id, avatar_src, status, team_id } = body

  if (!title || !template_id) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")

  /* CREATE PROJECT */

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      title,
      slug,
      template_id,
      avatar_src,
      status: status ?? "waiting",
      owner_id: user.id
    })
    .select(`
      *,
      template:templates ( id, title )
    `)
    .single()

  if (error) {
    console.error("Project create error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  /* ATTACH TEAM IF PROVIDED */

  if (team_id) {

    const { error: teamError } = await supabase
      .from("project_teams")
      .insert({
        project_id: project.id,
        team_id
      })

    if (teamError) {
      console.error("Team attach error:", teamError)
    }

  }

  return NextResponse.json(project)
}


/* =========================
   UPDATE PROJECT
========================= */

export async function PATCH(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  const body = await req.json()

  const { id, title, template_id, avatar_src, team_id } = body

  if (!id) {
    return NextResponse.json(
      { error: "Project id required" },
      { status: 400 }
    )
  }

  /* =========================
     ADD TEAM TO PROJECT
  ========================= */

  if (team_id) {

    const { error: teamError } = await supabase
      .from("project_teams")
      .insert({
        project_id: id,
        team_id
      })

    if (teamError) {

      console.error("Add team error:", teamError)

      return NextResponse.json(
        { error: teamError.message },
        { status: 500 }
      )

    }

    return NextResponse.json({ success: true })
  }

  /* =========================
     UPDATE PROJECT
  ========================= */

  const { data, error } = await supabase
    .from("projects")
    .update({
      title,
      template_id,
      avatar_src
    })
    .eq("id", id)
    .eq("owner_id", user.id)
    .select(`
      *,
      template:templates ( id, title ),
      project_members (
        id,
        name,
        avatar_src,
        role,
        is_external
      ),
      project_teams (
        teams (
          id,
          name
        )
      )
    `)
    .single()

  if (error) {

    console.error("Project update error:", error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )

  }

  return NextResponse.json(data)

}


/* =========================
   DELETE PROJECT
========================= */

export async function DELETE(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  const { id } = body

  if (!id) {
    return NextResponse.json(
      { error: "Project id required" },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)   // only delete own projects

  if (error) {
    console.error("Delete project error:", error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    id,
  })
}