import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey)

const users = [
  {
    email: "team.member@onvera.test",
    password: "Password123!",
    full_name: "Team Member",
    role: "team_member",
  },
  {
    email: "project.member@onvera.test",
    password: "Password123!",
    full_name: "Project Member",
    role: "project_member",
  },
  {
    email: "team.lead@onvera.test",
    password: "Password123!",
    full_name: "Team Lead",
    role: "team_member",
  },
]

for (const user of users) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name, role: user.role },
  })

  if (error) {
    console.error(`Failed to create ${user.email}:`, error.message)
    continue
  }

  const userId = data.user?.id
  if (!userId) {
    console.error(`No user id returned for ${user.email}`)
    continue
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      full_name: user.full_name,
      role: user.role,
    })

  if (profileError) {
    console.error(`Failed to upsert profile for ${user.email}:`, profileError.message)
    continue
  }

  console.log(`Created ${user.email}`)
}
