import { createClient } from "@/lib/supabase/server"

export async function GET() {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: templates, error: templateError } =
    await supabase.from("templates").select("*")

  if (templateError) {
    return Response.json({ error: templateError.message }, { status: 500 })
  }

  const { data: projects, error: projectError } =
    await supabase
      .from("projects")
      .select("template_id")
      .eq("owner_id", user.id)

  if (projectError) {
    return Response.json({ error: projectError.message }, { status: 500 })
  }

  const countMap: Record<string, number> = {}

  projects?.forEach((p) => {
    countMap[p.template_id] = (countMap[p.template_id] || 0) + 1
  })

  const result = templates?.map((t) => ({
    ...t,
    projectsCreated: countMap[t.id] || 0
  }))

  return Response.json(result ?? [])
}