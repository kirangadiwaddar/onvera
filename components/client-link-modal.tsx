"use client"

import { useState, useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import type { Project } from "@/types/project"

type Props = {
  open: boolean
  setOpen: (open: boolean) => void
  project: Project
  refreshProject: () => Promise<void>
}

export default function ClientLinkModal({
  open,
  setOpen,
  project,
  refreshProject
}: Props) {

  const [enabled, setEnabled] = useState(false)
  const [password, setPassword] = useState("")
  const [expires, setExpires] = useState("")
  const [preset, setPreset] = useState("")

  /* ---- today minimum date ---- */

  const minDate = new Date().toISOString().slice(0,16)

  useEffect(() => {

    if (project) {

      setEnabled(project.client_link_enabled ?? false)
      setPassword(project.client_password ?? "")
      setExpires(project.client_link_expires_at ?? "")

    }

  }, [project])

  /* ---------- EXPIRY PRESETS ---------- */

  const applyPreset = (type: string) => {

    const now = new Date()

    if (type === "24h") now.setHours(now.getHours() + 24)
    if (type === "7d") now.setDate(now.getDate() + 7)
    if (type === "30d") now.setDate(now.getDate() + 30)

    const formatted = now.toISOString().slice(0,16)

    setExpires(formatted)
    setPreset(type)

  }

  /* ---------- SAVE ---------- */

  const save = async () => {

    await fetch("/api/projects/client-link", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: project.id,
        enabled,
        password,
        expires_at: expires || null
      })
    })

    await refreshProject()

    setOpen(false)

  }

  /* ---------- COPY LINK ---------- */

  const copyLink = () => {

    if (!project.client_token) return

    const link =
      `${window.location.origin}/client-onboarding/${project.client_token}`

    navigator.clipboard.writeText(link)

  }

  const regenerateLink = async () => {

  const confirm = window.confirm(
    "Regenerate client link? Old link will stop working."
  )

  if (!confirm) return

  await fetch("/api/projects/regenerate-client-link", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: project.id
    })
  })

  await refreshProject()

}

  return (

    <Dialog open={open} onOpenChange={setOpen}>

      <DialogContent className="space-y-6">

        <DialogHeader>
          <DialogTitle>Client Access</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ENABLE ACCESS */}

          <div className="space-y-2">

            <label className="text-sm font-medium">
              Enable Client Access
            </label>

            <label className="flex items-center gap-2 text-sm">

              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />

              Allow client to upload onboarding files

            </label>

          </div>

          {/* PASSWORD */}

          <div className="space-y-2">

            <label className="text-sm font-medium">
              Access Password
            </label>

            <Input
              placeholder="Optional password protection"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

          </div>

          {/* EXPIRY */}

          <div className="space-y-2">

            <label className="text-sm font-medium">
              Link Expiry
            </label>

            <div className="flex gap-2 flex-wrap">

              <Button
                size="sm"
                variant={preset === "24h" ? "default" : "secondary"}
                onClick={() => applyPreset("24h")}
              >
                24 Hours
              </Button>

              <Button
                size="sm"
                variant={preset === "7d" ? "default" : "secondary"}
                onClick={() => applyPreset("7d")}
              >
                7 Days
              </Button>

              <Button
                size="sm"
                variant={preset === "30d" ? "default" : "secondary"}
                onClick={() => applyPreset("30d")}
              >
                30 Days
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setPreset("")
                  setExpires("")
                }}
              >
                Never
              </Button>

            </div>

          </div>

          {/* CUSTOM DATE */}

          <div className="space-y-2">

            <label className="text-sm font-medium">
              Custom Expiry Date
            </label>

            <Input
              type="datetime-local"
              min={minDate}
              value={expires ? expires.slice(0,16) : ""}
              onChange={(e) => {
                setExpires(e.target.value)
                setPreset("")
              }}
            />

          </div>

          {/* COPY LINK */}

          <Button
            variant="secondary"
            disabled={!enabled || !project.client_token}
            onClick={copyLink}
          >
            Copy Client Link
          </Button>

          <Button
  variant="destructive"
  onClick={regenerateLink}
>
  Regenerate Link
</Button>

        </div>

        <DialogFooter>

          <Button onClick={save}>
            Save
          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>

  )

}