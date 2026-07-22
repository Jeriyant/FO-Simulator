import type { Node } from '@xyflow/react'

export type ArrangeMode =
  | 'alignLeft'
  | 'alignCenterH'
  | 'alignRight'
  | 'alignTop'
  | 'alignMiddleV'
  | 'alignBottom'
  | 'distributeH'
  | 'distributeV'
  | 'arrangeGrid'

type SizedNode = {
  id: string
  x: number
  y: number
  w: number
  h: number
}

const DEFAULT_W = 160
const DEFAULT_H = 80
const DEFAULT_GAP = 24

export function getNodeSize(node: Node): { w: number; h: number } {
  const w = node.measured?.width ?? node.width ?? DEFAULT_W
  const h = node.measured?.height ?? node.height ?? DEFAULT_H
  return {
    w: Number.isFinite(w) && w > 0 ? w : DEFAULT_W,
    h: Number.isFinite(h) && h > 0 ? h : DEFAULT_H,
  }
}

function toSized(nodes: Node[]): SizedNode[] {
  return nodes.map((n) => {
    const { w, h } = getNodeSize(n)
    return { id: n.id, x: n.position.x, y: n.position.y, w, h }
  })
}

function bounds(items: SizedNode[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of items) {
    minX = Math.min(minX, n.x)
    minY = Math.min(minY, n.y)
    maxX = Math.max(maxX, n.x + n.w)
    maxY = Math.max(maxY, n.y + n.h)
  }
  return { minX, minY, maxX, maxY, midX: (minX + maxX) / 2, midY: (minY + maxY) / 2 }
}

/** Returns a map of nodeId → new position for selected nodes. */
export function computeArrangePositions(
  selected: Node[],
  mode: ArrangeMode,
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  if (selected.length < 2) return result

  const items = toSized(selected)
  const box = bounds(items)

  if (mode === 'alignLeft') {
    for (const n of items) result.set(n.id, { x: box.minX, y: n.y })
    return result
  }
  if (mode === 'alignRight') {
    for (const n of items) result.set(n.id, { x: box.maxX - n.w, y: n.y })
    return result
  }
  if (mode === 'alignCenterH') {
    for (const n of items) result.set(n.id, { x: box.midX - n.w / 2, y: n.y })
    return result
  }
  if (mode === 'alignTop') {
    for (const n of items) result.set(n.id, { x: n.x, y: box.minY })
    return result
  }
  if (mode === 'alignBottom') {
    for (const n of items) result.set(n.id, { x: n.x, y: box.maxY - n.h })
    return result
  }
  if (mode === 'alignMiddleV') {
    for (const n of items) result.set(n.id, { x: n.x, y: box.midY - n.h / 2 })
    return result
  }

  if (mode === 'distributeH') {
    if (items.length < 3) return result
    const sorted = [...items].sort((a, b) => a.x - b.x || a.y - b.y)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const span = last.x + last.w / 2 - (first.x + first.w / 2)
    const step = span / (sorted.length - 1)
    sorted.forEach((n, i) => {
      if (i === 0 || i === sorted.length - 1) {
        result.set(n.id, { x: n.x, y: n.y })
        return
      }
      const centerX = first.x + first.w / 2 + step * i
      result.set(n.id, { x: centerX - n.w / 2, y: n.y })
    })
    return result
  }

  if (mode === 'distributeV') {
    if (items.length < 3) return result
    const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    const span = last.y + last.h / 2 - (first.y + first.h / 2)
    const step = span / (sorted.length - 1)
    sorted.forEach((n, i) => {
      if (i === 0 || i === sorted.length - 1) {
        result.set(n.id, { x: n.x, y: n.y })
        return
      }
      const centerY = first.y + first.h / 2 + step * i
      result.set(n.id, { x: n.x, y: centerY - n.h / 2 })
    })
    return result
  }

  // arrangeGrid
  const cols = Math.max(1, Math.ceil(Math.sqrt(items.length)))
  const rows = Math.ceil(items.length / cols)
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x)
  const cellW = Math.max(...items.map((n) => n.w))
  const cellH = Math.max(...items.map((n) => n.h))

  const contentW = cols * cellW + (cols - 1) * DEFAULT_GAP
  const contentH = rows * cellH + (rows - 1) * DEFAULT_GAP
  const boxW = Math.max(box.maxX - box.minX, contentW)
  const boxH = Math.max(box.maxY - box.minY, contentH)
  const gapX = cols > 1 ? (boxW - cols * cellW) / (cols - 1) : 0
  const gapY = rows > 1 ? (boxH - rows * cellH) / (rows - 1) : 0
  const useGapX = Math.max(DEFAULT_GAP, gapX)
  const useGapY = Math.max(DEFAULT_GAP, gapY)

  sorted.forEach((n, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = box.minX + col * (cellW + useGapX) + (cellW - n.w) / 2
    const y = box.minY + row * (cellH + useGapY) + (cellH - n.h) / 2
    result.set(n.id, { x, y })
  })
  return result
}
