import { requireAgency } from "@/lib/require-agency"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/* =========================
   GET TEAMS
========================= */

export async function GET() {

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

  /* =========================
     FREELANCER BLOCK
  ========================= */

  if (profile?.role === "freelancer") {
    return NextResponse.json(
      { error: "Freelancers cannot access teams" },
      { status: 403 }
    )
  }

  /* =========================
     MEMBER TEAMS
  ========================= */

  if (profile?.role === "member") {

    const { data, error } = await supabase
      .from("team_members")
      .select(`
        team:teams (
          *,
          members:team_members (
            id,
            name,
            email,
            team_role,
            avatar_src
          )
        )
      `)
      .eq("user_id", user.id)   // recommended change

    if (error) {
      console.error("Member teams fetch error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const teams = (data ?? []).map((t: any) => t.team)

    return NextResponse.json(teams)
  }

  /* =========================
     OWNER TEAMS
  ========================= */

  const { data, error } = await supabase
    .from("teams")
    .select(`
      *,
      members:team_members (
        id,
        name,
        email,
        team_role,
        avatar_src
      )
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Teams fetch error:", error)

    await requireAgency()

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data ?? [])
}


/* =========================
   CREATE TEAM
========================= */

export async function POST(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await requireAgency()

  const body = await req.json()

  const { name, description, members } = body

  if (!name) {
    return NextResponse.json(
      { error: "Team name required" },
      { status: 400 }
    )
  }

  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      name,
      description,
      slug,
      owner_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error("Team create error:", error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  /* INSERT MEMBERS */

  if (members?.length) {

    const { data: users } = await supabase.auth.admin.listUsers()

    const memberRows = members.map((m: any) => {

      const matchedUser = users.users.find(
        (u: any) => u.email === m.email
      )

      return {
        team_id: team.id,
        name: m.name,
        email: m.email,
        role: m.role,
        user_id: matchedUser?.id ?? null
      }
    })

    const { error: memberError } = await supabase
      .from("team_members")
      .insert(memberRows)

    if (memberError) {
      console.error("Team members insert error:", memberError)
    }

  }

  return NextResponse.json(team)
}


/* =========================
   UPDATE TEAM
========================= */

export async function PATCH(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await requireAgency()

  const body = await req.json()

  const { id, name, description } = body

  if (!id) {
    return NextResponse.json(
      { error: "Team id required" },
      { status: 400 }
    )
  }

  let slug: string | undefined

  if (name) {
    slug = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
  }

  const payload: any = {}

  if (name) payload.name = name
  if (description !== undefined) payload.description = description
  if (slug) payload.slug = slug

  const { data, error } = await supabase
    .from("teams")
    .update(payload)
    .eq("id", id)
    .eq("owner_id", user.id)
    .select()
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { error: "Team not found or permission denied" },
      { status: 404 }
    )
  }

  return NextResponse.json(data)
}


/* =========================
   DELETE TEAM
========================= */

export async function DELETE(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await requireAgency()

  const body = await req.json()

  const { id } = body

  if (!id) {
    return NextResponse.json(
      { error: "Team id required" },
      { status: 400 }
    )
  }

  await supabase
    .from("team_members")
    .delete()
    .eq("team_id", id)

  const { error } = await supabase
    .from("teams")
    .delete()
    .eq("id", id)
    .eq("owner_id", user.id)

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}