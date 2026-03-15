import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const redirectUrl = new URL("/", request.url)
  return NextResponse.redirect(redirectUrl)
}
