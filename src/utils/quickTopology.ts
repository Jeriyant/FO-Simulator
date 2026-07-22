import type { Edge, Node } from '@xyflow/react'
import { SPLITTER_RATIOS, type ComponentType } from '../data/components'
import { tf, type Locale } from '../i18n/translations'
import type { AppSettings } from '../settings/types'
import type { FoEdgeData, FoNodeData } from '../types/fo'
import { createDefaultData } from './calculateLoss'
import { accessoryDefaultsFromSettings, createDefaultEdgeData } from './edgeData'
import { buildComponentLabel, COMPONENT_LABEL_PREFIX } from './naming'

export type QuickTopologyCounts = {
  olt: number
  splitterRatio: number
  splitterBox: number
  onu: number
  onuDual: number
  /** Dihitung otomatis di backend — tidak perlu diisi UI */
  barrel?: number
  /** Rasio awal urutan Splitter Ratio (mis. '1:99', '5:95') */
  startSplitterRatio: string
}

export const DEFAULT_QUICK_COUNTS: QuickTopologyCounts = {
  olt: 1,
  splitterRatio: 1,
  splitterBox: 1,
  onu: 4,
  onuDual: 0,
  startSplitterRatio: '1:99',
}

/** Kebutuhan barel dari aturan rantai topologi (otomatis). */
export function estimateRequiredConnectors(
  counts: Pick<QuickTopologyCounts, 'olt' | 'splitterRatio' | 'splitterBox' | 'onu' | 'onuDual'>,
  _oltPorts = 1,
): { barrel: number } {
  const sr = Math.max(0, Math.floor(counts.splitterRatio))
  const sb = Math.max(0, Math.floor(counts.splitterBox))
  return { barrel: Math.min(sb, sr) }
}

export function applySuggestedConnectors(
  counts: QuickTopologyCounts,
  oltPorts = 1,
): QuickTopologyCounts {
  const req = estimateRequiredConnectors(counts, oltPorts)
  return { ...counts, barrel: req.barrel }
}

type BuildArgs = {
  counts: QuickTopologyCounts
  settings: AppSettings
  existingLabels?: string[]
  origin?: { x: number; y: number }
  locale?: Locale
}

type BuildResult = {
  nodes: Node<FoNodeData>[]
  edges: Edge<FoEdgeData>[]
  warnings: string[]
}

const COL = 200
const ROW = 140
const GAP = 48
/** Tinggi approx barel (ikon + label) — dipakai supaya rantai SR→barel→SB rapat. */
const BARREL_H = 78
const GAP_SR_BARREL = 24
const GAP_BARREL_SB = 24
/** Jarak ekstra SB → ONU (lebih renggang dari GAP biasa). */
const GAP_SB_ONU = 100
const ONU_COLS_MAX = 4

function clampCount(n: number, max = 64): number {
  if (!Number.isFinite(n)) return 0
  return Math.min(max, Math.max(0, Math.floor(n)))
}

function distributeRoundRobin<T>(items: T[], buckets: number): T[][] {
  const groups: T[][] = Array.from({ length: Math.max(buckets, 0) }, () => [])
  if (groups.length === 0) return groups
  items.forEach((item, i) => {
    groups[i % groups.length].push(item)
  })
  return groups
}

function take<T>(pool: T[]): T | null {
  return pool.length ? pool.shift()! : null
}

