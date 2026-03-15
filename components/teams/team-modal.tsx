"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type TeamFormValues = {
  name: string
  description: string
  status: "active" | "inactive"
}

type TeamModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  loading?: boolean
  initialValues?: TeamFormValues
  onSubmit: (values: TeamFormValues) => Promise<void> | void
}

const emptyValues: TeamFormValues = {
  name: "",
  description: "",
  status: "active",
}

export function TeamModal({
  open,
  onOpenChange,
  mode,
  loading = false,
  initialValues,
  onSubmit,
}: TeamModalProps) {
  const [values, setValues] = useState<TeamFormValues>(initialValues ?? emptyValues)
  const [errors, setErrors] = useState<Partial<Record<keyof TeamFormValues, string>>>({})

  const modalTitle = mode === "create" ? "Create Team" : "Edit Team"
  const modalDescription =
    mode === "create"
      ? "Create a team for structured project collaboration."
      : "Update team details and status."

  const submitLabel = mode === "create" ? "Create Team" : "Save Changes"

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: Partial<Record<keyof TeamFormValues, string>> = {}

    if (!values.name.trim()) {
      nextErrors.name = "Team name is required"
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={values.name}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, name: event.target.value }))
                setErrors((prev) => ({ ...prev, name: undefined }))
              }}
              placeholder="Branding Team"
              disabled={loading}
            />
            {errors.name ? <p className="text-xs text-destructive">{errors.name}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description</Label>
            <Input
              id="team-description"
              value={values.description}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, description: event.target.value }))
              }}
              placeholder="Describe what this team handles"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-status">Status</Label>
            <Select
              value={values.status}
              onValueChange={(status) => {
                setValues((prev) => ({ ...prev, status: status as "active" | "inactive" }))
              }}
              disabled={loading}
            >
              <SelectTrigger id="team-status" className="w-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading}>
              {loading ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
