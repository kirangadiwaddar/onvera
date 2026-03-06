import { requireAgency } from "@/lib/require-agency"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: { slug: string } }
) {

  const supabase = await createClient()

  /* AUTH USER */

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    )
  }

  /* GET SLUG */

  let slug = params?.slug

  // fallback if params fails
  if (!slug) {
    const url = new URL(req.url)
    slug = url.pathname.split("/").pop() || ""
  }

  if (!slug) {
    return NextResponse.json(
      { error: "Missing slug" },
      { status: 400 }
    )
  }

  console.log("Team slug:", slug)

  /* FETCH TEAM */

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("slug", slug)
    .maybeSingle()

  if (teamError) {
    console.error("Team fetch error:", teamError)

    return NextResponse.json(
      { error: teamError.message },
      { status: 500 }
    )
  }

  if (!team) {
    return NextResponse.json(
      { error: "Team not found", slug },
      { status: 404 }
    )
  }

  /* TEAM MEMBERS */

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("*")
    .eq("team_id", team.id)

  if (membersError) {
    console.error("Team members fetch error:", membersError)
  }

  /* -------------------------
   FETCH PROJECTS ATTACHED TO TEAM
-------------------------- */

const { data: projectLinks, error: projectsError } = await supabase
  .from("project_teams")
  .select(`
    project:projects (
      id,
      slug,
      title,
      status,
      created_at,
      avatar_src,
      template_id
    )
  `)
  .eq("team_id", team.id)

if (projectsError) {
  console.error("Team projects fetch error:", projectsError)
}
const auth = await requireAgency()

const projects = projectLinks?.map(p => p.project) ?? []

  return NextResponse.json({
    team,
    members: members ?? [],
    projects: projects ?? [],
  })
}