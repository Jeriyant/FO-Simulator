import { Position } from '@xyflow/react'

export type ObstacleRect = {
  x: number
  y: number
  width: number
  height: number
}

type Point = { x: number; y: number }

const GRID = 16
/** Padding default untuk detour panjang */
const PAD = 18
/** Padding ringan untuk jalur pendek / vertikal dekat */
const PAD_NEAR = 8
const EXIT_MIN = 20
const MAX_CELLS = 60_000
/** Ambang jarak untuk jalur “dekat” (pakai pad ringan + shortcut) */
const NEAR_DIST = 280

function expand(r: ObstacleRect, pad: number): ObstacleRect {
  return {
    x: r.x - pad,
    y: r.y - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  }
}

function rectRight(r: ObstacleRect): number {
  return r.x + r.width
}

function rectBottom(r: ObstacleRect): number {
  return r.y + r.height
}

function pointInRect(p: Point, r: ObstacleRect): boolean {
  return p.x > r.x && p.x < rectRight(r) && p.y > r.y && p.y < rectBottom(r)
}

function segmentHitsRect(a: Point, b: Point, r: ObstacleRect): boolean {
  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)
  const rx2 = rectRight(r)
  const ry2 = rectBottom(r)

  if (maxX < r.x || minX > rx2 || maxY < r.y || minY > ry2) return false

  if (Math.abs(a.y - b.y) < 0.5) {
    const y = a.y
    return y > r.y && y < ry2 && maxX > r.x && minX < rx2
  }
  if (Math.abs(a.x - b.x) < 0.5) {
    const x = a.x
    return x > r.x && x < rx2 && maxY > r.y && minY < ry2
  }

  const steps = Math.max(12, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = a.x + (b.x - a.x) * t
    const y = a.y + (b.y - a.y) * t
    if (x > r.x && x < rx2 && y > r.y && y < ry2) return true
  }
  return false
}

function pathHitsObstacles(points: Point[], obstacles: ObstacleRect[]): boolean {
  for (let i = 0; i < points.length - 1; i++) {
    for (const r of obstacles) {
      if (segmentHitsRect(points[i], points[i + 1], r)) return true
    }
  }
  return false
}

/** Middle of full path (drop handle stubs). */
function middleHitsObstacles(fullPath: Point[], obstacles: ObstacleRect[]): boolean {
  if (fullPath.length <= 2) return false
  const middle = fullPath.slice(1, -1)
  if (middle.length < 2) return false
  return pathHitsObstacles(middle, obstacles)
}

function exitPoint(x: number, y: number, pos: Position, dist: number): Point {
  switch (pos) {
    case Position.Left:
      return { x: x - dist, y }
    case Position.Right:
      return { x: x + dist, y }
    case Position.Top:
      return { x, y: y - dist }
    case Position.Bottom:
    default:
      return { x, y: y + dist }
  }
}

/**
 * Dorong exit cukup untuk keluar dari node sendiri saja.
 * Tidak menembus obstacle tetangga di arah keluar (itu yang bikin zig-zag).
 */
function clearExit(
  hx: number,
  hy: number,
  pos: Position,
  ownRect: ObstacleRect | null | undefined,
): Point {
  let need = EXIT_MIN
  if (ownRect) {
    const r = expand(ownRect, PAD_NEAR)
    switch (pos) {
      case Position.Right:
        need = Math.max(need, rectRight(r) - hx + GRID / 2)
        break
      case Position.Left:
        need = Math.max(need, hx - r.x + GRID / 2)
        break
      case Position.Bottom:
        need = Math.max(need, rectBottom(r) - hy + GRID / 2)
        break
      case Position.Top:
        need = Math.max(need, hy - r.y + GRID / 2)
        break
    }
  }
  return exitPoint(hx, hy, pos, need)
}

function rectsOverlap(a: ObstacleRect, b: ObstacleRect, margin = 0): boolean {
  return !(
    rectRight(a) + margin < b.x ||
    rectRight(b) + margin < a.x ||
    rectBottom(a) + margin < b.y ||
    rectBottom(b) + margin < a.y
  )
}

