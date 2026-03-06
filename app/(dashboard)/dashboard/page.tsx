import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardUI from "./DashboardUI";

export default async function Page() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role === "member") {
    redirect("/projects")
  }

  return <DashboardUI user={user} />;
}