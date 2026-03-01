// import { ICON_COLOR_CLASSES } from "./icon-colors";

// export function getIconColor(key: string) {
//   let hash = 0;

//   for (let i = 0; i < key.length; i++) {
//     hash = key.charCodeAt(i) + ((hash << 5) - hash);
//   }

//   const index = Math.abs(hash) % ICON_COLOR_CLASSES.length;
//   return ICON_COLOR_CLASSES[index];
// }

import { ICON_COLOR_CLASSES } from "./icon-colors";

export function getIconColor(index: number) {
  return ICON_COLOR_CLASSES[index % ICON_COLOR_CLASSES.length];
}