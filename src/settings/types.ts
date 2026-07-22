import type { SplitterBoxSpec, SplitterRatioSpec } from '../data/components'
import { CONNECTOR_LOSS, PATCHCORD_LOSS, BARREL_LOSS, SPLITTER_BOXES, SPLITTER_RATIOS } from '../data/components'

/** Status sinyal terukur. `disconnected` = belum ada jalur dari OLT. */
export type SignalStatus = 'perfect' | 'good' | 'low' | 'bad' | 'disconnected'

/**
 * Ambang status OPM & ONU — model ">".
 * Perfect > perfect · Good > good · Low > low · Bad > bad (≤ bad tetap Bad)
 */
export type StatusThresholds = {
  perfect: number
  good: number
  low: number
  bad: number
}

/** Alias — ONU memakai ambang yang sama dengan OPM. */
export type OnuStatusThresholds = StatusThresholds

export type AppSettings = {
  /** Default TX Power OLT (dBm) — "Redaman OLT" di UI */
  oltTxPower: number
  oltPorts: number
  /** Rasio default Splitter Ratio, mis. "1:99" */
  splitterRatio: string
  /** Rasio default Splitter Box, mis. "1:4" */
  splitterBox: string
  /** Tabel parameter Splitter Ratio */
  splitterRatios: SplitterRatioSpec[]
  /** Tabel parameter Splitter Box */
  splitterBoxes: SplitterBoxSpec[]
  /** Default loss Sleeve / Connector (dB) */
  connectorLoss: number
  /** Default loss Patchcord (dB) */
  patchcordLoss: number
  /** Default loss Barel SC/UPC (dB) */
  barrelLoss: number
  /**
   * Gaya jalur tali konektor.
   * smart = orthogonal + hindari menimpa node
   */
  edgePathStyle: EdgePathStyle
  /** Default merek & harga satuan per jenis komponen (untuk laporan) */
  materialDefaults: MaterialDefaultsMap
  /** Ambang status ONU (Perfect / Good / Low / Bad) */
  onuStatusThresholds: OnuStatusThresholds
}

/** Default merek + harga satuan (Rp) */
export type MaterialDefaults = {
  brand: string
  unitPrice: number
}

export type MaterialDefaultsMap = Record<
  | 'olt'
  | 'onu'
  | 'onuDual'
  | 'opm'
  | 'patchcord'
  | 'connector'
  | 'barrel'
  | 'internet'
  | 'mikrotik'
  | 'smartphone'
  | 'komputer',
  MaterialDefaults
>

/** Gaya path tali FO */
export type EdgePathStyle = 'bezier' | 'smoothstep' | 'step' | 'straight' | 'smart'

export const EDGE_PATH_STYLE_OPTIONS: { value: EdgePathStyle; label: string }[] = [
  { value: 'bezier', label: 'Melengkung' },
  { value: 'smoothstep', label: 'Halus' },
  { value: 'step', label: 'Siku' },
  { value: 'straight', label: 'Lurus' },
  { value: 'smart', label: 'Pintar' },
]

export const DEFAULT_STATUS_THRESHOLDS: StatusThresholds = {
  perfect: -14,
  good: -16,
  low: -25,
  bad: -30,
}

export const DEFAULT_ONU_STATUS_THRESHOLDS: OnuStatusThresholds = {
  ...DEFAULT_STATUS_THRESHOLDS,
}

export const DEFAULT_MATERIAL_DEFAULTS: MaterialDefaultsMap = {
  olt: { brand: 'HSGQ-G01ID', unitPrice: 3_500_000 },
  onu: { brand: 'Zimmlink', unitPrice: 350_000 },
  onuDual: { brand: 'Zimmlink', unitPrice: 550_000 },
  opm: { brand: 'Generic', unitPrice: 450_000 },
  patchcord: { brand: 'Ekonomis', unitPrice: 12_000 },
  connector: { brand: 'NoBrand', unitPrice: 3_000 },
  barrel: { brand: 'No Brand', unitPrice: 5_000 },
  internet: { brand: 'ISP', unitPrice: 0 },
  mikrotik: { brand: 'MikroTik', unitPrice: 1_200_000 },
  smartphone: { brand: 'Generic', unitPrice: 2_500_000 },
  komputer: { brand: 'Generic', unitPrice: 5_000_000 },
}

/** Fallback harga lama (materialDefaults) sebelum harga pindah ke tabel parameter. */
export const LEGACY_SPLITTER_MATERIAL = {
  splitterBox: { brand: 'Fujitomo', unitPrice: 50_000 },
  splitterRatio: { brand: 'Xumikura', unitPrice: 60_000 },
} as const

/** Brand dari katalog data komponen (rasio / box). */
export function buildDefaultSplitterRatios(): SplitterRatioSpec[] {
  return SPLITTER_RATIOS.map((s) => ({ ...s }))
}

export function buildDefaultSplitterBoxes(): SplitterBoxSpec[] {
  return SPLITTER_BOXES.map((s) => ({ ...s }))
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  oltTxPower: 8,
  oltPorts: 1,
  splitterRatio: '1:99',
  splitterBox: '1:4',
  splitterRatios: buildDefaultSplitterRatios(),
  splitterBoxes: buildDefaultSplitterBoxes(),
  connectorLoss: CONNECTOR_LOSS,
  patchcordLoss: PATCHCORD_LOSS,
  barrelLoss: BARREL_LOSS,
  edgePathStyle: 'smart',
  materialDefaults: structuredClone(DEFAULT_MATERIAL_DEFAULTS),
  onuStatusThresholds: { ...DEFAULT_ONU_STATUS_THRESHOLDS },
}

export const SIGNAL_STATUS_LABEL: Record<SignalStatus, string> = {
  perfect: 'Perfect',
  good: 'Good',
  low: 'Low',
  bad: 'Bad',
  disconnected: 'Disconnected',
}

/**
 * Perfect > perfect · Good > good · Low > low · Bad > bad (≤ bad tetap Bad)
 */
export function evaluateSignalFromThresholds(
  power: number | null | undefined,
  thresholds: StatusThresholds,
  connected: boolean,
): SignalStatus {
  if (!connected || power == null || Number.isNaN(power)) return 'disconnected'
  if (power > thresholds.perfect) return 'perfect'
  if (power > thresholds.good) return 'good'
  if (power > thresholds.low) return 'low'
  if (power > thresholds.bad) return 'bad'
  return 'bad'
}

/** ONU — Perfect / Good / Low / Bad. */
export function evaluateOnuSignalStatus(
  power: number | null | undefined,
  thresholds: OnuStatusThresholds,
  connected: boolean,
): SignalStatus {
  return evaluateSignalFromThresholds(power, thresholds, connected)
}

/** Parse "10:90" → persen kecil/besar */
export function percentsFromRatio(ratio: string): { percentSmall: number; percentLarge: number } {
  const [a, b] = ratio.split(':').map((p) => Number(p))
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { percentSmall: 0, percentLarge: 0 }
  return { percentSmall: a, percentLarge: b }
}
