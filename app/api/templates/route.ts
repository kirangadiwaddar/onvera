import { NextResponse } from "next/server"
import { getStoreData } from "@/lib/server/data-store"

export async function GET() {
  const { projects, templates } = await getStoreData()

  const projectCountMap = projects.reduce((acc: Record<string, number>, project) => {
    acc[project.templateId] = (acc[project.templateId] ?? 0) + 1
    return acc
  }, {})

  const payload = templates.map((template) => ({
    ...template,
    projectsCreated: projectCountMap[template.id] ?? 0,
  }))

  return NextResponse.json({ templates: payload })
}
