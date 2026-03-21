"use client"

import { useEffect, useMemo, useState } from "react"

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
import { fetchWithAuth } from "@/lib/auth/client-fetch"

export type ProjectFormValues = {
  title: string
  avatarSrc: string
  templateId: string
}

type TemplateOption = {
  id: string
  title: string
}

type ProjectModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  templates: TemplateOption[]
  loading?: boolean
  initialValues?: ProjectFormValues
  fixedTemplateId?: string
  onSubmit: (values: ProjectFormValues) => Promise<void> | void
}

const emptyValues: ProjectFormValues = {
  title: "",
  avatarSrc: "",
  templateId: "",
}

const MAX_LOGO_SIZE_BYTES = 200 * 1024

export function ProjectModal({
  open,
  onOpenChange,
  mode,
  templates,
  loading = false,
  initialValues,
  fixedTemplateId,
  onSubmit,
}: ProjectModalProps) {
  const [values, setValues] = useState<ProjectFormValues>(initialValues ?? emptyValues)
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormValues, string>>>({})
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreviewSrc, setLogoPreviewSrc] = useState(initialValues?.avatarSrc ?? "")

  useEffect(() => {
    if (!open) return
    const nextValues = initialValues ?? emptyValues
    setValues(nextValues)
    setErrors({})
    setLogoUploadError(null)
    setLogoPreviewSrc(nextValues.avatarSrc ?? "")
  }, [open, initialValues])

  const modalTitle = mode === "create" ? "Create Project" : "Edit Project"
  const modalDescription =
    mode === "create"
      ? "Add a new project with template and logo."
      : "Update project details and template."

  const submitLabel = mode === "create" ? "Create Project" : "Save Changes"

  const selectedTemplateId = fixedTemplateId ?? values.templateId
  const hasTemplateChoices = Boolean(fixedTemplateId || templates.length > 0)

  const selectedTemplateExists = useMemo(
    () => templates.some((template) => template.id === selectedTemplateId),
    [templates, selectedTemplateId],
  )

  const selectedTemplateTitle = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId)?.title ?? "",
    [templates, selectedTemplateId],
  )

  const handleLogoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setLogoUploadError(null)

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Please upload an image file")
      event.target.value = ""
      return
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setLogoUploadError("Logo size must be under 200KB")
      event.target.value = ""
      return
    }

    const localPreview = URL.createObjectURL(file)
    setLogoPreviewSrc(localPreview)

    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetchWithAuth("/api/uploads/project-logo", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        throw new Error("Upload failed")
      }

      const data = (await res.json()) as { url: string }

      setValues((prev) => ({ ...prev, avatarSrc: data.url }))
      setLogoPreviewSrc(data.url)
    } catch (error) {
      console.error("Logo upload failed:", error)
      setLogoUploadError("Unable to upload logo right now")
    } finally {
      setUploadingLogo(false)
      event.target.value = ""
      URL.revokeObjectURL(localPreview)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors: Partial<Record<keyof ProjectFormValues, string>> = {}

    if (!values.title.trim()) {
      nextErrors.title = "Project name is required"
    }

    if (!hasTemplateChoices) {
      nextErrors.templateId = "Create at least one template before starting a project"
    } else {
      if (!selectedTemplateId) {
        nextErrors.templateId = "Template type is required"
      }

      if (!selectedTemplateExists) {
        nextErrors.templateId = "Please select a valid template"
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    await onSubmit({
      title: values.title.trim(),
      avatarSrc: values.avatarSrc.trim(),
      templateId: selectedTemplateId,
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
            <Label htmlFor="project-title">Project Name</Label>
            <Input
              id="project-title"
              value={values.title}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, title: event.target.value }))
                setErrors((prev) => ({ ...prev, title: undefined }))
              }}
              placeholder="Acme website redesign"
              disabled={loading || uploadingLogo}
            />
            {errors.title ? <p className="text-xs text-destructive">{errors.title}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-logo-url">Project Logo (URL)</Label>
            <Input
              id="project-logo-url"
              type="url"
              value={values.avatarSrc}
              onChange={(event) => {
                setValues((prev) => ({ ...prev, avatarSrc: event.target.value }))
                setLogoPreviewSrc(event.target.value)
              }}
              placeholder="https://example.com/logo.png"
              disabled={loading || uploadingLogo}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-logo-upload">Upload Logo (max 200KB)</Label>
            <Input
              id="project-logo-upload"
              type="file"
              accept="image/*"
              onChange={(event) => {
                void handleLogoFileChange(event)
              }}
              disabled={loading || uploadingLogo}
            />
            {uploadingLogo ? <p className="text-xs text-muted-foreground">Uploading logo...</p> : null}
            {logoUploadError ? <p className="text-xs text-destructive">{logoUploadError}</p> : null}
          </div>

          {logoPreviewSrc ? (
            <div className="space-y-2">
              <Label>Logo Preview</Label>
              <div className="flex h-16 w-16 items-center justify-center rounded-md border bg-white overflow-hidden dark:border-white/10 dark:bg-white/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreviewSrc}
                  alt="Project logo preview"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="project-template">Template Type</Label>
            {fixedTemplateId ? (
              <div className="h-9 w-full rounded-md border px-3 text-sm flex items-center bg-muted/30">
                {selectedTemplateTitle || "Selected template"}
              </div>
            ) : (
              <Select
                value={values.templateId}
                onValueChange={(templateId) => {
                  setValues((prev) => ({ ...prev, templateId }))
                  setErrors((prev) => ({ ...prev, templateId: undefined }))
                }}
                disabled={loading || uploadingLogo || templates.length === 0}
              >
                <SelectTrigger id="project-template" className="w-full">
                  <SelectValue placeholder="Select template type" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!fixedTemplateId && templates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                You need at least one template before creating a project. Create a template first.
              </p>
            ) : null}
            {errors.templateId ? <p className="text-xs text-destructive">{errors.templateId}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || uploadingLogo}
            >
              Cancel
            </Button>
            <Button type="submit" variant="gradient" disabled={loading || uploadingLogo || !hasTemplateChoices}>
              {loading ? "Saving..." : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
