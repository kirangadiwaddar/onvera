import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {

  const supabase = await createClient()

  const { project_id, custom_sections } = await req.json()

  const { error } = await supabase
    .from("projects")
    .update({
      custom_sections
    })
    .eq("id", project_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })

}