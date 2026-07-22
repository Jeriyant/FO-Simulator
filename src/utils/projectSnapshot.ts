import type { Edge, Node } from '@xyflow/react'
import type { FoEdgeData, FoNodeData } from '../types/fo'

export type ProjectSnapshot = {
  title: string
  nodes: Node<FoNodeData>[]
  edges: Edge<FoEdgeData>[]
}

function stableNode(node: Node<FoNodeData>) {
  const { selected: _s, ...rest } = node
  const data = { ...node.data }
  if (data.type === 'onu') {
    const { receivedPower, totalLoss, status, ...stable } = data
    return { ...rest, data: stable }
  }
  if (data.type === 'opm') {
    const { measuredPower, totalLoss, status, ...stable } = data
    return { ...rest, data: stable }
  }
  if (data.type === 'splitterRatio') {
    const { powerLarge, powerSmall, ...stable } = data
    return { ...rest, data: stable }
  }
  if (data.type === 'splitterBox') {
    const { powerOut, ...stable } = data
    return { ...rest, data: stable }
  }
  return rest
}

function stableEdge(edge: Edge<FoEdgeData>) {
  const { selected: _s, ...rest } = edge
  return rest
}

/** Sidik jari proyek tanpa nilai simulasi runtime (ONU/OPM). */
export function projectFingerprint(
  title: string,
  nodes: Node<FoNodeData>[],
  edges: Edge<FoEdgeData>[],
): string {
  return JSON.stringify({
    title: title.trim(),
    nodes: nodes.map(stableNode),
    edges: edges.map(stableEdge),
  })
}

export function createProjectSnapshot(
  title: string,
  nodes: Node<FoNodeData>[],
  edges: Edge<FoEdgeData>[],
): ProjectSnapshot {
  return {
    title,
    nodes: structuredClone(nodes.map((n) => ({ ...n, selected: false }))),
    edges: structuredClone(edges.map((e) => ({ ...e, selected: false }))),
  }
}
