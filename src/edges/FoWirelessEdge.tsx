import { useNodes, type Edge, type EdgeProps } from '@xyflow/react'
import type { FoEdgeData, FoNodeData } from '../types/fo'

/** Warna tali idle (tanpa live / tanpa WiFi IP) */
const STROKE_IDLE = '#a8a29e'
/** Warna tali LAN/DHCP hidup */
const STROKE_LIVE = '#0284c7'

/**
 * Koneksi WiFi visual: gelombang ) ) ) antara ONU ↔ Smartphone.
 * Tanpa IP → abu-abu statis (seperti tali idle).
 * Ada IP → biru + animasi dash seperti tali hidup.
 */
export function FoWirelessEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  target,
}: EdgeProps<Edge<FoEdgeData>>) {
  const nodes = useNodes()
  const targetNode = nodes.find((n) => n.id === target)
  const td = targetNode?.data as FoNodeData | undefined
  const hasIp =
    td?.type === 'smartphone' &&
    Boolean(td.online) &&
    Boolean(String(td.ipAddress ?? '').trim())

  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len

  // Kepadatan dikurangi sedikit vs sebelumnya
  const spacing = Math.max(9, 24 - len * 0.02)
  const usable = len * 0.78
  const count = Math.max(5, Math.min(16, Math.round(usable / spacing)))

  const startT = 0.1
  const endT = 0.9
  const radiusStep = Math.max(1.6, 3.6 - len * 0.0035)

  const arcs = Array.from({ length: count }, (_, i) => {
    const t =
      count <= 1 ? 0.5 : startT + ((endT - startT) * i) / (count - 1)
    const cx = sourceX + dx * t
    const cy = sourceY + dy * t
    const r = 5.5 + i * radiusStep
    const a0 = Math.atan2(uy, ux) - Math.PI / 2.35
    const a1 = Math.atan2(uy, ux) + Math.PI / 2.35
    const x1 = cx + Math.cos(a0) * r
    const y1 = cy + Math.sin(a0) * r
    const x2 = cx + Math.cos(a1) * r
    const y2 = cy + Math.sin(a1) * r
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`,
      opacity: hasIp
        ? 0.55 + (i / Math.max(count - 1, 1)) * 0.35
        : 0.45 + (i / Math.max(count - 1, 1)) * 0.2,
    }
  })

  return (
    <g
      className={`fo-wireless-waves ${hasIp ? 'is-dhcp' : 'is-wifi-only'}`}
      data-id={id}
    >
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={arc.d}
          fill="none"
          stroke={hasIp ? STROKE_LIVE : STROKE_IDLE}
          strokeWidth={hasIp ? 2.4 : 2}
          strokeLinecap="round"
          opacity={arc.opacity}
          className={`fo-wifi-arc ${hasIp ? 'flow' : 'static'}`}
        />
      ))}
    </g>
  )
}