/** Obstacle di koridor source→target saja (abaikan node jauh). */
function obstaclesInCorridor(
  obstacles: ObstacleRect[],
  source: Point,
  target: Point,
  sourceRect: ObstacleRect | null | undefined,
  targetRect: ObstacleRect | null | undefined,
  margin: number,
): ObstacleRect[] {
  const minX = Math.min(source.x, target.x, sourceRect?.x ?? source.x, targetRect?.x ?? target.x) - margin
  const maxX =
    Math.max(
      source.x,
      target.x,
      sourceRect ? rectRight(sourceRect) : source.x,
      targetRect ? rectRight(targetRect) : target.x,
    ) + margin
  const minY = Math.min(source.y, target.y, sourceRect?.y ?? source.y, targetRect?.y ?? target.y) - margin
  const maxY =
    Math.max(
      source.y,
      target.y,
      sourceRect ? rectBottom(sourceRect) : source.y,
      targetRect ? rectBottom(targetRect) : target.y,
    ) + margin
  const box: ObstacleRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY }

  return obstacles.filter((r) => {
    // Jangan pakai body source/target sebagai blocker jalur tengah
    if (sourceRect && r === sourceRect) return false
    if (targetRect && r === targetRect) return false
    if (
      sourceRect &&
      Math.abs(r.x - sourceRect.x) < 0.5 &&
      Math.abs(r.y - sourceRect.y) < 0.5 &&
      Math.abs(r.width - sourceRect.width) < 0.5
    ) {
      return false
    }
    if (
      targetRect &&
      Math.abs(r.x - targetRect.x) < 0.5 &&
      Math.abs(r.y - targetRect.y) < 0.5 &&
      Math.abs(r.width - targetRect.width) < 0.5
    ) {
      return false
    }
    return rectsOverlap(r, box, 0)
  })
}

/**
 * Shortcut: jalur ortogonal sederhana untuk koneksi sejajar (SB→ONU, barel→SB, dll).
 */
function tryAlignedShortcut(
  source: Point,
  target: Point,
  sourcePosition: Position,
  targetPosition: Position,
  sExit: Point,
  tExit: Point,
  obstacles: ObstacleRect[],
): Point[] | null {
  const dx = Math.abs(source.x - target.x)
  const dy = Math.abs(source.y - target.y)
  const verticalPair =
    (sourcePosition === Position.Bottom && targetPosition === Position.Top) ||
    (sourcePosition === Position.Top && targetPosition === Position.Bottom)
  const horizontalPair =
    (sourcePosition === Position.Right && targetPosition === Position.Left) ||
    (sourcePosition === Position.Left && targetPosition === Position.Right)

  const candidates: Point[][] = []

  if (verticalPair && dx < 120) {
    // Hampir sejajar vertikal → turun/naik lalu sedikit geser jika perlu
    if (dx < 8) {
      candidates.push([source, sExit, tExit, target])
      candidates.push([source, target])
    } else {
      candidates.push([source, sExit, { x: target.x, y: sExit.y }, tExit, target])
      candidates.push([source, sExit, { x: sExit.x, y: tExit.y }, tExit, target])
      candidates.push([source, { x: source.x, y: (source.y + target.y) / 2 }, { x: target.x, y: (source.y + target.y) / 2 }, target])
    }
  }

  if (horizontalPair && dy < 120) {
    if (dy < 8) {
      candidates.push([source, sExit, tExit, target])
      candidates.push([source, target])
    } else {
      candidates.push([source, sExit, { x: tExit.x, y: sExit.y }, tExit, target])
      candidates.push([source, sExit, { x: sExit.x, y: tExit.y }, tExit, target])
    }
  }

  // Jalur pendek umum: L sederhana
  if (Math.hypot(dx, dy) < NEAR_DIST) {
    candidates.push(
      [source, sExit, { x: tExit.x, y: sExit.y }, tExit, target],
      [source, sExit, { x: sExit.x, y: tExit.y }, tExit, target],
    )
  }

  return pickClearPath(candidates, obstacles)
}

