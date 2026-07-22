/** Port dua arah Patchcord / Sleeve / Barel (atas/kiri/kanan/bawah). */
export function isQuadSideHandle(handleId: string | null | undefined): boolean {
  return (
    handleId === 'top' ||
    handleId === 'left' ||
    handleId === 'right' ||
    handleId === 'bottom'
  )
}

/** Handle LAN ethernet (bukan FO). */
export function isLanHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false
  return (
    handleId === 'lan-in' ||
    handleId === 'wan-in' ||
    handleId === 'wan-out' ||
    handleId.startsWith('lan-out-')
  )
}

export function isLanInputHandle(handleId: string | null | undefined): boolean {
  return handleId === 'lan-in' || handleId === 'wan-in'
}

export function isLanOutputHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false
  return handleId === 'wan-out' || handleId.startsWith('lan-out-')
}

/** Handle input FO (masuk dari segala sisi) — termasuk port dua arah. */
export function isFoInputHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false
  if (isLanHandle(handleId)) return false
  return handleId === 'in' || handleId.startsWith('in-') || isQuadSideHandle(handleId)
}

/** Handle output FO (kanan / port keluar) — termasuk port dua arah. */
export function isFoOutputHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false
  if (isLanHandle(handleId)) return false
  return (
    handleId === 'out' ||
    handleId.startsWith('out-') ||
    handleId.startsWith('port-') ||
    isQuadSideHandle(handleId)
  )
}

/** Probe OPM (sumber) di segala sisi. */
export function isOpmProbeHandle(handleId: string | null | undefined): boolean {
  if (!handleId) return false
  return handleId === 'probe' || handleId.startsWith('probe-')
}

/** Titik ukur OPM (target) di segala sisi. */
export function isOpmMeasureHandle(handleId: string | null | undefined): boolean {
  return isFoInputHandle(handleId)
}

/** Map probe-* ↔ in-* pada sisi yang sama. */
export function opmPairHandle(handleId: string | null | undefined): string {
  if (!handleId) return 'in'
  if (handleId === 'probe') return 'in'
  if (handleId === 'in') return 'probe'
  if (handleId.startsWith('probe-')) return `in-${handleId.slice('probe-'.length)}`
  if (handleId.startsWith('in-')) return `probe-${handleId.slice('in-'.length)}`
  return 'in'
}

export type NormalizedConnection = {
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
}

/**
 * Arahkan tali OPM ke model ukur yang benar:
 * - Ukur di output → edge: komponen → OPM
 * - Probe di input → edge: OPM → komponen
 */
export function normalizeOpmConnection(
  connection: {
    source: string
    target: string
    sourceHandle?: string | null
    targetHandle?: string | null
  },
  isOpm: (id: string) => boolean,
): NormalizedConnection {
  let source = connection.source
  let target = connection.target
  let sourceHandle = connection.sourceHandle ?? null
  let targetHandle = connection.targetHandle ?? null

  const sourceIsOpm = isOpm(source)
  const targetIsOpm = isOpm(target)

  // OPM → output: balik jadi output → OPM (tap via in*)
  if (sourceIsOpm && isFoOutputHandle(targetHandle)) {
    const measureHandle = isOpmProbeHandle(sourceHandle)
      ? opmPairHandle(sourceHandle)
      : isOpmMeasureHandle(sourceHandle)
        ? sourceHandle
        : 'in'
    return {
      source: target,
      target: source,
      sourceHandle: targetHandle,
      targetHandle: measureHandle,
    }
  }

  // Input → OPM: balik jadi OPM → input (probe*)
  if (targetIsOpm && isFoInputHandle(sourceHandle)) {
    const probeHandle = isOpmMeasureHandle(targetHandle)
      ? opmPairHandle(targetHandle)
      : isOpmProbeHandle(targetHandle)
        ? targetHandle
        : 'probe'
    return {
      source: target,
      target: source,
      sourceHandle: probeHandle,
      targetHandle: sourceHandle,
    }
  }

  if (sourceIsOpm && !isOpmProbeHandle(sourceHandle)) {
    sourceHandle = isOpmMeasureHandle(sourceHandle) ? opmPairHandle(sourceHandle) : 'probe'
  }
  if (targetIsOpm && !isOpmMeasureHandle(targetHandle)) {
    targetHandle = isOpmProbeHandle(targetHandle) ? opmPairHandle(targetHandle) : 'in'
  }

  return { source, target, sourceHandle, targetHandle }
}
