import { useMemo, type ReactNode } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  useStore,
  type Edge,
  type EdgeProps,
  type Node,
  Position,
} from '@xyflow/react'
import { Cable, Link2 } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { getActiveEdgePathStyle } from './activePathStyle'
import { getSmartEdgePath, type ObstacleRect } from './smartPath'
import type { FoEdgeData, FoNodeData } from '../types/fo'
import { normalizeEdgeData } from '../utils/edgeData'
import './FoSmartEdge.css'

function nodeToRect(node: Node): ObstacleRect | null {
  const measured = node.measured
  const w =
    (measured?.width && measured.width > 0 ? measured.width : undefined) ??
    (typeof node.width === 'number' && node.width > 0 ? node.width : undefined) ??
    200
  const h =
    (measured?.height && measured.height > 0 ? measured.height : undefined) ??
    (typeof node.height === 'number' && node.height > 0 ? node.height : undefined) ??
    120
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return {
    x: node.position.x,
    y: node.position.y,
    width: w,
    height: h,
  }
}

function AccessoryIcons({
  x,
  y,
  ux,
  uy,
  hasPatchcord,
  hasSleeve,
  end,
  patchcordTitle,
  sleeveTitle,
}: {
  x: number
  y: number
  ux: number
  uy: number
  hasPatchcord: boolean
  hasSleeve: boolean
  end: 'source' | 'target'
  patchcordTitle: string
  sleeveTitle: string
}) {
  if (!hasPatchcord && !hasSleeve) return null
  // Jauhkan sedikit dari handle agar tidak tertutup body node
  const along = end === 'source' ? 22 : -22
  const baseX = x + ux * along
  const baseY = y + uy * along
  const icons: { key: string; node: ReactNode; className: string; title: string }[] = []
  if (hasPatchcord) {
    icons.push({
      key: 'pc',
      className: 'fo-edge-acc fo-edge-acc-pc',
      title: patchcordTitle,
      node: <Cable size={12} strokeWidth={2.5} />,
    })
  }
  if (hasSleeve) {
    icons.push({
      key: 'sl',
      className: 'fo-edge-acc fo-edge-acc-sl',
      title: sleeveTitle,
      node: <Link2 size={12} strokeWidth={2.5} />,
    })
  }
  // Vertikal (tali naik/turun) → ikon bertumpuk; horisontal → berjejer kiri-kanan
  const vertical = Math.abs(uy) >= Math.abs(ux)
  const gap = 18
  const total = (icons.length - 1) * gap

  return (
    <>
      {icons.map((icon, i) => {
        const offset = i * gap - total / 2
        const ix = vertical ? baseX : baseX + offset
        const iy = vertical ? baseY + offset : baseY
        return (
          <div
            key={`${end}-${icon.key}`}
            className={`nodrag nopan ${icon.className}`}
            title={icon.title}
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${ix}px,${iy}px)`,
              pointerEvents: 'none',
              zIndex: 1002,
            }}
          >
            {icon.node}
          </div>
        )
      })}
    </>
  )
}

function computePath(args: {
  pathStyle: ReturnType<typeof getActiveEdgePathStyle>
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  obstacles: ObstacleRect[]
  sourceRect: ObstacleRect | null
  targetRect: ObstacleRect | null
}): { path: string; labelX: number; labelY: number } {
  const {
    pathStyle,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    obstacles,
    sourceRect,
    targetRect,
  } = args

  if (pathStyle === 'smart') {
    return getSmartEdgePath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      obstacles,
      sourceRect,
      targetRect,
    })
  }

  if (pathStyle === 'straight') {
    const [path, labelX, labelY] = getStraightPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
    })
    return { path, labelX, labelY }
  }

  if (pathStyle === 'step' || pathStyle === 'smoothstep') {
    const [path, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: pathStyle === 'step' ? 0 : 12,
      offset: 20,
    })
    return { path, labelX, labelY }
  }

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  })
  return { path, labelX, labelY }
}

export function FoSmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  label,
  labelStyle,
  labelShowBg,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  data,
}: EdgeProps<Edge<FoEdgeData>>) {
  const { t } = useI18n()
  const pathStyle = getActiveEdgePathStyle()

  const nodesSig = useStore((s) => {
    const parts: string[] = []
    for (const n of s.nodes) {
      const m = n.measured
      parts.push(
        `${n.id}:${n.position.x.toFixed(1)},${n.position.y.toFixed(1)},${m?.width ?? 0}x${m?.height ?? 0},${n.hidden ? 1 : 0}`,
      )
    }
    return parts.join('|')
  })
  const nodes = useStore((s) => s.nodes as Node<FoNodeData>[])

  const { obstacles, sourceRect, targetRect } = useMemo(() => {
    const rects: ObstacleRect[] = []
    let src: ObstacleRect | null = null
    let tgt: ObstacleRect | null = null
    for (const node of nodes) {
      if (node.hidden) continue
      const rect = nodeToRect(node)
      if (!rect) continue
      rects.push(rect)
      if (node.id === source) src = rect
      if (node.id === target) tgt = rect
    }
    return { obstacles: rects, sourceRect: src, targetRect: tgt }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, nodesSig, source, target])

  const { path, labelX, labelY } = useMemo(
    () =>
      computePath({
        pathStyle,
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        obstacles,
        sourceRect,
        targetRect,
      }),
    [
      pathStyle,
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      obstacles,
      sourceRect,
      targetRect,
    ],
  )

  const edgeData = normalizeEdgeData(data)
  const hasPatchcord = Boolean(edgeData.hasPatchcord)
  const hasSleeve = Boolean(edgeData.hasSleeve)
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len

  const labelColor =
    labelStyle && typeof labelStyle === 'object' && 'fill' in labelStyle
      ? String((labelStyle as { fill?: string }).fill ?? '#44403c')
      : '#44403c'

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {hasPatchcord || hasSleeve ? (
          <>
            <AccessoryIcons
              x={sourceX}
              y={sourceY}
              ux={ux}
              uy={uy}
              hasPatchcord={hasPatchcord}
              hasSleeve={hasSleeve}
              end="source"
              patchcordTitle={t('edgeHasPatchcord')}
              sleeveTitle={t('edgeHasSleeve')}
            />
            <AccessoryIcons
              x={targetX}
              y={targetY}
              ux={ux}
              uy={uy}
              hasPatchcord={hasPatchcord}
              hasSleeve={hasSleeve}
              end="target"
              patchcordTitle={t('edgeHasPatchcord')}
              sleeveTitle={t('edgeHasSleeve')}
            />
          </>
        ) : null}
        {label ? (
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
              fontSize: 11,
              fontWeight: 650,
              color: labelColor,
              zIndex: 1001,
              background: labelShowBg
                ? ((labelBgStyle as { fill?: string } | undefined)?.fill ?? '#fffdf8')
                : undefined,
              padding: labelShowBg
                ? labelBgPadding
                  ? `${labelBgPadding[0]}px ${labelBgPadding[1]}px`
                  : '4px 6px'
                : undefined,
              borderRadius: labelShowBg ? (labelBgBorderRadius ?? 4) : undefined,
            }}
          >
            {label}
          </div>
        ) : null}
      </EdgeLabelRenderer>
    </>
  )
}
