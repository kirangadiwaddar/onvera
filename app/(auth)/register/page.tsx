



// return (
//   <div>
//     <h1>Register</h1>

//     <input
//       type="text"
//       placeholder="Display name"
//       onChange={(e) => setDisplayName(e.target.value)}
//     />

//     <input
//       type="email"
//       placeholder="email"
//       onChange={(e) => setEmail(e.target.value)}
//     />

//     <input
//       type="password"
//       placeholder="password"
//       onChange={(e) => setPassword(e.target.value)}
//     />

//     <button onClick={handleSignup}>Register</button>
//   </div>
// );

"use client";

import { useState } from "react";
import { signup } from "@/services/auth";
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

export default function RegisterForm() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();

  const { error } = await signup(email, password, displayName);

  if (error) {
    alert(error.message);
  } else {
    alert("Account created!");
  }
};

  return (
    <form className="flex flex-col gap-6">
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
          <Input
            type="text"
            placeholder="Display name"
            required
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            type="email"
            placeholder="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
          </div>
          <Input
            type="password"
            placeholder="password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
          </div>
          <Input id="confirm-password" type="password" required />
        </Field>
        <Field>
          <Button type="button" variant="gradient" size="lg" onClick={handleSignup}>Register <ArrowRight /></Button>
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

