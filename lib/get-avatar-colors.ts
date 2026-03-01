import { AVATAR_COLOR_CLASSES } from "./avatar-colors";

export function getAvatarColor(key: string) {
  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % AVATAR_COLOR_CLASSES.length;
  return AVATAR_COLOR_CLASSES[index];
}