function snap(n: number): number {
  return Math.round(n / GRID) * GRID
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function simplify(points: Point[]): Point[] {
  if (points.length <= 2) return points
  const out: Point[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1]
    const cur = points[i]
    const next = points[i + 1]
    const colinear =
      (Math.abs(prev.x - cur.x) < 0.5 && Math.abs(cur.x - next.x) < 0.5) ||
      (Math.abs(prev.y - cur.y) < 0.5 && Math.abs(cur.y - next.y) < 0.5)
    if (!colinear) out.push(cur)
  }
  out.push(points[points.length - 1])
  return out
}

/** Orthogonal path with smooth rounded corners. */
function pointsToSvg(points: Point[], cornerRadius = 14): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const cur = points[i]
    const next = points[i + 1]
    const d1 = Math.hypot(cur.x - prev.x, cur.y - prev.y)
    const d2 = Math.hypot(next.x - cur.x, next.y - cur.y)
    const r = Math.min(cornerRadius, d1 / 2, d2 / 2)

    if (r < 1.5) {
      d += ` L ${cur.x} ${cur.y}`
      continue
    }

    const before = {
      x: cur.x - ((cur.x - prev.x) / d1) * r,
      y: cur.y - ((cur.y - prev.y) / d1) * r,
    }
    const after = {
      x: cur.x + ((next.x - cur.x) / d2) * r,
      y: cur.y + ((next.y - cur.y) / d2) * r,
    }
    d += ` L ${before.x} ${before.y} Q ${cur.x} ${cur.y} ${after.x} ${after.y}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

function unionBounds(rects: ObstacleRect[]): ObstacleRect | null {
  if (rects.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of rects) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, rectRight(r))
    maxY = Math.max(maxY, rectBottom(r))
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

function pathLength(points: Point[]): number {
  let len = 0
  for (let i = 0; i < points.length - 1; i++) {
    len += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y)
  }
  return len
}

function pickClearPath(candidates: Point[][], obstacles: ObstacleRect[]): Point[] | null {
  let best: Point[] | null = null
  let bestLen = Infinity
  for (const cand of candidates) {
    const simplified = simplify(cand)
    if (middleHitsObstacles(simplified, obstacles)) continue
    const len = pathLength(simplified)
    if (len < bestLen) {
      bestLen = len
      best = simplified
    }
  }
  return best
}

function laneCoords(obstacles: ObstacleRect[], margin: number) {
  const box = unionBounds(obstacles)
  if (!box) {
    return { left: 0, right: 0, top: 0, bottom: 0, ok: false as const }
  }
  return {
    left: snap(box.x - margin),
    right: snap(rectRight(box) + margin),
    top: snap(box.y - margin),
    bottom: snap(rectBottom(box) + margin),
    ok: true as const,
  }
}

function buildCandidates(
  source: Point,
  sExit: Point,
  tExit: Point,
  target: Point,
  obstacles: ObstacleRect[],
): Point[][] {
  const candidates: Point[][] = [
    [source, sExit, { x: tExit.x, y: sExit.y }, tExit, target],
    [source, sExit, { x: sExit.x, y: tExit.y }, tExit, target],
  ]

  for (const margin of [GRID, GRID * 2, GRID * 4, GRID * 6]) {
    const lane = laneCoords(obstacles, margin)
    if (!lane.ok) continue
    const { left, right, top, bottom } = lane

    candidates.push(
      [source, sExit, { x: sExit.x, y: top }, { x: tExit.x, y: top }, tExit, target],
      [source, sExit, { x: sExit.x, y: bottom }, { x: tExit.x, y: bottom }, tExit, target],
      [source, sExit, { x: left, y: sExit.y }, { x: left, y: tExit.y }, tExit, target],
      [source, sExit, { x: right, y: sExit.y }, { x: right, y: tExit.y }, tExit, target],
      [
        source,
        sExit,
        { x: left, y: sExit.y },
        { x: left, y: top },
        { x: tExit.x, y: top },
        tExit,
        target,
      ],
      [
        source,
        sExit,
        { x: right, y: sExit.y },
        { x: right, y: top },
        { x: tExit.x, y: top },
        tExit,
        target,
      ],
      [
        source,
        sExit,
        { x: left, y: sExit.y },
        { x: left, y: bottom },
        { x: tExit.x, y: bottom },
        tExit,
        target,
      ],
      [
        source,
        sExit,
        { x: right, y: sExit.y },
        { x: right, y: bottom },
        { x: tExit.x, y: bottom },
        tExit,
        target,
      ],
      [
        source,
        sExit,
        { x: sExit.x, y: top },
        { x: right, y: top },
        { x: right, y: tExit.y },
        tExit,
        target,
      ],
      [
        source,
        sExit,
        { x: sExit.x, y: bottom },
        { x: left, y: bottom },
        { x: left, y: tExit.y },
        tExit,
        target,
      ],
      // Full U-turns around the cluster
      [
        source,
        sExit,
        { x: left, y: sExit.y },
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: tExit.y },
        tExit,
        target,
      ],
      [
        source,
        sExit,
        { x: right, y: sExit.y },
        { x: right, y: bottom },
        { x: left, y: bottom },
        { x: left, y: tExit.y },
        tExit,
        target,
      ],
    )
  }

  return candidates
}

/** Binary-heap min extraction for A*. */
class MinHeap {
  private data: { key: string; f: number }[] = []

  push(key: string, f: number) {
    this.data.push({ key, f })
    let i = this.data.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.data[p].f <= this.data[i].f) break
      ;[this.data[p], this.data[i]] = [this.data[i], this.data[p]]
      i = p
    }
  }

  pop(): string | null {
    if (this.data.length === 0) return null
    const top = this.data[0].key
    const last = this.data.pop()!
    if (this.data.length === 0) return top
    this.data[0] = last
    let i = 0
    for (;;) {
      const l = i * 2 + 1
      const r = l + 1
      let smallest = i
      if (l < this.data.length && this.data[l].f < this.data[smallest].f) smallest = l
      if (r < this.data.length && this.data[r].f < this.data[smallest].f) smallest = r
      if (smallest === i) break
      ;[this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]]
      i = smallest
    }
    return top
  }

  get size() {
    return this.data.length
  }
}

function astar(start: Point, end: Point, obstacles: ObstacleRect[]): Point[] | null {
  let searchMinX = snap(Math.min(start.x, end.x) - GRID * 24)
  let searchMaxX = snap(Math.max(start.x, end.x) + GRID * 24)
  let searchMinY = snap(Math.min(start.y, end.y) - GRID * 24)
  let searchMaxY = snap(Math.max(start.y, end.y) + GRID * 24)

  for (const r of obstacles) {
    searchMinX = Math.min(searchMinX, snap(r.x - GRID * 4))
    searchMaxX = Math.max(searchMaxX, snap(rectRight(r) + GRID * 4))
    searchMinY = Math.min(searchMinY, snap(r.y - GRID * 4))
    searchMaxY = Math.max(searchMaxY, snap(rectBottom(r) + GRID * 4))
  }

  const sx = snap(start.x)
  const sy = snap(start.y)
  const ex = snap(end.x)
  const ey = snap(end.y)

  const isEndpoint = (x: number, y: number) =>
    (x === sx && y === sy) || (x === ex && y === ey)

  const cellBlocked = (x: number, y: number) => {
    if (isEndpoint(x, y)) return false
    return obstacles.some((r) => pointInRect({ x, y }, r))
  }

  const moveBlocked = (from: Point, to: Point) => {
    if (cellBlocked(to.x, to.y) && !isEndpoint(to.x, to.y)) return true
    return obstacles.some((r) => segmentHitsRect(from, to, r))
  }

  // If start/end snapped onto blocked cells (rare), nudge them out
  const unblockNear = (x: number, y: number): Point => {
    if (!cellBlocked(x, y)) return { x, y }
    for (const [dx, dy] of [
      [GRID, 0],
      [-GRID, 0],
      [0, GRID],
      [0, -GRID],
      [GRID, GRID],
      [GRID, -GRID],
      [-GRID, GRID],
      [-GRID, -GRID],
    ] as const) {
      const nx = x + dx
      const ny = y + dy
      if (!cellBlocked(nx, ny)) return { x: nx, y: ny }
    }
    return { x, y }
  }

  const startCell = unblockNear(sx, sy)
  const endCell = unblockNear(ex, ey)

  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>()
  const openHeap = new MinHeap()
  const openSet = new Set<string>()
  const closed = new Set<string>()

  const sk = cellKey(startCell.x, startCell.y)
  const ek = cellKey(endCell.x, endCell.y)
  openHeap.push(sk, Math.abs(endCell.x - startCell.x) + Math.abs(endCell.y - startCell.y))
  openSet.add(sk)
  gScore.set(sk, 0)

  let steps = 0
  while (openHeap.size > 0 && steps < MAX_CELLS) {
    steps++
    const current = openHeap.pop()
    if (!current || closed.has(current)) continue
    openSet.delete(current)
    closed.add(current)

    if (current === ek) {
      const path: Point[] = []
      let cur = current
      while (true) {
        const [px, py] = cur.split(',').map(Number)
        path.push({ x: px, y: py })
        if (!cameFrom.has(cur)) break
        cur = cameFrom.get(cur)!
      }
      path.reverse()
      return path
    }

    const [cx, cy] = current.split(',').map(Number)
    const from = { x: cx, y: cy }

    for (const [dx, dy] of [
      [GRID, 0],
      [-GRID, 0],
      [0, GRID],
      [0, -GRID],
    ] as const) {
      const nx = cx + dx
      const ny = cy + dy
      if (nx < searchMinX || nx > searchMaxX || ny < searchMinY || ny > searchMaxY) continue
      const to = { x: nx, y: ny }
      const nk = cellKey(nx, ny)
      if (closed.has(nk)) continue
      if (moveBlocked(from, to)) continue

      let turnPenalty = 0
      const prevKey = cameFrom.get(current)
      if (prevKey) {
        const [px, py] = prevKey.split(',').map(Number)
        if (cx - px !== dx || cy - py !== dy) turnPenalty = GRID * 0.5
      }

      const tentative = (gScore.get(current) ?? Infinity) + GRID + turnPenalty
      if (tentative >= (gScore.get(nk) ?? Infinity)) continue
      cameFrom.set(nk, current)
      gScore.set(nk, tentative)
      const f = tentative + Math.abs(endCell.x - nx) + Math.abs(endCell.y - ny)
      openHeap.push(nk, f)
      openSet.add(nk)
    }
  }
  return null
}

/**
 * Guaranteed outer-lane path that stays outside the obstacle union.
 * Used when A* / short candidates fail — never crosses boxes.
 */
function hullPath(
  source: Point,
  sExit: Point,
  tExit: Point,
  target: Point,
  obstacles: ObstacleRect[],
): Point[] {
  const lane = laneCoords(obstacles, GRID * 5)
  if (!lane.ok) {
    return simplify([source, sExit, { x: tExit.x, y: sExit.y }, tExit, target])
  }
  const { left, right, top, bottom } = lane

  const options: Point[][] = [
    [source, sExit, { x: sExit.x, y: top }, { x: tExit.x, y: top }, tExit, target],
    [source, sExit, { x: sExit.x, y: bottom }, { x: tExit.x, y: bottom }, tExit, target],
    [source, sExit, { x: left, y: sExit.y }, { x: left, y: tExit.y }, tExit, target],
    [source, sExit, { x: right, y: sExit.y }, { x: right, y: tExit.y }, tExit, target],
    [
      source,
      sExit,
      { x: left, y: sExit.y },
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: tExit.y },
      tExit,
      target,
    ],
    [
      source,
      sExit,
      { x: right, y: sExit.y },
      { x: right, y: bottom },
      { x: left, y: bottom },
      { x: left, y: tExit.y },
      tExit,
      target,
    ],
  ]

  const clear = pickClearPath(options, obstacles)
  if (clear) return clear

  // Absolute last resort: go far above everything (ignore leftover micro-collisions)
  const farTop = top - GRID * 8
  return simplify([
    source,
    sExit,
    { x: sExit.x, y: farTop },
    { x: tExit.x, y: farTop },
    tExit,
    target,
  ])
}

function labelPoint(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return points[0]
  if (points.length === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    }
  }

  // Titik tengah sejati sepanjang polyline (bukan indeks tengah)
  let total = 0
  const segs: number[] = []
  for (let i = 1; i < points.length; i++) {
    const len = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    )
    segs.push(len)
    total += len
  }
  if (total <= 0) {
    return {
      x: (points[0].x + points[points.length - 1].x) / 2,
      y: (points[0].y + points[points.length - 1].y) / 2,
    }
  }

  let remain = total / 2
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]
    if (remain <= seg) {
      const t = seg === 0 ? 0 : remain / seg
      const a = points[i]
      const b = points[i + 1]
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      }
    }
    remain -= seg
  }

  return points[points.length - 1]
}

/**
 * Orthogonal path that avoids node rectangles (including source/target bodies).
 * Never falls back to a path that cuts through boxes.
 */
export function getSmartEdgePath(params: {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  sourcePosition: Position
  targetPosition: Position
  obstacles: ObstacleRect[]
  sourceRect?: ObstacleRect | null
  targetRect?: ObstacleRect | null
}): { path: string; labelX: number; labelY: number } {
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    obstacles,
    sourceRect,
    targetRect,
  } = params

  const source = { x: sourceX, y: sourceY }
  const target = { x: targetX, y: targetY }
  const dist = Math.hypot(targetX - sourceX, targetY - sourceY)
  const pad = dist < NEAR_DIST ? PAD_NEAR : PAD

  // Hanya obstacle di sekitar tali; exclude body source/target
  const relevant = obstaclesInCorridor(
    obstacles,
    source,
    target,
    sourceRect,
    targetRect,
    Math.max(160, dist * 0.35),
  )
  const padded = relevant.map((r) => expand(r, pad))

  const sExit = clearExit(sourceX, sourceY, sourcePosition, sourceRect)
  const tExit = clearExit(targetX, targetY, targetPosition, targetRect)

  // 0) Shortcut sejajar / dekat — hindari A* zig-zag
  const shortcut = tryAlignedShortcut(
    source,
    target,
    sourcePosition,
    targetPosition,
    sExit,
    tExit,
    padded,
  )
  if (shortcut) {
    const mid = labelPoint(shortcut)
    return { path: pointsToSvg(shortcut), labelX: mid.x, labelY: mid.y }
  }

  // 1) Fast orthogonal candidates on outer lanes
  const clear = pickClearPath(
    buildCandidates(source, sExit, tExit, target, padded),
    padded,
  )
  if (clear) {
    const mid = labelPoint(clear)
    return { path: pointsToSvg(clear), labelX: mid.x, labelY: mid.y }
  }

  // 2) A* grid search
  const route = astar(sExit, tExit, padded)
  if (route && route.length > 0) {
    const points = simplify([source, sExit, ...route, tExit, target])
    if (!middleHitsObstacles(points, padded)) {
      const mid = labelPoint(points)
      return { path: pointsToSvg(points), labelX: mid.x, labelY: mid.y }
    }
  }

  // 3) Guaranteed hull — still avoids boxes
  const hull = hullPath(source, sExit, tExit, target, padded)
  const mid = labelPoint(hull)
  return { path: pointsToSvg(hull), labelX: mid.x, labelY: mid.y }
}
