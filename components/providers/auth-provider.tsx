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
      .select("id, full_name, role")
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
    const loadingTimeout = window.setTimeout(() => {
      setLoading(false)
    }, 3000)

    if (!hasSupabaseEnv()) {
      setLoading(false)
      window.clearTimeout(loadingTimeout)
      return
    }

    const supabase = createClient()

    async function init() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession ?? null)
        setUser(initialSession?.user ?? null)
        setLoading(false)
        window.clearTimeout(loadingTimeout)

        if (initialSession?.user?.id) {
          const data = await loadProfile(initialSession.user.id)
          setProfile(data)
        } else {
          setProfile(null)
        }
      } catch (error) {
        console.error("Auth initialization failed:", error)
        setSession(null)
        setUser(null)
        setProfile(null)
        setLoading(false)
        window.clearTimeout(loadingTimeout)
      }
    }

    void init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        try {
          setSession(nextSession)
          setUser(nextSession?.user ?? null)

          if (nextSession?.user?.id) {
            const data = await loadProfile(nextSession.user.id)
            setProfile(data)
          } else {
            setProfile(null)
          }
        } catch (error) {
          console.error("Auth state handling failed:", error)
        } finally {
          setLoading(false)
        }
      })()
    })

    return () => {
      window.clearTimeout(loadingTimeout)
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
