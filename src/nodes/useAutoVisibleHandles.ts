import { useConnection, useEdges } from '@xyflow/react'
import { useCallback, useMemo, useState } from 'react'

/**
 * Titik konektor OLT/ONU/OPM/Patchcord/Sleeve/Barel:
 * - tersembunyi default
 * - muncul saat hover node atau sedang menarik tali
 * - setelah tersambung, hanya titik yang dipakai yang tetap tampil
 */
export function useAutoVisibleHandles(nodeId: string) {
  const edges = useEdges()
  const connecting = useConnection((c) => c.inProgress)
  const [hovered, setHovered] = useState(false)

  const usedHandles = useMemo(() => {
    const used = new Set<string>()
    for (const e of edges ?? []) {
      if (e.source === nodeId && e.sourceHandle) used.add(e.sourceHandle)
      if (e.target === nodeId && e.targetHandle) used.add(e.targetHandle)
    }
    return used
  }, [edges, nodeId])

  const showAll = connecting || hovered

  const isHandleVisible = useCallback(
    (handleId: string) => showAll || usedHandles.has(handleId),
    [showAll, usedHandles],
  )

  const autoHandleClass = useCallback(
    (handleId: string, baseClass: string) =>
      `${baseClass} fo-handle-auto${isHandleVisible(handleId) ? ' is-visible' : ''}`,
    [isHandleVisible],
  )

  const hoverProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }

  return { usedHandles, showAll, isHandleVisible, autoHandleClass, hoverProps }
}
