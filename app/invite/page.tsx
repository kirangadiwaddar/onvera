import { Suspense } from "react"
import { LoadingState } from "@/components/loadingState"
import InviteClient from "./invite-client"

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-6">
          <LoadingState title="Loading invite..." description="Checking your invite link." />
        </div>
      }
    >
      <InviteClient />
    </Suspense>
  )
}
