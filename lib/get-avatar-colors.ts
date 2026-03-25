import { AVATAR_COLOR_CLASSES } from "./avatar-colors"

let fallbackCounter = 0

const normalizeKey = (value?: string | null) => {
  const raw = typeof value === "string" ? value.trim() : ""
  if (!raw || raw === "undefined" || raw === "null") {
    fallbackCounter = (fallbackCounter + 1) % 10_000
    return `fallback-${fallbackCounter}`
  }
  return raw
}

export function getAvatarColor(key?: string | null) {
  const normalized = normalizeKey(key)
  let hash = 0
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0
    hash |= 0
  }
  const index = Math.abs(hash) % AVATAR_COLOR_CLASSES.length
  return AVATAR_COLOR_CLASSES[index]
}
