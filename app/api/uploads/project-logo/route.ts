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

async function ensureBucketExists(bucketName: string) {
  const admin = createAdminClient()
  if (!admin) {
    return { ok: false, message: "Supabase is not configured" }
  }

  const { data: existing, error: getBucketError } = await admin.storage.getBucket(bucketName)

  if (existing && !getBucketError) {
    return { ok: true, message: null as string | null }
  }

  const message = (getBucketError?.message || "").toLowerCase()
  const isMissingBucket =
    getBucketError?.statusCode === "404" ||
    message.includes("not found") ||
    message.includes("does not exist")

  if (!isMissingBucket) {
    return { ok: false, message: getBucketError?.message || "Unable to access logo bucket" }
  }

  const { error: createBucketError } = await admin.storage.createBucket(bucketName, {
    public: true,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"],
    fileSizeLimit: `${MAX_LOGO_BYTES}`,
  })

  if (createBucketError) {
    return { ok: false, message: createBucketError.message }
  }

  return { ok: true, message: null as string | null }
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
  const ensuredBucket = await ensureBucketExists(bucketName)

  if (!ensuredBucket.ok) {
    return NextResponse.json({ message: ensuredBucket.message }, { status: 500 })
  }

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
