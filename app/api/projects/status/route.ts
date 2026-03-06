import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, status } = await req.json()

  const { error } = await supabase
    .from("projects")
    .update({ status })
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