"use client"

import { useEffect, useMemo, useRef } from "react"
import Uppy, { type UppyFile } from "@uppy/core"
import DragDrop from "@uppy/drag-drop"

type BrandingUploaderProps = {
  disabled?: boolean
  note?: string
  onFileAdded?: (file: File) => void
}

export function BrandingUploader({
  disabled = false,
  note = "Upload brand logo, guidelines, fonts, and related branding assets.",
  onFileAdded,
}: BrandingUploaderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const disabledRef = useRef(disabled)
  const onFileAddedRef = useRef(onFileAdded)
  const pluginId = "BrandingDragDrop"
  type UppyMeta = Record<string, unknown>
  type UppyBody = Record<string, never>

  const uppy = useMemo(() => {
    return new Uppy<UppyMeta, UppyBody>({
      autoProceed: false,
      restrictions: {
        maxNumberOfFiles: 10,
      },
    })
  }, [])

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  useEffect(() => {
    onFileAddedRef.current = onFileAdded
  }, [onFileAdded])

  useEffect(() => {
    const handleFileAdded = (file: UppyFile<UppyMeta, UppyBody>) => {
      if (disabledRef.current) {
        uppy.removeFile(file.id)
        return
      }
      const data = file.data
      if (data instanceof File) {
        onFileAddedRef.current?.(data)
      }
    }

    uppy.on("file-added", handleFileAdded)

    return () => {
      uppy.off("file-added", handleFileAdded)
    }
  }, [uppy])

  useEffect(() => {
    if (!containerRef.current) return

    const existing = uppy.getPlugin(pluginId) as DragDrop<UppyMeta, UppyBody> | undefined
    if (existing) {
      uppy.removePlugin(existing)
    }

    if (disabled) {
      return
    }

    uppy.use(DragDrop, {
      id: pluginId,
      target: containerRef.current,
      note,
      locale: {
        strings: {
          dropHereOr: "Drop branding files here or %{browse}",
          browse: "browse",
        },
      },
    })

    return () => {
      const cleanup = uppy.getPlugin(pluginId) as DragDrop<UppyMeta, UppyBody> | undefined
      if (cleanup) {
        uppy.removePlugin(cleanup)
      }
    }
  }, [disabled, note, uppy])

  useEffect(() => {
    uppy.setOptions({
      restrictions: {
        maxNumberOfFiles: disabled ? 0 : 10,
      },
    })
    if (disabled) {
      if ("cancelAll" in uppy && typeof (uppy as { cancelAll?: () => void }).cancelAll === "function") {
        ;(uppy as { cancelAll?: () => void }).cancelAll?.()
      } else if ("reset" in uppy && typeof (uppy as { reset?: () => void }).reset === "function") {
        ;(uppy as { reset?: () => void }).reset?.()
      } else {
        uppy.getFiles().forEach((file) => uppy.removeFile(file.id))
      }
    }
  }, [disabled, uppy])

  useEffect(() => {
    return () => {
      if ("destroy" in uppy) {
        uppy.destroy()
      }
    }
  }, [uppy])

  return (
    <div
      className={`branding-drop relative ${disabled ? "is-disabled pointer-events-none opacity-60" : ""}`}
      data-disabled={disabled ? "true" : "false"}
    >
      <div ref={containerRef} />
    </div>
  )
}
