import { ConnectionLineType, type EdgeTypes } from '@xyflow/react'
import { FoSmartEdge } from './FoSmartEdge'
import { FoWirelessEdge } from './FoWirelessEdge'
import { setActiveEdgePathStyle } from './activePathStyle'
import type { EdgePathStyle } from '../settings/types'

export { setActiveEdgePathStyle } from './activePathStyle'

export const foEdgeTypes: EdgeTypes = {
  foSmart: FoSmartEdge,
  foWireless: FoWirelessEdge,
}

/**
 * Semua gaya jalur memakai FoSmartEdge agar ikon Patchcord/Sleeve selalu bisa digambar.
 * Gaya aktual dibaca dari setActiveEdgePathStyle().
 */
export function edgeTypeFromStyle(style: EdgePathStyle): string {
  setActiveEdgePathStyle(style)
  return 'foSmart'
}

export function connectionLineTypeFromStyle(style: EdgePathStyle): ConnectionLineType {
  switch (style) {
    case 'straight':
      return ConnectionLineType.Straight
    case 'step':
      return ConnectionLineType.Step
    case 'smoothstep':
    case 'smart':
      return ConnectionLineType.SmoothStep
    case 'bezier':
    default:
      return ConnectionLineType.Bezier
  }
}
