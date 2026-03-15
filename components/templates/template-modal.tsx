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

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setValues(initialValues ?? emptyValues)
    }
    onOpenChange(nextOpen)
  }

  const handleSubmit = () => {
    onSubmit(values)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Edit Template" : "Create Template"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Template Title</label>
            <Input
              value={values.title}
              onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Template name"
              className="w-full"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <Textarea
              value={values.description}
              onChange={(event) => setValues((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe this template"
              className="w-fulll"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : mode === "edit" ? "Update Template" : "Create Template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
