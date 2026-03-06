"use client"
import { supabase } from "@/lib/supabase/client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { Plus, Upload } from "lucide-react"

interface Props {
  mode?: "create" | "edit"
  project?: {
    id: number
    title: string
    slug: string
    template_id: string
    avatar_src?: string | null
  }
  open?: boolean
  onClose?: () => void
  onSaved: (project: any) => void
}

export function ProjectDialog({
  mode = "create",
  project,
  open: externalOpen,
  onClose,
  onSaved,
}: Props) {

  const [internalOpen, setInternalOpen] = useState(false)

  const open = externalOpen ?? internalOpen
  const setOpen = onClose ?? setInternalOpen

  const [title, setTitle] = useState("")
  const [template, setTemplate] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [logoPreview, setLogoPreview] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)

  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(false)


  // Prefill edit mode
  useEffect(() => {
    if (mode === "edit" && project) {
      setTitle(project.title)
      setTemplate(project.template_id)
      setLogoUrl(project.avatar_src || "")
      setLogoPreview(project.avatar_src || "")
    }
  }, [project])

  // Fetch templates
  useEffect(() => {
    const fetchTemplates = async () => {
      const res = await fetch("/api/templates")
      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : [])
    }

    fetchTemplates()
  }, [])

  // Handle upload preview
  const handleFileUpload = async (file: File) => {

    if (!file) return

    // size check (200kb)
    if (file.size > 200 * 1024) {
      toast.error("Logo must be under 200KB")
      return
    }

    const fileExt = file.name.split(".").pop()

    const fileName = `${Date.now()}.${fileExt}`

    const filePath = `projects/${fileName}`

    const { error } = await supabase.storage
      .from("project-logos")
      .upload(filePath, file)

    if (error) {
      toast.error("Logo upload failed")
      console.error(error)
      return
    }

    const { data } = supabase.storage
      .from("project-logos")
      .getPublicUrl(filePath)

    const publicUrl = data.publicUrl

    setLogoUrl(publicUrl)
    setLogoPreview(publicUrl)

    toast.success("Logo uploaded")
  }

  const handleSubmit = async () => {

    setLoading(true)

    const method = mode === "edit" ? "PATCH" : "POST"

    const payload =
      mode === "edit"
        ? {
          id: project?.id,
          title,
          template_id: template,
          avatar_src: logoUrl,
        }
        : {
          title,
          template_id: template,
          avatar_src: logoUrl,
        }

    const res = await fetch("/api/projects", {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    setLoading(false)

    if (!res.ok) {
      toast.error(data.error || "Operation failed")
      return
    }

    // update UI
    onSaved?.(data)

    // success toast
    toast.success(
      mode === "edit"
        ? "Project updated successfully"
        : "Project created successfully"
    )

    // close modal
    setOpen(false)

    // reset fields
    setTitle("")
    setTemplate("")
    setLogoUrl("")
    setLogoPreview("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>

      {mode === "create" && (
        <DialogTrigger asChild>
          <Button variant="gradient">
            <Plus strokeWidth={2} /> Create Project
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit Project" : "Create Project"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">

          {/* Project title */}
          <div>
            <Label>Project Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Logo URL */}
          <div>
            <Label>Logo URL</Label>
            <Input
              placeholder="Paste logo URL"
              value={logoUrl}
              onChange={(e) => {
                setLogoUrl(e.target.value)
                setLogoPreview(e.target.value)
                setLogoFile(null)
              }}
            />
          </div>

          {/* Upload logo */}
          <div>
            <Label>Upload Logo</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  handleFileUpload(file)
                }}
              />
              <Upload size={18} />
            </div>
          </div>

          {/* Preview */}
          {logoPreview && (
            <div className="flex items-center gap-3 mt-2">
              <img
                src={logoPreview}
                className="h-12 w-12 rounded border object-cover"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setLogoPreview("")
                  setLogoUrl("")
                  setLogoFile(null)
                }}
              >
                Remove
              </Button>
            </div>
          )}

          {/* Template */}
          <div>
            <Label>Template</Label>

            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger>
                <SelectValue placeholder="Select template" />
              </SelectTrigger>

              <SelectContent>
                {templates.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading
              ? mode === "edit"
                ? "Updating..."
                : "Creating..."
              : mode === "edit"
                ? "Update Project"
                : "Create Project"}
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  )
}