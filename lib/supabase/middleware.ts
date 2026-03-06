import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

export async function middleware(req: { cookies: {
    getAll(): Promise<{ name: string; value: string; }[] | null> | { name: string; value: string; }[] | null; get: (arg0: string) => { (): any; new(): any; value: string | Promise<string | null | undefined> | null | undefined } 
}; nextUrl: { pathname: string }; url: string | URL | undefined }) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) =>
          cookies.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          ),
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && req.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return res
}