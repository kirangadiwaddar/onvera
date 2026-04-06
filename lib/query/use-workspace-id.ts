"use client"

import { useEffect, useState } from "react"

function readWorkspaceId() {
  if (typeof window === "undefined") return null
  const value = window.localStorage.getItem("onvera:workspace")
  return value && value !== "__create__" ? value : null
}

export function useWorkspaceId() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(() => readWorkspaceId())

  useEffect(() => {
    const syncWorkspaceId = () => {
      setWorkspaceId(readWorkspaceId())
    }

    syncWorkspaceId()
    window.addEventListener("workspace:changed", syncWorkspaceId)
    window.addEventListener("storage", syncWorkspaceId)

    return () => {
      window.removeEventListener("workspace:changed", syncWorkspaceId)
      window.removeEventListener("storage", syncWorkspaceId)
    }
  }, [])

  return workspaceId
}
