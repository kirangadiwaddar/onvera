export function createPrivateApiCacheHeaders(
  maxAgeSeconds: number,
  staleWhileRevalidateSeconds = maxAgeSeconds * 3,
) {
  return {
    "Cache-Control": `private, max-age=${maxAgeSeconds}, stale-while-revalidate=${staleWhileRevalidateSeconds}`,
    Vary: "Authorization, x-workspace-id",
  }
}
