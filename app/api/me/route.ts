import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  console.log("User:", user)

  const { data } = await supabase
    .from("profiles")
    .select("account_role")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    role: data?.account_role ?? "freelancer"
  })

  

}