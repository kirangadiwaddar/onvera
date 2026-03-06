import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

  const {
    project_id,
    enabled,
    password,
    expires_at
  } = body

  if (!project_id) {
    return NextResponse.json(
      { error: "Project id required" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("projects")
    .update({
      client_link_enabled: enabled,
      client_password: password || null,
      client_link_expires_at: expires_at || null
    })
    .eq("id", project_id)
    .eq("owner_id", user.id)
    .select("client_token, client_link_enabled, client_password, client_link_expires_at")
    .single()

  if (error) {
    console.error("Client link update error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)

}