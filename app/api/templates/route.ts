import { supabase } from "@/lib/supabase/client"

export async function GET() {
  const { data: templates, error } = await supabase
    .from("templates")
    .select(`
      id,
      title,
      description,
      icon,
      badge,
      projects:projects(count)
    `)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const formatted =
    templates?.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      icon: t.icon,
      badge: t.badge,
      projectsCreated: t.projects?.[0]?.count || 0,
    })) ?? []

  return Response.json(formatted)
}