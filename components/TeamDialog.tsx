"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

import { Plus, Trash } from "lucide-react"
import { toast } from "sonner"
import { Textarea } from "./ui/textarea"
import { useRouter } from "next/navigation"
import type { Team } from "@/types/team"

interface Member {
  name: string
  email: string
  role: "lead" | "member"
  designation: string
}

interface TeamDialogProps {
  team?: Team
  onSaved?: (team: Team) => void
  onTeamUpdated?: (team: Team) => void
  onClose?: () => void
}

export function TeamDialog({
  team,
  onSaved,
  onTeamUpdated,
  onClose
}: TeamDialogProps) {

  const router = useRouter()


  // const [open, setOpen] = useState(false)
  const [teamName, setTeamName] = useState("")
  const [description, setDescription] = useState("")
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(false)
  const isEdit = !!team

const [open, setOpen] = useState(!!team)

useEffect(() => {
  if (team) {
    setOpen(true)
  }
}, [team])

  /* Prefill values for edit mode */
  useEffect(() => {
    if (team) {
      setTeamName(team.name || "")
      setDescription(team.description || "")
    }
  }, [team])

const addMember = () => {
  setMembers(prev => [
    ...prev,
    { name: "", email: "", role: "member", designation: "", }
  ])
}

  const removeMember = (index: number) => {
    const updated = [...members]
    updated.splice(index, 1)
    setMembers(updated)
  }

const updateMember = (index: number, field: string, value: string) => {

  if (field === "role" && value === "lead") {

    const leadExists = members.some(
      (m, i) => m.role === "lead" && i !== index
    )

    if (leadExists) {
      toast.error("Only one team lead allowed")
      return
    }
  }

  const updated = [...members]
  updated[index] = { ...updated[index], [field]: value }
  setMembers(updated)
}

const handleSubmit = async () => {

  if (!teamName) {
    toast.error("Team name required")
    return
  }

  // validate members BEFORE API call
  if (!isEdit) {

    if (members.length === 0) {
      toast.error("Add at least one team member")
      return
    }

    const leadExists = members.some(m => m.role === "lead")

    if (!leadExists) {
      toast.error("Team must have a lead")
      return
    }
  }

  setLoading(true)

  const method = isEdit ? "PATCH" : "POST"

  try {

    const res = await fetch("/api/teams", {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        id: team?.id,
        name: teamName,
        description,
        members
      })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || "Failed to save team")
    }

    if (isEdit) {

      toast.success(`"${data.name}" updated successfully`)
      onTeamUpdated?.(data)

    } else {

      toast.success("Team created")

      onSaved?.(data)

      // reset form
      setMembers([])
      setTeamName("")
      setDescription("")

      router.push(`/teams/${data.slug}`)
    }

    onClose?.()
    setOpen(false)

  } catch (err: any) {

    toast.error(err.message)

  } finally {

    setLoading(false)

  }
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>

      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus size={16} /> Create Team
          </Button>
        </DialogTrigger>
      )}

      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Team" : "Create Team"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* Team Name */}
          <div>
            <Label>Team Name</Label>
            <Input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Members (create mode only) */}
          {!isEdit && (
            <div className="space-y-3">

              <Label>Team Members</Label>

              {members.map((member, index) => (

                <div key={index} className="flex gap-2 items-center">

                  <Input
                    placeholder="Name"
                    value={member.name}
                    onChange={(e) =>
                      updateMember(index, "name", e.target.value)
                    }
                  />

                  <Input
                    placeholder="Email"
                    value={member.email}
                    onChange={(e) =>
                      updateMember(index, "email", e.target.value)
                    }
                  />
                  <Input
  placeholder="Designation"
  value={member.designation}
  onChange={(e) =>
    updateMember(index, "designation", e.target.value)
  }
/>

                  <Select
                    value={member.role}
                    onValueChange={(value) =>
                      updateMember(index, "role", value)
                    }
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
  <SelectItem value="lead">Lead</SelectItem>
  <SelectItem value="member">Member</SelectItem>
</SelectContent>

                  </Select>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMember(index)}
                  >
                    <Trash size={16} />
                  </Button>

                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addMember}
              >
                <Plus size={14} className="mr-1" />
                Add Member
              </Button>

            </div>
          )}

          <Button
          type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading
              ? isEdit
                ? "Updating..."
                : "Creating..."
              : isEdit
              ? "Update Team"
              : "Create Team"}
          </Button>

        </div>

      </DialogContent>

    </Dialog>
  )
}