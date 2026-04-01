"use client"

import { useMemo, useState } from "react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

type TemplateFormValues = {
  id?: string
  title: string
  description: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValues?: TemplateFormValues
  loading?: boolean
  onSubmit: (values: TemplateFormValues) => void
  mode?: "create" | "edit"
}

export function TemplateModal({
  open,
  onOpenChange,
  initialValues,
  loading,
  onSubmit,
  mode = "create",
}: Props) {
  const emptyValues = useMemo<TemplateFormValues>(
    () => ({
      title: "",
      description: "",
    }),
    [],
  )
  const [values, setValues] = useState<TemplateFormValues>(() => initialValues ?? emptyValues)
  const [errors, setErrors] = useState<{ title?: string; description?: string }>({})

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setValues(initialValues ?? emptyValues)
      setErrors({})
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    const nextErrors: { title?: string; description?: string } = {}
    if (!values.title.trim()) {
      nextErrors.title = "Template title is required."
    }
    if (!values.description.trim()) {
      nextErrors.description = "Template description is required."
    }
    if (nextErrors.title || nextErrors.description) {
      setErrors(nextErrors)
      return
    }
    setErrors({})
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 w-full sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Template Title</label>
            <Input
              value={values.title}
              onChange={(event) => {
                const nextTitle = event.target.value
                setValues((prev) => ({ ...prev, title: nextTitle }))
                if (errors.title && nextTitle.trim()) {
                  setErrors((prev) => ({ ...prev, title: undefined }))
                }
              }}
              placeholder="Template name"
              className="w-full"
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={values.description}
              onChange={(event) => {
                const nextDescription = event.target.value
                setValues((prev) => ({ ...prev, description: nextDescription }))
                if (errors.description && nextDescription.trim()) {
                  setErrors((prev) => ({ ...prev, description: undefined }))
                }
              }}
              placeholder="Describe this template"
              className="w-full"
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="destructiveLight" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="gradient" onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : mode === "edit" ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
