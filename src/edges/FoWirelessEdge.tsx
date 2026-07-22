import { useNodes, type Edge, type EdgeProps } from '@xyflow/react'
import type { FoEdgeData, FoNodeData } from '../types/fo'

/**
 * Koneksi WiFi visual: gelombang ) ) ) antara ONU ↔ Smartphone.
 * Semakin jauh jaraknya → semakin banyak & padat gelombangnya.
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

  // Jarak jauh → spacing mengecil + jumlah busur naik (gelombang lebih padat)
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
      opacity: 0.3 + (i / Math.max(count - 1, 1)) * 0.5,
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
          strokeWidth={dhcpOk ? 2.4 : 2}
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
