import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {

  const supabase = await createClient()

  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json([], { status: 200 })
  }

  const { data, error } = await supabase
  .from("activities")
  .select(`
    id,
    title,
    status,
    created_at,
    project:projects!inner (
      id,
      title,
      slug,
      owner_id
    )
  `)
  .eq("project.owner_id", user.id)
  .order("created_at", { ascending: false })
  .limit(15)

  if (error) {
    console.error(error)
    return NextResponse.json([])
  }

  return NextResponse.json(data)
}

export async function POST(req: Request) {

  const supabase = await createClient()

  const { project_id, title, status, owner_id } = await req.json()

  const { data: user } = await supabase.auth.getUser()

  const finalOwner =
    user?.user?.id || owner_id

  const { error } = await supabase
    .from("activities")
    .insert({
      project_id,
      title,
      status,
      owner_id: finalOwner
    })

  if (error) {

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )

  }

  return NextResponse.json({ success: true })
}