import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  const { project_id, name, role, is_external } = body

  const { data, error } = await supabase
    .from("project_members")
    .insert({
      project_id,
      name,
      role,
      is_external
    })
    .select()
    .single()

  if (error) {
    console.error("Member create error:", error)

    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {

  const supabase = await createClient()

  const body = await req.json()

  const { id } = body

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}