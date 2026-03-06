"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"

import {
  Globe,
  Palette,
  Smartphone,
  Cloud,
  ShoppingCart,
  Megaphone,
  Brush,
  Plus,
  AppWindowMac,
  FolderOpenDot,
  Upload,
  X
} from "lucide-react"

import { getIconColor } from "@/lib/get-icon-colors"
import { supabase } from "@/lib/supabase/client"

const iconMap = {
  Globe,
  Palette,
  Smartphone,
  Cloud,
  ShoppingCart,
  Megaphone,
  Brush,
  Plus,
  AppWindowMac
}

export default function TemplateCards() {

  const router = useRouter()

  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [openCreate, setOpenCreate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null)

  const [projectName, setProjectName] = useState("")
  const [logoUrl, setLogoUrl] = useState("")
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)

  /* ---------------- FETCH TEMPLATES ---------------- */

  useEffect(() => {

    const fetchTemplates = async () => {

      try {

        const res = await fetch("/api/template-with-counts", {
          cache: "no-store"
        })

        const data = await res.json()

        if (!res.ok) {
          console.error("Templates fetch failed:", data)
          return
        }

        setTemplates(Array.isArray(data) ? data : [])

      } catch (err) {

        console.error("Template fetch error:", err)

      } finally {

        setLoading(false)

      }
    }

    fetchTemplates()

  }, [])

  /* ---------------- UPLOAD LOGO ---------------- */

 const uploadLogo = async (file: File) => {

  try {

    setUploading(true)

    const fileExt = file.name.split(".").pop()

    const filePath = `logos/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from("project-logos")
      .upload(filePath, file)

    if (error) throw error

    const { data } = supabase.storage
      .from("project-logos")
      .getPublicUrl(filePath)

    setLogoUrl(data.publicUrl)

  } catch (err) {

    console.error("Upload failed", err)

  } finally {

    setUploading(false)

  }
}

  /* ---------------- CREATE PROJECT ---------------- */

  const createProject = async () => {

    if (!projectName || !selectedTemplate) return

    setCreating(true)

    try {

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: projectName,
          template_id: selectedTemplate.id,
          avatar_src: logoUrl
        })
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("Project creation failed:", data)
        return
      }

      /* update template count instantly */

      setTemplates(prev =>
        prev.map(t =>
          t.id === selectedTemplate.id
            ? { ...t, projectsCreated: t.projectsCreated + 1 }
            : t
        )
      )

      resetModal()

      if (data?.slug) {
        router.push(`/projects/${data.slug}`)
      }

    } catch (err) {

      console.error("Project create error:", err)

    } finally {

      setCreating(false)

    }
  }

  /* ---------------- RESET MODAL ---------------- */

  const resetModal = () => {

    setOpenCreate(false)
    setSelectedTemplate(null)
    setProjectName("")
    setLogoUrl("")

  }

  /* ---------------- DRAG DROP ---------------- */

  const handleDrop = (e: any) => {

    e.preventDefault()

    const file = e.dataTransfer.files?.[0]

    if (file) uploadLogo(file)

  }

  if (loading) {
    return <div className="p-7">Loading templates...</div>
  }

  return (

    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-7 pb-0 pt-0">

      {templates.map((template, index) => {

        const Icon = iconMap[template.icon as keyof typeof iconMap]

        return (

          <Card
            key={template.id}
            className="mx-auto w-full p-0 gap-2 shadow-none bg-gradient-violet rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
          >

            <CardHeader className="flex items-start justify-between gap-4 p-5 pb-2">

              <div className="h-10 w-10 p-2.5 rounded-lg flex items-center justify-center bg-white border border-violet-200">
                {Icon ? <Icon className="w-8 h-8" /> : null}
              </div>

              <CardAction>
                <Badge className={`text-xs font-medium ${getIconColor(index)}`}>
                  {template.badge}
                </Badge>
              </CardAction>

            </CardHeader>

            <CardContent className="flex-1 mb-3 px-5">

              <CardTitle className="font-medium text-sm truncate mb-2">
                {template.title}
              </CardTitle>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {template.description}
              </p>

            </CardContent>

            <CardFooter className="border-t py-4 text-xs text-muted-foreground flex items-center justify-between">

              <strong className="font-medium text-black text-xs flex items-center gap-1">
                <FolderOpenDot size={16} />
                {template.projectsCreated} Projects Created
              </strong>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  setSelectedTemplate(template)
                  setOpenCreate(true)
                }}
              >
                <Plus className="text-primary" strokeWidth={2} />
              </Button>

            </CardFooter>

          </Card>

        )

      })}

      {/* ---------------- CREATE PROJECT MODAL ---------------- */}

      <Dialog open={openCreate} onOpenChange={resetModal}>

        <DialogContent>

          <DialogHeader>
            <DialogTitle>
              Create {selectedTemplate?.title} Project
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <Input
              placeholder="Project name"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />

            <div className="space-y-3">

  {/* LOGO URL */}
  <Input
    placeholder="Logo URL"
    value={logoUrl}
    onChange={(e) => setLogoUrl(e.target.value)}
  />

  {/* FILE UPLOAD */}
  <Input
    type="file"
    accept="image/*"
    onChange={(e) => {
      if (e.target.files?.[0]) {
        uploadLogo(e.target.files[0])
      }
    }}
  />

  {/* PREVIEW */}
  {logoUrl && (
    <div className="flex items-center justify-between border rounded-lg p-3">

      <div className="flex items-center gap-3">

        <img
          src={logoUrl}
          alt="logo preview"
          className="h-10 w-10 rounded object-cover border"
        />

        <span className="text-sm text-muted-foreground">
          Logo Preview
        </span>

      </div>

      <Button
        size="sm"
        variant="destructive"
        onClick={() => setLogoUrl("")}
      >
        Remove
      </Button>

    </div>
  )}

</div>

          </div>

          <DialogFooter>

            <Button
              disabled={!projectName || creating || uploading}
              onClick={createProject}
            >
              Create Project
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  )
}