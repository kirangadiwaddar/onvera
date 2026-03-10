import { NextResponse } from "next/server"

type CookieStat = {
  name: string
  valueBytes: number
  pairBytes: number
}

function parseCookieHeader(header: string) {
  const items = header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)

  const stats: CookieStat[] = items.map((item) => {
    const separatorIndex = item.indexOf("=")
    const name = separatorIndex >= 0 ? item.slice(0, separatorIndex) : item
    const value = separatorIndex >= 0 ? item.slice(separatorIndex + 1) : ""
    return {
      name,
      valueBytes: Buffer.byteLength(value, "utf8"),
      pairBytes: Buffer.byteLength(item, "utf8"),
    }
  })

  return stats.sort((a, b) => b.pairBytes - a.pairBytes)
}

export async function GET(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ message: "Not found" }, { status: 404 })
  }

  const cookieHeader = request.headers.get("cookie") ?? ""
  const cookieHeaderBytes = Buffer.byteLength(cookieHeader, "utf8")
  const cookies = parseCookieHeader(cookieHeader)

  return NextResponse.json({
    cookieHeaderBytes,
    cookieCount: cookies.length,
    largestCookies: cookies.slice(0, 20),
  })
}
