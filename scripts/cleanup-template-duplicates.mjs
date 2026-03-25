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

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
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

const templatesJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/mocks/data/templates.json"), "utf-8"),
)
const defaultKeys = new Set(templatesJson.templates.map((template) => template.id))

function getTemplateKey(template) {
  return template.template_key || slugify(template.title) || template.id
}

async function run() {
  console.log("Loading templates and projects...")
  const [{ data: templates, error: templatesError }, { data: projects, error: projectsError }] = await Promise.all([
    supabase
      .from("templates")
      .select("id,title,template_key,created_by,is_default,created_at"),
    supabase
      .from("projects")
      .select("id,template_id,created_by"),
  ])

  if (templatesError) throw templatesError
  if (projectsError) throw projectsError

  const projectCountByTemplate = new Map()
  for (const project of projects || []) {
    const id = project.template_id
    if (!id) continue
    projectCountByTemplate.set(id, (projectCountByTemplate.get(id) || 0) + 1)
  }

  let updates = 0
  let projectMoves = 0
  let deletions = 0

  // Normalize template_key and default flags
  for (const template of templates || []) {
    const normalizedKey = getTemplateKey(template)
    const shouldBeDefault = template.created_by == null && defaultKeys.has(normalizedKey)
    const next = {
      template_key: normalizedKey,
      is_default: shouldBeDefault ? true : template.created_by ? false : template.is_default,
    }

    const needsUpdate =
      template.template_key !== next.template_key ||
      (template.created_by ? template.is_default !== false : (shouldBeDefault && template.is_default !== true))

    if (needsUpdate) {
      const { error } = await supabase.from("templates").update(next).eq("id", template.id)
      if (error) throw error
      updates += 1
      template.template_key = next.template_key
      template.is_default = next.is_default
    }
  }

  // Deduplicate default templates (created_by is null)
  const defaultGroups = new Map()
  for (const template of templates || []) {
    if (template.created_by != null) continue
    const key = getTemplateKey(template)
    if (!defaultKeys.has(key)) continue
    if (!defaultGroups.has(key)) defaultGroups.set(key, [])
    defaultGroups.get(key).push(template)
  }

  for (const [key, group] of defaultGroups.entries()) {
    if (group.length <= 1) continue
    const canonical = group.find((t) => t.id === key) || group.find((t) => t.is_default) || group[0]
    const dupes = group.filter((t) => t.id !== canonical.id)

    for (const dupe of dupes) {
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({ template_id: canonical.id })
        .eq("template_id", dupe.id)
      if (projectUpdateError) throw projectUpdateError

      projectMoves += 1

      const { data: remaining } = await supabase
        .from("projects")
        .select("id")
        .eq("template_id", dupe.id)
        .limit(1)

      if (!remaining || remaining.length === 0) {
        const { error: deleteError } = await supabase.from("templates").delete().eq("id", dupe.id)
        if (deleteError) throw deleteError
        deletions += 1
      }
    }
  }

  // Deduplicate per user (created_by + template_key)
  const userGroups = new Map()
  for (const template of templates || []) {
    if (!template.created_by) continue
    const key = getTemplateKey(template)
    const groupKey = `${template.created_by}::${key}`
    if (!userGroups.has(groupKey)) userGroups.set(groupKey, [])
    userGroups.get(groupKey).push(template)
  }

  for (const [groupKey, group] of userGroups.entries()) {
    if (group.length <= 1) continue
    const [userId] = groupKey.split("::")

    const sorted = [...group].sort((a, b) => {
      const aCount = projectCountByTemplate.get(a.id) || 0
      const bCount = projectCountByTemplate.get(b.id) || 0
      if (aCount !== bCount) return bCount - aCount
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    })

    const keep = sorted[0]
    const dupes = sorted.slice(1)

    for (const dupe of dupes) {
      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({ template_id: keep.id })
        .eq("template_id", dupe.id)
        .eq("created_by", userId)
      if (projectUpdateError) throw projectUpdateError

      projectMoves += 1

      const { data: remaining } = await supabase
        .from("projects")
        .select("id")
        .eq("template_id", dupe.id)
        .limit(1)

      if (!remaining || remaining.length === 0) {
        const { error: deleteError } = await supabase.from("templates").delete().eq("id", dupe.id)
        if (deleteError) throw deleteError
        deletions += 1
      }
    }
  }

  console.log(`Templates updated=${updates}, project moves=${projectMoves}, templates deleted=${deletions}`)
}

run().catch((error) => {
  console.error("Template cleanup failed:", error)
  process.exit(1)
})
