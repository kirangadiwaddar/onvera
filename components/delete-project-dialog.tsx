"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface Props {
  open: boolean
  setOpen: (open: boolean) => void
  projectId: number
  projectTitle: string
  onDeleted?: () => void
}

export function DeleteProjectDialog({
  open,
  setOpen,
  projectId,
  projectTitle,
  onDeleted,
}: Props) {

const handleDelete = async () => {
  const res = await fetch("/api/projects", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: projectId }),
  })

  if (!res.ok) {
    toast.error("Failed to delete project")
    return
  }

  toast.success("Project deleted")
  onDeleted?.()
}

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete Project
          </AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete <strong>{projectTitle}</strong>?  
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>

      </AlertDialogContent>

    </AlertDialog>
  )
}