export function buildQuickTopology({
  counts,
  settings,
  existingLabels = [],
  origin = { x: 80, y: 80 },
  locale = 'id',
}: BuildArgs): BuildResult {
  const oltN = clampCount(counts.olt, 8)
  const srN = clampCount(counts.splitterRatio, 32)
  const sbN = clampCount(counts.splitterBox, 32)
  const onuN = clampCount(counts.onu, 128)
  const onuDualN = clampCount(counts.onuDual ?? 0, 128)
  // Barel selalu dihitung otomatis dari SR↔SB
  const barrelN = estimateRequiredConnectors(
    {
      olt: oltN,
      splitterRatio: srN,
      splitterBox: sbN,
      onu: onuN,
      onuDual: onuDualN,
    },
    Math.min(16, Math.max(1, Math.round(settings.oltPorts || 1))),
  ).barrel
  const oltPorts = Math.min(16, Math.max(1, Math.round(settings.oltPorts || 1)))

  const warnings: string[] = []
  const nodes: Node<FoNodeData>[] = []
  const edges: Edge<FoEdgeData>[] = []
  const usedLabels = [...existingLabels]
  let seq = 1
  const nextNodeId = (type: string) => `${type}-q${seq++}`

  const counters: Partial<Record<ComponentType, number>> = {}
  const nextLabel = (type: ComponentType) => {
    const prefix = COMPONENT_LABEL_PREFIX[type]
    let n = counters[type] ?? 0
    if (n === 0) {
      const pattern = new RegExp(`^${prefix}-(\\d+)$`)
      for (const label of usedLabels) {
        const m = label.match(pattern)
        if (m) n = Math.max(n, Number.parseInt(m[1], 10))
      }
    }
    n += 1
    counters[type] = n
    const label = buildComponentLabel(type, n)
    usedLabels.push(label)
    return label
  }

  const makeNode = (
    type: ComponentType,
    position: { x: number; y: number },
    patch?: (data: FoNodeData) => FoNodeData,
  ): Node<FoNodeData> => {
    const label = nextLabel(type)
    let data = createDefaultData(type, label, settings)
    if (patch) data = patch(data)
    const node: Node<FoNodeData> = {
      id: nextNodeId(type),
      type,
      position,
      data,
    }
    nodes.push(node)
    return node
  }

  const link = (
    source: Node<FoNodeData>,
    target: Node<FoNodeData>,
    sourceHandle: string,
    targetHandle: string,
    accessories?: { hasPatchcord?: boolean; hasSleeve?: boolean },
  ) => {
    const defs = accessoryDefaultsFromSettings(settings)
    edges.push({
      id: `e-q${seq++}`,
      source: source.id,
      target: target.id,
      sourceHandle,
      targetHandle,
      data: createDefaultEdgeData(
        accessories?.hasPatchcord || accessories?.hasSleeve
          ? {
              hasPatchcord: Boolean(accessories?.hasPatchcord),
              hasSleeve: Boolean(accessories?.hasSleeve),
              ...(accessories?.hasPatchcord
                ? {
                    patchcordBrand: defs.patchcordBrand,
                    patchcordUnitPrice: defs.patchcordUnitPrice,
                    patchcordLoss: defs.patchcordLoss,
                  }
                : {}),
              ...(accessories?.hasSleeve
                ? {
                    sleeveBrand: defs.sleeveBrand,
                    sleeveUnitPrice: defs.sleeveUnitPrice,
                    sleeveLoss: defs.sleeveLoss,
                  }
                : {}),
            }
          : undefined,
      ),
    })
  }

  /** Tautan FO dengan Patchcord + Sleeve pada tali (bukan node). */
  const wireHop = (
    from: Node<FoNodeData>,
    to: Node<FoNodeData>,
    fromHandle: string,
    toHandle: string,
  ) => {
    link(from, to, fromHandle, toHandle, { hasPatchcord: true, hasSleeve: true })
  }

  const olts: Node<FoNodeData>[] = []
  for (let i = 0; i < oltN; i++) {
    olts.push(
      makeNode('olt', { x: origin.x, y: origin.y }, (d) => {
        if (d.type !== 'olt') return d
        return { ...d, ports: oltPorts }
      }),
    )
  }

  const srs: Node<FoNodeData>[] = []
  const ratioSpecs = settings.splitterRatios?.length ? settings.splitterRatios : SPLITTER_RATIOS
  const startRatio = counts.startSplitterRatio || settings.splitterRatio || '1:99'
  let startRatioIdx = ratioSpecs.findIndex((s) => s.ratio === startRatio)
  if (startRatioIdx < 0) startRatioIdx = 0

  for (let i = 0; i < srN; i++) {
    const spec = ratioSpecs[(startRatioIdx + i) % ratioSpecs.length]
    srs.push(
      makeNode('splitterRatio', { x: 0, y: 0 }, (d) => {
        if (d.type !== 'splitterRatio') return d
        return {
          ...d,
          ratio: spec.ratio,
          percentSmall: spec.percentSmall,
          percentLarge: spec.percentLarge,
          lossSmall: spec.lossSmall,
          lossLarge: spec.lossLarge,
          brand: spec.brand || d.brand,
          unitPrice:
            typeof spec.unitPrice === 'number' && Number.isFinite(spec.unitPrice)
              ? spec.unitPrice
              : d.unitPrice,
        }
      }),
    )
  }

  const sbs: Node<FoNodeData>[] = []
  for (let i = 0; i < sbN; i++) sbs.push(makeNode('splitterBox', { x: 0, y: 0 }))

  const onus: Node<FoNodeData>[] = []
  for (let i = 0; i < onuN; i++) onus.push(makeNode('onu', { x: 0, y: 0 }))
  for (let i = 0; i < onuDualN; i++) onus.push(makeNode('onuDual', { x: 0, y: 0 }))

  const barrels: Node<FoNodeData>[] = []
  for (let i = 0; i < barrelN; i++) barrels.push(makeNode('barrel', { x: 0, y: 0 }))

  const maxChains = Math.max(olts.length * oltPorts, 0)
  const srChains =
    olts.length > 0 && maxChains > 0 ? distributeRoundRobin(srs, maxChains) : srs.length ? [srs] : []

  const sbsBySr: (Node<FoNodeData> | null)[] = srs.map(() => null)
  let sbIdx = 0
  for (let si = 0; si < srs.length && sbIdx < sbs.length; si++) {
    sbsBySr[si] = sbs[sbIdx++]
  }
  if (sbIdx < sbs.length) {
    warnings.push(
      tf(locale, 'quickWarnSbUnused', { count: sbs.length - sbIdx }),
    )
  }

  const onusBySb: Node<FoNodeData>[][] = sbs.map(() => [])
  const sbCapacity = sbs.map((sb) =>
    sb.data.type === 'splitterBox' ? Math.max(1, sb.data.ports) : 4,
  )
  const connectedSbIndices = sbsBySr
    .filter((sb): sb is Node<FoNodeData> => sb != null)
    .map((sb) => sbs.indexOf(sb))
    .filter((i) => i >= 0)

  let onuIdx = 0
  if (connectedSbIndices.length === 0) {
    if (onus.length > 0) {
      warnings.push(tf(locale, 'quickWarnOnuNoSb', { count: onus.length }))
    }
  } else {
    let progressed = true
    while (onuIdx < onus.length && progressed) {
      progressed = false
      for (const bi of connectedSbIndices) {
        if (onuIdx >= onus.length) break
        if (onusBySb[bi].length < sbCapacity[bi]) {
          onusBySb[bi].push(onus[onuIdx++])
          progressed = true
        }
      }
    }
    if (onuIdx < onus.length) {
      warnings.push(
        tf(locale, 'quickWarnOnuPorts', { count: onus.length - onuIdx }),
      )
    }
  }

  const onuCountUnderSr = (sr: Node<FoNodeData>) => {
    const si = srs.indexOf(sr)
    const sb = sbsBySr[si]
    if (!sb) return 0
    return onusBySb[sbs.indexOf(sb)]?.length ?? 0
  }

  const stepAfterSr = (sr: Node<FoNodeData>) => {
    const n = onuCountUnderSr(sr)
    const cols = Math.min(ONU_COLS_MAX, Math.max(n, 1))
    const underWidth = n > 0 ? cols * COL : COL
    return Math.max(COL * 2, underWidth + COL)
  }

  const placeBelowSr = (sr: Node<FoNodeData>, xSr: number, yBackbone: number): number => {
    sr.position = { x: xSr, y: yBackbone }
    const si = srs.indexOf(sr)
    const sb = sbsBySr[si]
    if (!sb) return yBackbone + ROW + GAP

    const bi = sbs.indexOf(sb)
    const assignedOnus = onusBySb[bi] ?? []
    const yBarrel = yBackbone + ROW + GAP_SR_BARREL
    const ySb = yBarrel + BARREL_H + GAP_BARREL_SB

    const barrel = take(barrels)
    if (!barrel) {
      warnings.push(tf(locale, 'quickWarnBarrelShort', {}))
      sb.position = { x: xSr, y: ySb }
    } else {
      barrel.position = { x: xSr, y: yBarrel }
      sb.position = { x: xSr, y: ySb }
      link(sr, barrel, 'out-small', 'top')
      link(barrel, sb, 'bottom', 'in')
    }

    if (assignedOnus.length === 0) return ySb + ROW + GAP_SB_ONU

    const cols = Math.min(ONU_COLS_MAX, assignedOnus.length)
    const rows = Math.ceil(assignedOnus.length / cols)
    const gridW = (cols - 1) * COL
    const startX = xSr - gridW / 2
    const onuY0 = ySb + ROW + GAP_SB_ONU

    assignedOnus.forEach((onu, oi) => {
      const col = oi % cols
      const row = Math.floor(oi / cols)
      const x = startX + col * COL
      const y = onuY0 + row * (ROW + GAP)
      onu.position = { x, y }
      wireHop(sb, onu, `out-${oi + 1}`, 'in-top')
    })

    return onuY0 + rows * (ROW + GAP)
  }

  const layoutChain = (
    olt: Node<FoNodeData> | null,
    portNo: number | null,
    chain: Node<FoNodeData>[],
    yBackbone: number,
    placeOlt: boolean,
  ): number => {
    if (chain.length === 0) return yBackbone

    if (olt && portNo != null) {
      if (placeOlt) {
        olt.position = { x: origin.x, y: yBackbone }
      }
      const first = chain[0]
      first.position = { x: origin.x + COL * 2, y: yBackbone }
      wireHop(olt, first, `port-${portNo}`, 'in')
    } else {
      chain[0].position = { x: origin.x + COL, y: yBackbone }
    }

    let maxBottom = yBackbone + ROW
    for (let i = 0; i < chain.length; i++) {
      const sr = chain[i]
      if (i > 0) {
        const prev = chain[i - 1]
        const targetX = Math.max(prev.position.x + COL * 2, prev.position.x + stepAfterSr(prev))
        sr.position = { x: targetX, y: yBackbone }
        wireHop(prev, sr, 'out-large', 'in')
      }
      const bottom = placeBelowSr(sr, sr.position.x, yBackbone)
      maxBottom = Math.max(maxBottom, bottom)
    }

    return maxBottom + GAP
  }

  let cursorY = origin.y
  let chainCursor = 0

  if (olts.length === 0) {
    cursorY = layoutChain(null, null, srs, origin.y, false)
  } else {
    olts.forEach((olt) => {
      let firstChainForOlt = true
      for (let portNo = 1; portNo <= oltPorts; portNo++) {
        const chain = srChains[chainCursor++] ?? []
        if (chain.length === 0) continue
        cursorY = layoutChain(olt, portNo, chain, cursorY, firstChainForOlt)
        firstChainForOlt = false
      }
      if (firstChainForOlt) {
        olt.position = { x: origin.x, y: cursorY }
        cursorY += ROW + GAP * 2
      }
    })
  }

  if (barrels.length > 0) {
    warnings.push(tf(locale, 'quickWarnBarrelLeft', { count: barrels.length }))
    barrels.forEach((n, i) => {
      n.position = {
        x: origin.x + (i % 8) * COL,
        y: cursorY + Math.floor(i / 8) * (ROW * 0.7),
      }
    })
    cursorY += Math.ceil(barrels.length / 8) * (ROW * 0.7) + GAP
  }

  const parkUnplaced = (list: Node<FoNodeData>[], baseX: number) => {
    list.forEach((n, i) => {
      if (n.position.x === 0 && n.position.y === 0) {
        n.position = { x: origin.x + baseX, y: cursorY + i * (ROW + GAP) }
      }
    })
  }
  parkUnplaced(srs, COL * 2)
  parkUnplaced(sbs, COL * 4)
  parkUnplaced(onus, COL * 6)

  return { nodes, edges, warnings }
}
