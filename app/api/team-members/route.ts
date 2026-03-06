import { requireAgency } from "@/lib/require-agency"
import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {

  const supabase = await createClient()

  const body = await req.json()

  const { team_id, name, email, role, designation, status } = body

  if (!team_id || !name || !email) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id,
      name,
      email,
      designation,
      team_role: role || "member",
      status: "pending"
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  const auth = await requireAgency()

  return NextResponse.json(data)
}

export async function DELETE(req: Request) {
  const supabase = await createClient()

  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { error: "Member id required" },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", id)

    if (error) {
      console.error("Delete error:", error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }
    const auth = await requireAgency()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Delete route error:", err)
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    )
  }
}