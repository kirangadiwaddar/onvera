import { supabase } from "@/lib/supabase/client"

export async function getTeamMemberName(userId: string) {
  const { data } = await supabase
    .from("team_members")
    .select("name")
    .eq("user_id", userId)
    .single()

  return data?.name || null
}