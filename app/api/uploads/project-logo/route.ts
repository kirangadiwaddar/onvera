import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getRequestIdentityFromRequest } from "@/lib/auth/request-identity"

const MAX_LOGO_BYTES = 200 * 1024
const DEFAULT_BUCKET = "project-logos"

function sanitizeFileName(fileName: string) {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]/g, "-")
    .replace(/-+/g, "-")
}

export async function POST(request: Request) {
  const identity = await getRequestIdentityFromRequest(request)
  if (!identity) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
  const admin = createAdminClient()

  if (!admin) {
    return NextResponse.json({ message: "Supabase is not configured" }, { status: 500 })
  }

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Logo file is required" }, { status: 400 })
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Only image files are allowed" }, { status: 400 })
  }

  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ message: "Logo must be under 200KB" }, { status: 400 })
  }

  const bucketName = process.env.SUPABASE_PROJECT_LOGO_BUCKET || DEFAULT_BUCKET
  const fileName = `${Date.now()}-${sanitizeFileName(file.name || "logo.png")}`
  const filePath = `logos/${fileName}`

  const { error: uploadError } = await admin.storage
    .from(bucketName)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    })

  if (uploadError) {
    return NextResponse.json({ message: uploadError.message }, { status: 500 })
  }

  const { data: publicData } = admin.storage.from(bucketName).getPublicUrl(filePath)

  return NextResponse.json({
    url: publicData.publicUrl,
    path: filePath,
    bucket: bucketName,
  })
}
