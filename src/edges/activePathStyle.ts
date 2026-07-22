import type { EdgePathStyle } from '../settings/types'

/** Gaya jalur tali aktif (dibaca custom edge agar ikon aksesori selalu tampil). */
let activeEdgePathStyle: EdgePathStyle = 'smart'

export function setActiveEdgePathStyle(style: EdgePathStyle) {
  activeEdgePathStyle = style
}

export function getActiveEdgePathStyle(): EdgePathStyle {
  return activeEdgePathStyle
}
