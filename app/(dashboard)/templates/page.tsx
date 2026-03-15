"use client"

import TemplateCards from '@/components/templateCard'
import { EmptyState } from '@/components/emptyState'
import { LoadingState } from '@/components/loadingState'
import { useAuth } from '@/components/providers/auth-provider'
import React from 'react'

export default function Page() {
  const { profile, user, loading } = useAuth()
  const currentRole =
    profile?.role ||
    (typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null) ||
    null
  const canAccessTemplates = currentRole === "agency" || currentRole === "freelancer"

  if (loading) {
    return (
      <LoadingState
        title="Loading Templates"
        description="Checking your access permissions."
      />
    )
  }

  if (!canAccessTemplates) {
    return (
      <EmptyState
        title="Templates Unavailable"
        description="Templates are available only to admins."
      />
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
    <TemplateCards canSeed={canAccessTemplates} />
    </div>
  )
}
