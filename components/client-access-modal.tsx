"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

export default function ClientAccessModal({
  open,
  setOpen,
  project
}: any) {

  const link =
    `${window.location.origin}/client-onboarding/${project.client_token}`

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (

    <Dialog open={open} onOpenChange={setOpen}>

      <DialogContent>

        <DialogHeader>
          <DialogTitle>Client Access</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div>
            <p className="text-sm font-medium mb-1">Client Link</p>

            <div className="flex gap-2">

              <input
                value={link}
                readOnly
                className="border rounded px-3 py-2 w-full text-sm"
              />

              <Button
                variant="secondary"
                onClick={() => copy(link)}
              >
                Copy
              </Button>

            </div>
          </div>

          {project.client_password && (

            <div>

              <p className="text-sm font-medium mb-1">Password</p>

              <div className="flex gap-2">

                <input
                  value={project.client_password}
                  readOnly
                  className="border rounded px-3 py-2 w-full text-sm"
                />

                <Button
                  variant="secondary"
                  onClick={() => copy(project.client_password)}
                >
                  Copy
                </Button>

              </div>

            </div>

          )}

        </div>

      </DialogContent>

    </Dialog>

  )

}