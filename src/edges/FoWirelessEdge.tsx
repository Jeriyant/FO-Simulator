import { useNodes, type Edge, type EdgeProps } from '@xyflow/react'
import type { FoEdgeData, FoNodeData } from '../types/fo'

/**
 * Koneksi WiFi visual: gelombang ) ) ) ) padat antara ONU ↔ Smartphone.
 * Animasi lebih hidup jika smartphone sudah dapat DHCP Mikrotik.
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
  const dhcpOk = td?.type === 'smartphone' && Boolean(td.online)

  const mx = (sourceX + targetX) / 2
  const my = (sourceY + targetY) / 2
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py = ux

  // Lebih banyak busur (padat): 8 gelombang
  const arcs = Array.from({ length: 8 }, (_, i) => {
    const t = 0.12 + i * 0.1
    const cx = sourceX + dx * t
    const cy = sourceY + dy * t
    const r = 7 + i * 3.2
    const a0 = Math.atan2(uy, ux) - Math.PI / 2.35
    const a1 = Math.atan2(uy, ux) + Math.PI / 2.35
    const x1 = cx + Math.cos(a0) * r
    const y1 = cy + Math.sin(a0) * r
    const x2 = cx + Math.cos(a1) * r
    const y2 = cy + Math.sin(a1) * r
    return {
      d: `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`,
      delay: i * 0.08,
      opacity: 0.35 + i * 0.08,
    }
  })

  const labelX = mx + px * 12
  const labelY = my + py * 12

  return (
    <g
      className={`fo-wireless-waves ${dhcpOk ? 'is-dhcp' : 'is-wifi-only'}`}
      data-id={id}
    >
      {arcs.map((arc, i) => (
        <path
          key={i}
          d={arc.d}
          fill="none"
          stroke={dhcpOk ? '#0284c7' : '#a78bfa'}
          strokeWidth={dhcpOk ? 2.6 : 2.2}
          strokeLinecap="round"
          opacity={arc.opacity}
          className={`fo-wifi-arc ${dhcpOk ? 'dhcp' : 'static'}`}
          style={dhcpOk ? { animationDelay: `${arc.delay}s` } : undefined}
        />
      ))}
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fo-wifi-label"
        fill={dhcpOk ? '#0369a1' : '#7c3aed'}
        fontSize={9}
        fontWeight={700}
        fontFamily="IBM Plex Sans, sans-serif"
      >
        WiFi
      </text>
    </g>
  )
}
