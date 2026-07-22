import type { SignalStatus } from '../settings/types'

/**
 * Faktor throughput dari kualitas sinyal optik ONU.
 * Perfect ≈ penuh · Good sedikit turun · Low/Bad turun tajam.
 */
export function opticalSpeedFactor(status: SignalStatus | null | undefined): number {
  switch (status) {
    case 'perfect':
      return 1
    case 'good':
      return 0.85
    case 'low':
      return 0.5
    case 'bad':
      return 0.2
    case 'disconnected':
    default:
      return 0
  }
}

/**
 * Speed efektif klien (Mbps):
 * - Langsung ke Mikrotik → lanSpeed Mikrotik
 * - Lewat ONU → min(Mikrotik, ONU) × faktor redaman/status optik
 */
export function computeClientSpeedMbps(opts: {
  mikrotikSpeedMbps: number
  /** Ada jika jalur lewat ONU (LAN/WiFi) */
  onuSpeedMbps?: number | null
  onuStatus?: SignalStatus | null
}): number {
  const mt = Math.max(0, Number(opts.mikrotikSpeedMbps) || 0)
  if (mt <= 0) return 0

  if (opts.onuSpeedMbps != null && opts.onuSpeedMbps !== undefined) {
    const onuCap = Math.max(0, Number(opts.onuSpeedMbps) || 0)
    const factor = opticalSpeedFactor(opts.onuStatus)
    if (factor <= 0 || onuCap <= 0) return 0
    return Math.max(1, Math.round(Math.min(mt, onuCap) * factor))
  }

  return Math.round(mt)
}
