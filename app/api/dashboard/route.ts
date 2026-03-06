import { createClient } from "@/lib/supabase/server"

export async function GET() {

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: projects, error } = await supabase
    .from("projects")
    .select(`
      *,
      template:templates ( id, title )
    `)
    .eq("owner_id", user.id)

  if (error || !projects) {
    return Response.json({
      stats: { total: 0, waiting: 0, completed: 0, overdue: 0, onhold: 0 },
      lists: { latestOngoing: [], latestWaitingOverdue: [] },
    })
  }

  const total = projects.length
  const waiting = projects.filter(p => p.status === "waiting").length
  const completed = projects.filter(p => p.status === "completed").length
  const overdue = projects.filter(p => p.status === "overdue").length
  const onhold = projects.filter(p => p.status === "onhold").length

  const latestOngoing = projects
    .filter(p => p.status === "ongoing")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 6)

  const overdueProjects = projects
    .filter(p => p.status === "overdue")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    )

  const waitingProjects = projects
    .filter(p => p.status === "waiting")
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    )

  const latestWaitingOverdue = [
    ...overdueProjects,
    ...waitingProjects
  ].slice(0, 6)

  return Response.json({
    stats: { total, waiting, completed, overdue, onhold },
    lists: { latestOngoing, latestWaitingOverdue },
  })
}