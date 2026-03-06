"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

import { Section, SectionItem } from "@/lib/types"

type ChecklistSectionProps = {
  section: Section
  permission: "admin" | "member" | "client"
  submissions?: Record<string, any>
  projectId: number
}

export default function ChecklistSection({
  section,
  permission,
  submissions = {},
  projectId,
}: ChecklistSectionProps) {

  const router = useRouter()

  const isAdmin = permission === "admin"
  const isClient = permission === "client"
  const isMember = permission === "member"

  const [editMode, setEditMode] = useState<Record<string, boolean>>({})
  const [localRows, setLocalRows] = useState<{ name: string; url: string }[]>([])
  const [editableValues, setEditableValues] = useState<Record<string, string>>({})

  /* -------------------------
     API helper
  -------------------------- */

  const updateSubmission = async (payload: any) => {

    await fetch("/api/submissions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        project_id: projectId,
        submissions: payload,
      }),
    })

    router.refresh()
  }

  /* -------------------------
     Toggle edit
  -------------------------- */

  const toggleEdit = (id: string) => {

    setEditMode((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))

  }

  /* -------------------------
     Submit single field
  -------------------------- */

  const submitField = async (itemId: string) => {

    const value = editableValues[itemId]
    if (!value) return

    await updateSubmission({
      [itemId]: {
        value,
        status: "submitted",
      },
    })

  }

  /* -------------------------
     Approve / Reject field
  -------------------------- */

  const updateStatus = async (
    itemId: string,
    status: "approved" | "rejected"
  ) => {

    const existing = submissions?.[itemId] || {}

    await updateSubmission({
      [itemId]: {
        ...existing,
        status,
      },
    })

  }

  /* -------------------------
     Add dynamic rows
  -------------------------- */

  const submitDynamicRows = async () => {

    if (!localRows.length) return

    const existingRows = submissions?.[section.id] || []

    const newRows = localRows.map((row) => ({
      name: row.name,
      url: row.url,
      status: "submitted",
    }))

    await updateSubmission({
      [section.id]: [...existingRows, ...newRows],
    })

    setLocalRows([])

  }

  /* -------------------------
     Delete dynamic row
  -------------------------- */

  const deleteRow = async (index: number) => {

    const existingRows = submissions?.[section.id] || []

    const updated = existingRows.filter((_: any, i: number) => i !== index)

    await updateSubmission({
      [section.id]: updated,
    })

  }

  /* -------------------------
     Approve / Reject dynamic row
  -------------------------- */

  const updateRowStatus = async (
    index: number,
    status: "approved" | "rejected"
  ) => {

    const existing = submissions?.[section.id] || []

    const updated = [...existing]

    updated[index] = {
      ...updated[index],
      status,
    }

    await updateSubmission({
      [section.id]: updated,
    })

  }

  /* -------------------------
     Field Renderer
  -------------------------- */

  const renderField = (
    itemId: string,
    fieldType: string,
    submissionValue: string,
    isEditing: boolean
  ) => {

    const value = editableValues[itemId] ?? submissionValue ?? ""

    const setValue = (v: string) => {

      setEditableValues((prev) => ({
        ...prev,
        [itemId]: v,
      }))

    }

    if (fieldType === "textarea") {

      return (
        <Textarea
          value={value}
          disabled={isMember || (isAdmin && !isEditing)}
          onChange={(e) => setValue(e.target.value)}
        />
      )

    }

    if (fieldType === "upload") {

      return (

        <Input
          type="file"
          disabled={isMember || (isAdmin && !isEditing)}
          onChange={(e) => {

            const file = e.target.files?.[0]
            if (!file) return

            setEditableValues((prev) => ({
              ...prev,
              [itemId]: file.name,
            }))

          }}
        />

      )

    }

    return (

      <Input
        value={value}
        disabled={isMember || (isAdmin && !isEditing)}
        onChange={(e) => setValue(e.target.value)}
      />

    )

  }

  return (

    <AccordionItem value={section.id} className="rounded-none">

      <AccordionTrigger className="text-sm px-3 py-3 hover:bg-zinc-50">
        {section.title}
      </AccordionTrigger>

      <AccordionContent className="border-b border-zinc-100">

        {/* -------------------------
            PREDEFINED ITEMS
        -------------------------- */}

        {section.items.map((item: SectionItem) => {

          const submission = submissions?.[item.id] || {}
          const isEditing = editMode[item.id] || false

          return (

            <div
              key={item.id}
              className="border-b border-zinc-200 p-4 space-y-3"
            >

              <div className="flex justify-between items-center">

                <div className="text-xs font-medium">
                  {item.label}
                </div>

                {submission?.status && (
                  <Badge className="text-xs capitalize">
                    {submission.status}
                  </Badge>
                )}

              </div>

              {renderField(
                item.id,
                item.fieldType,
                submission.value || "",
                isEditing
              )}

              {(isAdmin || isClient) && (

                <Button
                  size="sm"
                  onClick={() => submitField(item.id)}
                >
                  Submit Data
                </Button>

              )}

              {isAdmin && (

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleEdit(item.id)}
                >
                  {isEditing ? "Disable Edit" : "Enable Edit"}
                </Button>

              )}

              {isAdmin && submission?.value && (

                <div className="flex gap-2">

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(item.id, "approved")}
                  >
                    Approve
                  </Button>

                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => updateStatus(item.id, "rejected")}
                  >
                    Reject
                  </Button>

                </div>

              )}

            </div>

          )

        })}

        {/* -------------------------
            DYNAMIC SECTION
        -------------------------- */}

        {section.dynamic && (

          <>

            {(submissions?.[section.id] || []).map((row: any, index: number) => (

              <div
                key={`${section.id}-${index}`}
                className="border-b border-zinc-200 p-4 space-y-2"
              >

                <div className="flex justify-between items-center">

                  <div className="text-xs font-medium">
                    {row.name}
                  </div>

                  <div className="flex gap-2">

                    {row.status && (
                      <Badge className="text-xs capitalize">
                        {row.status}
                      </Badge>
                    )}

                    {(isAdmin || isClient) && (
                      <button
                        onClick={() => deleteRow(index)}
                        className="text-red-500 text-xs"
                      >
                        Delete
                      </button>
                    )}

                  </div>

                </div>

                <Input value={row.name} disabled />

                {(isAdmin || isClient) ? (

                  <Input
                    value={row.url}
                    onChange={(e) => {

                      const existing = submissions?.[section.id] || []
                      const updated = [...existing]

                      updated[index].url = e.target.value

                      updateSubmission({
                        [section.id]: updated,
                      })

                    }}
                  />

                ) : (

                  <a
                    href={row.url}
                    target="_blank"
                    className="text-blue-600 text-sm underline"
                  >
                    {row.url}
                  </a>

                )}

                {isAdmin && row.url && (

                  <div className="flex gap-2">

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateRowStatus(index, "approved")
                      }
                    >
                      Approve
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        updateRowStatus(index, "rejected")
                      }
                    >
                      Reject
                    </Button>

                  </div>

                )}

              </div>

            ))}

            {(isAdmin || isClient) && (

              <div className="p-4 space-y-3">

                {localRows.map((row, index) => (

                  <div
                    key={index}
                    className="border rounded-lg overflow-hidden"
                  >

                    <Input
                      placeholder="Name"
                      value={row.name}
                      onChange={(e) => {

                        const updated = [...localRows]
                        updated[index].name = e.target.value
                        setLocalRows(updated)

                      }}
                    />

                    <Input
                      placeholder="URL"
                      value={row.url}
                      onChange={(e) => {

                        const updated = [...localRows]
                        updated[index].url = e.target.value
                        setLocalRows(updated)

                      }}
                    />

                    <div className="p-2 bg-zinc-50">

                      <Button
                        size="sm"
                        onClick={submitDynamicRows}
                      >
                        Submit Row
                      </Button>

                    </div>

                  </div>

                ))}

                <Button
                  variant="ghost"
                  onClick={() =>
                    setLocalRows((prev) => [...prev, { name: "", url: "" }])
                  }
                  className="w-full"
                >
                  + Add Row
                </Button>

              </div>

            )}

          </>

        )}

      </AccordionContent>

    </AccordionItem>

  )

}