#!/usr/bin/env node

const baseUrl = (process.env.ONVERA_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")
const authToken = (process.env.ONVERA_AUTH_TOKEN || "").trim()
const workspaceId = (process.env.ONVERA_WORKSPACE_ID || "").trim()
const runs = Math.max(1, Number.parseInt(process.env.ONVERA_PERF_RUNS || "3", 10) || 3)

if (!authToken) {
  console.error("Missing ONVERA_AUTH_TOKEN")
  console.error("Example:")
  console.error("  ONVERA_AUTH_TOKEN=... ONVERA_WORKSPACE_ID=... npm run perf:smoke")
  process.exit(1)
}

const endpoints = [
  "/api/auth/me",
  "/api/workspaces",
  "/api/projects?summary=1",
  "/api/notifications?limit=10",
  "/api/dashboard-counts",
  "/api/dashboard-projects-summary",
  "/api/dashboard-recent-activity?limit=20",
]

function formatMs(ms) {
  return `${ms.toFixed(1)}ms`
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function timedFetch(path) {
  const headers = {
    Authorization: `Bearer ${authToken}`,
  }

  if (workspaceId && workspaceId !== "__create__") {
    headers["x-workspace-id"] = workspaceId
  }

  const startedAt = performance.now()
  const response = await fetch(`${baseUrl}${path}`, {
    headers,
    cache: "no-store",
  })
  const text = await response.text()
  const endedAt = performance.now()

  return {
    path,
    status: response.status,
    durationMs: endedAt - startedAt,
    bytes: Buffer.byteLength(text, "utf8"),
  }
}

async function main() {
  console.log(`Base URL: ${baseUrl}`)
  console.log(`Workspace: ${workspaceId || "(none)"}`)
  console.log(`Runs per endpoint: ${runs}`)
  console.log("")

  for (const path of endpoints) {
    const results = []

    for (let index = 0; index < runs; index += 1) {
      try {
        const result = await timedFetch(path)
        results.push(result)
      } catch (error) {
        console.log(`${path}`)
        console.log(`  run ${index + 1}: failed - ${error instanceof Error ? error.message : "unknown error"}`)
        console.log("")
      }
    }

    if (results.length === 0) continue

    const totalDuration = results.reduce((sum, result) => sum + result.durationMs, 0)
    const avgDuration = totalDuration / results.length
    const fastest = Math.min(...results.map((result) => result.durationMs))
    const slowest = Math.max(...results.map((result) => result.durationMs))
    const avgBytes = Math.round(results.reduce((sum, result) => sum + result.bytes, 0) / results.length)
    const statuses = Array.from(new Set(results.map((result) => result.status))).join(", ")

    console.log(path)
    console.log(`  status: ${statuses}`)
    console.log(`  avg: ${formatMs(avgDuration)}`)
    console.log(`  fast/slow: ${formatMs(fastest)} / ${formatMs(slowest)}`)
    console.log(`  avg payload: ${formatBytes(avgBytes)}`)
    results.forEach((result, index) => {
      console.log(`  run ${index + 1}: ${formatMs(result.durationMs)} • ${formatBytes(result.bytes)}`)
    })
    console.log("")
  }
}

void main()
