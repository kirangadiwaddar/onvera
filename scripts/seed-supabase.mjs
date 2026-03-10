import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createClient } from "@supabase/supabase-js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, "utf-8").split(/\r?\n/)
  for (const line of lines) {
    if (!line || line.trim().startsWith("#") || !line.includes("=")) continue
    const idx = line.indexOf("=")
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^"|"$/g, "")
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile(path.join(rootDir, ".env.local"))

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

const projectsJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/mocks/data/projects.json"), "utf-8"),
)
const teamsJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/mocks/data/teams.json"), "utf-8"),
)
const templatesJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/mocks/data/templates.json"), "utf-8"),
)

const templates = templatesJson.templates.map((template) => ({
  id: template.id,
  title: template.title,
  description: template.description,
  icon: template.icon,
  badge: template.badge,
}))

const teams = teamsJson.teams.map((team) => ({
  id: team.id,
  name: team.name,
  slug: team.slug,
  description: team.description ?? "",
  template_id: team.template,
  status: team.status,
  lead: team.lead ?? null,
  members: team.members ?? [],
  created_at: team.createdAt ?? new Date().toISOString(),
}))

const projects = projectsJson.projects.map((project) => ({
  id: project.id,
  slug: project.slug,
  title: project.title,
  template_id: project.templateId,
  status: project.status,
  created_at: project.createdAt ?? new Date().toISOString(),
  updated_at: project.updatedAt ?? null,
  avatar_src: project.avatarSrc ?? "",
  team_ids: project.teamIds ?? [],
  extra_members: project.extraMembers ?? [],
  submissions: project.submissions ?? {},
}))

async function run() {
  const { error: templateErr } = await supabase
    .from("templates")
    .upsert(templates, { onConflict: "id" })

  if (templateErr) throw templateErr

  const { error: teamErr } = await supabase
    .from("teams")
    .upsert(teams, { onConflict: "id" })

  if (teamErr) throw teamErr

  const { error: projectErr } = await supabase
    .from("projects")
    .upsert(projects, { onConflict: "id" })

  if (projectErr) throw projectErr

  const { error: sequenceErr } = await supabase.rpc("sync_identity_sequences")
  if (sequenceErr) throw sequenceErr

  console.log(`Seeded templates=${templates.length}, teams=${teams.length}, projects=${projects.length}`)
}

run().catch((error) => {
  console.error("Seeding failed:", error)
  process.exit(1)
})
