import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function PATCH(req: Request) {

  const supabase = await createClient()

  const { project_id } = await req.json()

  if (!project_id) {

    return NextResponse.json(
      { error: "Missing project id" },
      { status: 400 }
    )

  }

  /* Generate new secure token */

  const token = crypto.randomBytes(16).toString("hex")

  const { error } = await supabase
    .from("projects")
    .update({
      client_token: token
    })
    .eq("id", project_id)

  if (error) {

    console.error("Token regeneration error:", error)

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )

  }

  return NextResponse.json({
    success: true,
    token
  })

}