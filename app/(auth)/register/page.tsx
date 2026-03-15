import { Suspense } from "react"
import { RegisterForm } from "@/components/register-form"

export const dynamic = "force-dynamic"

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <RegisterForm />
    </Suspense>
  )
}
