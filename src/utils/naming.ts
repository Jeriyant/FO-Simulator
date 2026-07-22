import type { ComponentType } from '../data/components'

/** Prefix label tampilan per tipe komponen */
export const COMPONENT_LABEL_PREFIX: Record<ComponentType, string> = {
  olt: 'OLT',
  splitterRatio: 'SR',
  splitterBox: 'SB',
  patchcord: 'PC',
  connector: 'SL',
  barrel: 'BR',
  opm: 'OPM',
  onu: 'ONU',
  onuDual: 'ONUD',
  internet: 'INET',
  mikrotik: 'MT',
  smartphone: 'HP',
  komputer: 'KOMP',
}

function labelPattern(prefix: string): RegExp {
  return new RegExp(`^${prefix}-(\\d+)$`)
}

export function getNextComponentNumber(
  type: ComponentType,
  existingLabels: string[],
): number {
  const prefix = COMPONENT_LABEL_PREFIX[type]
  const pattern = labelPattern(prefix)
  let max = 0

  for (const label of existingLabels) {
    const match = label.match(pattern)
    if (match) {
      max = Math.max(max, Number.parseInt(match[1], 10))
    }
  }

  return max + 1
}

export function buildComponentLabel(type: ComponentType, number: number): string {
  return `${COMPONENT_LABEL_PREFIX[type]}-${number}`
}

export function getNextComponentLabel(
  type: ComponentType,
  existingLabels: string[],
): string {
  return buildComponentLabel(type, getNextComponentNumber(type, existingLabels))
}

export function isDuplicateLabel(
  labels: string[],
  label: string,
  excludeLabel?: string,
): boolean {
  const normalized = label.trim()
  if (!normalized) return false
  return labels.some((l) => l !== excludeLabel && l.trim() === normalized)
}

/** SSID berurutan mengikuti nomor label: ONU-3 → SSID-3, ONUD-2 → SSID-5G-2 */
export function buildOnuSsid(type: 'onu' | 'onuDual', label: string): string {
  const match = label.trim().match(/-(\d+)$/)
  const n = match ? match[1] : '1'
  return type === 'onuDual' ? `SSID-5G-${n}` : `SSID-${n}`
}
