"use client"

import { useState } from "react"
import {
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
} from "@/components/ui/accordion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Section } from "@/lib/types"
import { Send, SendHorizonal } from "lucide-react"

export default function ChecklistSection({
    section,
    isAgency,
    submissions = {},
}: {
    section: Section
    isAgency: boolean
    submissions?: Record<string, any>
}) {
    const [editMode, setEditMode] = useState<Record<string, boolean>>({})
    const [localRows, setLocalRows] = useState<
        { name: string; url: string }[]
    >([])

    const [editableValues, setEditableValues] = useState<Record<string, string>>({})


    const toggleEdit = (id: string) => {
        setEditMode((prev) => ({
            ...prev,
            [id]: !prev[id],
        }))
    }

    const addRow = () => {
        setLocalRows([...localRows, { name: "", url: "" }])
    }

    const renderField = (
        itemId: string,
        fieldType: string,
        submissionValue: string,
        isEditing: boolean
    ) => {
        const currentValue =
            editableValues[itemId] ?? submissionValue ?? ""

        const handleChange = (value: string) => {
            setEditableValues((prev) => ({
                ...prev,
                [itemId]: value,
            }))
        }

        // TEXTAREA
        if (fieldType === "textarea") {
            if (isAgency) {
                return (
                    <Textarea
                        value={currentValue}
                        disabled={!isEditing}
                        onChange={(e) =>
                            isEditing && handleChange(e.target.value)
                        }
                    />
                )
            }

            return (
                <Textarea
                    defaultValue={submissionValue || ""}
                    onChange={() => { }}
                />
            )
        }

        // URL / TEXT
        if (fieldType === "url" || fieldType === "text") {
            if (isAgency) {
                return (
                    <Input
                        value={currentValue}
                        disabled={!isEditing}
                        onChange={(e) =>
                            isEditing && handleChange(e.target.value)
                        }
                    />
                )
            }

            return (
                <Input
                    defaultValue={submissionValue || ""}
                    onChange={() => { }}
                />
            )
        }

        // UPLOAD
        if (fieldType === "upload") {
            return (
                <Input
                    type="file"
                    disabled={isAgency && !isEditing}
                />
            )
        }

        return null
    }



    return (
        <AccordionItem value={section.id} className="rounded-none group">
            <AccordionTrigger className="text-sm px-3 py-3 mb-0 rounded-none hover:no-underline hover:bg-zinc-50 data-[state=open]:bg-violet-50
    data-[state=open]:text-violet-700 group">
                {section.title}
            </AccordionTrigger>

            <AccordionContent className="border-b border-zinc-100 pb-0 last:border-b-0">
                {/* ================= PREDEFINED ITEMS ================= */}
                {section.items.map((item) => {
                    const submission = submissions[item.id] || {}
                    const isEditing = editMode[item.id] || false

                    return (
                        <div
                            key={item.id}
                            className="border-b border-zinc-200 p-4 space-y-3 last-of-type:border-b-0"
                        >
                            <div className="flex justify-between items-center">
                                <div className="text-xs font-medium">{item.label}</div>

                                {isAgency && (
                                    <div className="flex items-center gap-2">
                                        {!submission?.value ? (
                                            <Badge className="bg-zinc-100 text-zinc-500 text-xs py-1 px-2"
                                            >
                                                Not Submitted
                                            </Badge>
                                        ) : (
                                            // <Badge className="bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 py-1 px-2 text-xs capitalize">
                                            //     {submission.status || "Submitted"}
                                            // </Badge>
                                            <Badge
                                                className={`py-1 px-2 text-xs capitalize ${submission.status === "submitted"
                                                        ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                                        : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                                    }`}
                                            >
                                                {submission.status || "Submitted"}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>

                            {renderField(
                                item.id,
                                item.fieldType,
                                submission.value || "",
                                isEditing
                            )}

                            {!isAgency && (
                                <Button size="sm" variant="default">
                                    Submit Data
                                </Button>
                            )}

                            {isAgency && (
                                <div className="flex gap-2 justify-between items-center">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-xs"
                                        onClick={() => toggleEdit(item.id)}
                                    >
                                        {isEditing ? "Disable Edit" : "Enable Edit"}
                                    </Button>
                                    <div className="right-btns space-x-2">
                                        <Button size="sm" variant="destructiveLight" className="text-xs">Reject</Button>
                                        <Button variant="gradient" size="sm" className="text-xs" disabled={submission.status === "approved"}>Approve</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}

                {/* ================= DYNAMIC SECTION ================= */}
                {section.dynamic && (
                    <>
                        {/* ===== If No Data Yet (Agency View Only) ===== */}
                        {isAgency &&
                            (!submissions[section.id] ||
                                submissions[section.id].length === 0) && (
                                <div className="text-destructive inline-block p-4">
                                    Client submission pending.
                                </div>
                            )}

                        {/* ===== If Data Exists ===== */}
                        {(submissions[section.id] || []).map(
                            (row: any, index: number) => {
                                const dynamicId = `${section.id}-${index}`
                                const isEditing = editMode[dynamicId] || false

                                return (
                                    <div
                                        key={index}
                                        className="border-b border-zinc-200 p-4 space-y-3"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div className="font-medium text-xs">{row.name}</div>

                                            {isAgency && (
                                                <div className="flex items-center gap-2">
                                                    {!row?.url ? (
                                                        <Badge className="bg-destructive/10 text-destructive font-light text-xs py-1 px-2"
                                                        >
                                                            Not Submitted
                                                        </Badge>
                                                    ) : (
                                                        <Badge className={`py-1 px-2 text-xs capitalize ${row.status === "submitted"
                                                                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                                                                : "bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                                                            }`}>
                                                            {row.status || "Submitted"}
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {isAgency ? (
                                            <>
                                                <Input
                                                    value={row.name}
                                                    disabled={!isEditing}
                                                />
                                                <Input
                                                    value={row.url}
                                                    disabled={!isEditing}
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <Input
                                                    defaultValue={row.name}
                                                    onChange={() => { }}
                                                />
                                                <Input
                                                    defaultValue={row.url}
                                                    onChange={() => { }}
                                                />
                                            </>
                                        )}

                                        {isAgency && (
                                            <div className="flex justify-between items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => toggleEdit(dynamicId)}
                                                    className="text-xs"
                                                >
                                                    {isEditing
                                                        ? "Disable Edit"
                                                        : "Enable Edit"}
                                                </Button>
                                                <div className="right-btns space-x-2">
                                                    <Button size="sm" variant="destructiveLight" className="text-xs">Reject</Button>
                                                    <Button size="sm" className="text-xs" variant="gradient" disabled={row.status === "approved"}>Approve</Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                        )}

                        {/* ===== Client Add Row ===== */}
                        {!isAgency && (
                            <div className="border-b border-zinc-200 p-4 space-y-3 last-of-type:border-b-0 bg-white">
                                {localRows.map((row, index) => (
                                    <div key={index} className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
                                        <div className="form-contents">
                                            <Input
                                                placeholder="Name"
                                                value={row.name}
                                                className="border-0 rounded-none border-b border-zinc-200 text-xs py-3! h-auto"
                                                onChange={(e) => {
                                                    const updated = [...localRows]
                                                    updated[index].name = e.target.value
                                                    setLocalRows(updated)
                                                }}
                                            />

                                            <Input
                                                placeholder="URL"
                                                value={row.url}
                                                className="border-0 rounded-none border-b border-zinc-200 text-xs py-3! h-auto"
                                                onChange={(e) => {
                                                    const updated = [...localRows]
                                                    updated[index].url = e.target.value
                                                    setLocalRows(updated)
                                                }}
                                            />
                                        </div>
                                        <div className="flex gap-2 bg-zinc-50 p-3">
                                            <Button size="sm" variant="default">Submit Data</Button>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="ghost"
                                    onClick={addRow}
                                    className="w-full"
                                >
                                    + Add New Row
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </AccordionContent>
        </AccordionItem>
    )
}