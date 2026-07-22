import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { Edge, Node } from '@xyflow/react'
import type { FoEdgeData, FoNodeData } from '../types/fo'
import { createProjectSnapshot, type ProjectSnapshot } from '../utils/projectSnapshot'

const MAX_HISTORY = 50

type Params = {
  projectTitle: string
  nodes: Node<FoNodeData>[]
  edges: Edge<FoEdgeData>[]
  setProjectTitle: (title: string) => void
  setNodes: Dispatch<SetStateAction<Node<FoNodeData>[]>>
  setEdges: Dispatch<SetStateAction<Edge<FoEdgeData>[]>>
  onApply?: () => void
}

export function useProjectHistory({
  projectTitle,
  nodes,
  edges,
  setProjectTitle,
  setNodes,
  setEdges,
  onApply,
}: Params) {
  const undoStackRef = useRef<ProjectSnapshot[]>([])
  const redoStackRef = useRef<ProjectSnapshot[]>([])
  const applyingRef = useRef(false)
  const [revision, setRevision] = useState(0)

  const bump = useCallback(() => setRevision((v) => v + 1), [])

  const makeSnapshot = useCallback(
    () => createProjectSnapshot(projectTitle, nodes, edges),
    [projectTitle, nodes, edges],
  )

  const pushUndo = useCallback(() => {
    if (applyingRef.current) return
    const snap = makeSnapshot()
    const stack = undoStackRef.current
    const last = stack[stack.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return
    undoStackRef.current = [...stack.slice(-(MAX_HISTORY - 1)), snap]
    redoStackRef.current = []
    bump()
  }, [makeSnapshot, bump])

  const applySnapshot = useCallback(
    (snap: ProjectSnapshot) => {
      applyingRef.current = true
      setProjectTitle(snap.title)
      setNodes(snap.nodes)
      setEdges(snap.edges)
      onApply?.()
      applyingRef.current = false
    },
    [setProjectTitle, setNodes, setEdges, onApply],
  )

  const undo = useCallback(() => {
    const stack = undoStackRef.current
    if (stack.length === 0) return
    const prev = stack[stack.length - 1]
    redoStackRef.current = [...redoStackRef.current, makeSnapshot()]
    undoStackRef.current = stack.slice(0, -1)
    applySnapshot(prev)
    bump()
  }, [makeSnapshot, applySnapshot, bump])

  const redo = useCallback(() => {
    const stack = redoStackRef.current
    if (stack.length === 0) return
    const next = stack[stack.length - 1]
    undoStackRef.current = [...undoStackRef.current, makeSnapshot()]
    redoStackRef.current = stack.slice(0, -1)
    applySnapshot(next)
    bump()
  }, [makeSnapshot, applySnapshot, bump])

  const clearHistory = useCallback(() => {
    undoStackRef.current = []
    redoStackRef.current = []
    bump()
  }, [bump])

  const canUndo = revision >= 0 && undoStackRef.current.length > 0
  const canRedo = revision >= 0 && redoStackRef.current.length > 0

  return {
    pushUndo,
    undo,
    redo,
    clearHistory,
    canUndo,
    canRedo,
    isApplyingHistory: () => applyingRef.current,
  }
}
