"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

import { toast } from "sonner"
import { Plus } from "lucide-react"

interface InviteMemberDialogProps {
  teamId: number
  leadExists: boolean
  onAdded: (member: any) => void
}

export function InviteMemberDialog({
  teamId,
  leadExists,
  onAdded
}: InviteMemberDialogProps) {

  const [open, setOpen] = useState(false)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"member" | "lead">("member")
  const [designation, setDesignation] = useState("")

  const [loading, setLoading] = useState(false)

  async function invite() {

    if (!name || !email) {
      toast.error("Name and email required")
      return
    }

    if (role === "lead" && leadExists) {
      toast.error("A lead already exists. Remove or change them first.")
      return
    }

    setLoading(true)

    try {

      const res = await fetch("/api/team-members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          team_id: teamId,
          name,
          email,
          role,
          designation
        })
      })

     const text = await res.text()
const data = text ? JSON.parse(text) : null

      if (!res.ok) {
        throw new Error(data?.error || "Failed to invite")
      }

      toast.success("Member added")

      onAdded(data)

      // reset fields
      setName("")
      setEmail("")
      setRole("member")

      setOpen(false)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>

      <DialogTrigger asChild>
        <Button variant="gradient">
          <Plus size={16} /> Invite Member
        </Button>
      </DialogTrigger>

      <DialogContent>

        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div>
            <Label>Name</Label>
            <Input
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="john@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
  <Label>Designation</Label>
  <Input
    value={designation}
    onChange={(e) => setDesignation(e.target.value)}
  />
</div>

          <div>
            <Label>Role</Label>

            <Select
              value={role}
              onValueChange={(value: "member" | "lead") =>
                setRole(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="member">
                  Member
                </SelectItem>

                <SelectItem
                  value="lead"
                  disabled={leadExists}
                >
                  Lead
                </SelectItem>
              </SelectContent>

            </Select>

            {leadExists && (
              <p className="text-xs text-muted-foreground mt-1">
                This team already has a lead.
              </p>
            )}

          </div>

          <Button
            onClick={invite}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Adding..." : "Add Member"}
          </Button>

        </div>

      </DialogContent>

    </Dialog>
  )
}