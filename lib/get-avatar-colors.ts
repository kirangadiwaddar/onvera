import { AVATAR_COLOR_CLASSES } from "./avatar-colors"

let nextAvatarColorIndex = 0

export function getAvatarColor(key: string) {
  void key
  const index = nextAvatarColorIndex % AVATAR_COLOR_CLASSES.length
  nextAvatarColorIndex += 1
  return AVATAR_COLOR_CLASSES[index]
}
