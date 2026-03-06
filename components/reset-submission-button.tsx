"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"

export default function ResetSubmissionsButton() {

  const [loading, setLoading] = useState(false)

  const handleReset = async () => {

    try {

      setLoading(true)

      const res = await fetch("/api/dev/reset-submissions", {
        method: "POST",
      })

      if (!res.ok) {
        alert("Reset failed")
        return
      }

      alert("All submissions cleared")

      window.location.reload()

    } catch (err) {

      console.error(err)
      alert("Something went wrong")

    } finally {

      setLoading(false)

    }

  }

  return (

    <AlertDialog>

      <AlertDialogTrigger asChild>

        <Button
          variant="destructive"
          size="sm"
        >
          Reset Submissions
        </Button>

      </AlertDialogTrigger>

      <AlertDialogContent>

        <AlertDialogHeader>

          <AlertDialogTitle>
            Reset All Submissions?
          </AlertDialogTitle>

          <AlertDialogDescription>
            This will permanently delete all client uploads and
            custom sections from every project. This action
            cannot be undone.
          </AlertDialogDescription>

        </AlertDialogHeader>

        <AlertDialogFooter>

          <AlertDialogCancel>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleReset}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Resetting..." : "Reset Everything"}
          </AlertDialogAction>

        </AlertDialogFooter>

      </AlertDialogContent>

    </AlertDialog>

  )

}