import { Suspense } from "react"
import { AuthCallbackClient } from "./client"

export const dynamic = "force-dynamic"

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Completing sign-in...</div>}>
      <AuthCallbackClient />
    </Suspense>
  )
}
