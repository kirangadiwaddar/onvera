"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Session, User } from "@supabase/supabase-js"
import type { UserRole } from "@/lib/auth/roles"
import { createClient } from "@/lib/supabase/client"
import { hasSupabaseEnv } from "@/lib/supabase/env"

type UserProfile = {
  id: string
  full_name: string | null
  role: UserRole | null
  plan: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function loadProfile(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, role, plan, stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single()

    if (error) {
      return null
    }

    return data
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null)
      return
    }

    const data = await loadProfile(user.id)
    setProfile(data)
  }

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      setLoading(false)
      return
    }

    let supabase: ReturnType<typeof createClient>
    try {
      supabase = createClient()
    } catch (error) {
      console.error("Supabase client initialization failed:", error)
      setLoading(false)
      return
    }

    const safetyTimer = window.setTimeout(() => {
      setLoading(false)
    }, 1500)

    async function init() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession ?? null)
        setUser(initialSession?.user ?? null)
        setLoading(false)

        if (initialSession?.user?.id) {
          void loadProfile(initialSession.user.id).then((data) => {
            setProfile(data)
          })
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
      } finally {
        window.clearTimeout(safetyTimer)
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)

      if (nextSession?.user?.id) {
        void loadProfile(nextSession.user.id)
          .then((data) => {
            setProfile(data)
          })
          .catch((error) => {
            console.error("Auth state handling failed:", error)
          })
      } else {
        setProfile(null)
      }
    })

    return () => {
      window.clearTimeout(safetyTimer)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      if (hasSupabaseEnv()) {
        const supabase = createClient()
        await supabase.auth.signOut({ scope: "global" })
      }
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      }).catch(() => null)
    } finally {
      setSession(null)
      setUser(null)
      setProfile(null)
    }
  }

  const value = { user, session, profile, loading, signOut, refreshProfile }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }

  return context
}
