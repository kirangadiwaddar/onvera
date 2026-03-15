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

type DeleteProjectAlertProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectTitle?: string
  loading?: boolean
  onConfirm: () => Promise<void> | void
}

export function DeleteProjectAlert({
  open,
  onOpenChange,
  projectTitle,
  loading = false,
  onConfirm,
}: DeleteProjectAlertProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Project?</AlertDialogTitle>
          <AlertDialogDescription>
            {projectTitle
              ? `This will permanently delete "${projectTitle}".`
              : "This will permanently delete this project."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={loading}
            onClick={() => {
              void onConfirm()
            }}
          >
            {loading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
