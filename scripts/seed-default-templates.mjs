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

const templatesJson = JSON.parse(
  fs.readFileSync(path.join(rootDir, "src/mocks/data/templates.json"), "utf-8"),
)

const templates = templatesJson.templates.map((template) => ({
  id: template.id,
  title: template.title,
  description: template.description,
  icon: template.icon,
  badge: template.badge,
  template_key: template.id,
  is_default: true,
}))

async function run() {
  const { error: templateErr } = await supabase
    .from("templates")
    .upsert(templates, { onConflict: "id" })

  if (templateErr) throw templateErr

  console.log(`Seeded default templates=${templates.length}`)
}

run().catch((error) => {
  console.error("Default template seeding failed:", error)
  process.exit(1)
})
