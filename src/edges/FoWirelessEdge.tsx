import { useNodes, type Edge, type EdgeProps } from '@xyflow/react'
import type { FoEdgeData, FoNodeData } from '../types/fo'

/**
 * Koneksi WiFi visual: gelombang ) ) ) antara ONU ↔ Smartphone.
 * Semakin jauh → semakin padat.
 * Animasi hanya jika smartphone sudah dapat IP (DHCP); tanpa IP → statis.
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

  const mx = (sourceX + targetX) / 2
  const my = (sourceY + targetY) / 2
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux

  const spacing = Math.max(5, 17 - len * 0.03)
  const usable = len * 0.8
  const count = Math.max(6, Math.min(30, Math.round(usable / spacing)))

  const startT = 0.08
  const endT = 0.92
  const radiusStep = Math.max(1.2, 3.2 - len * 0.0045)

  const arcs = Array.from({ length: count }, (_, i) => {
    const t =
      count <= 1 ? 0.5 : startT + ((endT - startT) * i) / (count - 1)
    const cx = sourceX + dx * t
    const cy = sourceY + dy * t
    const r = 5 + i * radiusStep
    const a0 = Math.atan2(uy, ux) - Math.PI / 2.35
    const a1 = Math.atan2(uy, ux) + Math.PI / 2.35
    const x1 = cx + Math.cos(a0) * r
    const y1 = cy + Math.sin(a0) * r
    const x2 = cx + Math.cos(a1) * r
    const y2 = cy + Math.sin(a1) * r
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`,
      delay: (i / count) * 0.55,
      opacity: hasIp
        ? 0.35 + (i / Math.max(count - 1, 1)) * 0.5
        : 0.4 + (i / Math.max(count - 1, 1)) * 0.25,
    }
  })

  const labelX = mx + px * 12
  const labelY = my + py * 12

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
          stroke={hasIp ? '#0284c7' : '#a78bfa'}
          strokeWidth={hasIp ? 2.4 : 2}
          strokeLinecap="round"
          opacity={arc.opacity}
          className={`fo-wifi-arc ${hasIp ? 'dhcp' : 'static'}`}
          style={hasIp ? { animationDelay: `${arc.delay}s` } : undefined}
        />
      ))}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fo-wifi-label"
        fill={hasIp ? '#0369a1' : '#7c3aed'}
        fontSize={9}
        fontWeight={700}
        fontFamily="IBM Plex Sans, sans-serif"
      >
        WiFi
      </text>
    </g>
  )
}
