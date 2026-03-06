"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Briefcase, User } from "lucide-react"

export default function OnboardingPage() {

  const router = useRouter()

  const [role, setRole] = useState<"agency" | "freelancer" | "">("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {

    if (!role) return

    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        account_role: role,
        display_name: user.user_metadata?.display_name ?? null,
        onboarding_complete: true
      })

    if (error) {
      console.error("Onboarding error:", error)
      setLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (

    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white flex items-center justify-center px-6">

      <div className="w-full max-w-lg">

        {/* HEADER */}

        <div className="text-center mb-10">

          <h1 className="text-3xl font-semibold text-zinc-900">
            Welcome 👋
          </h1>

          <p className="text-zinc-500 mt-2">
            Choose how you’ll use the platform
          </p>

        </div>

        {/* ROLE SELECTION */}

        <div className="space-y-4">

          {/* AGENCY */}

          <button
            onClick={() => setRole("agency")}
            className={`w-full border rounded-xl p-5 text-left transition-all flex gap-4 items-center
            ${
              role === "agency"
                ? "border-violet-500 bg-violet-50"
                : "border-zinc-200 hover:border-violet-300"
            }`}
          >

            <div className="bg-violet-100 text-violet-600 p-3 rounded-lg">
              <Briefcase size={20} />
            </div>

            <div>

              <p className="font-medium text-zinc-900">
                Agency
              </p>

              <p className="text-sm text-zinc-500">
                Manage teams and multiple client projects
              </p>

            </div>

          </button>

          {/* FREELANCER */}

          <button
            onClick={() => setRole("freelancer")}
            className={`w-full border rounded-xl p-5 text-left transition-all flex gap-4 items-center
            ${
              role === "freelancer"
                ? "border-violet-500 bg-violet-50"
                : "border-zinc-200 hover:border-violet-300"
            }`}
          >

            <div className="bg-violet-100 text-violet-600 p-3 rounded-lg">
              <User size={20} />
            </div>

            <div>

              <p className="font-medium text-zinc-900">
                Freelancer
              </p>

              <p className="text-sm text-zinc-500">
                Work independently and manage your projects
              </p>

            </div>

          </button>

        </div>

        {/* CONTINUE BUTTON */}

        <button
          onClick={handleSubmit}
          disabled={!role || loading}
          className={`w-full mt-8 py-3 rounded-xl font-medium transition
          ${
            role
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-200 text-zinc-500 cursor-not-allowed"
          }`}
        >

          {loading ? "Setting up..." : "Continue"}

        </button>

      </div>

    </div>

  )
}