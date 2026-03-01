import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-medium">Register for an account</h1>
          <p className="text-muted-foreground text-xs text-balance mt-2">
            Enter your details to create a new account.
          </p>
        </div>
        {/* <FieldSeparator></FieldSeparator> */}
        <Field>
          <FieldLabel htmlFor="fullname">Full Name</FieldLabel>
          <Input id="fullname" type="text" placeholder="Write your full name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="Write your email address" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <Input id="password" type="password" required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          </div>
          <Input id="confirm-password" type="password" required />
        </Field>
        <Field>
          <Button type="submit" variant="gradient" size="lg">Register <ArrowRight /></Button>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium no-underline!">
              Login
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  )
}
