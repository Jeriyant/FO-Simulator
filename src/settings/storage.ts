import type { SplitterBoxSpec, SplitterRatioSpec } from '../data/components'
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_MATERIAL_DEFAULTS,
  DEFAULT_STATUS_THRESHOLDS,
  EDGE_PATH_STYLE_OPTIONS,
  LEGACY_SPLITTER_MATERIAL,
  buildDefaultSplitterBoxes,
  buildDefaultSplitterRatios,
  percentsFromRatio,
  type AppSettings,
  type EdgePathStyle,
  type MaterialDefaults,
  type MaterialDefaultsMap,
  type OnuStatusThresholds,
  type StatusThresholds,
} from './types'

const STORAGE_KEY = 'fo-simulator-settings-v8'

function clampNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeStatusThresholds(
  raw: Partial<StatusThresholds> | Record<string, unknown> | undefined,
): StatusThresholds {
  const base = DEFAULT_STATUS_THRESHOLDS
  const r = (raw ?? {}) as Record<string, unknown>
  // Migrasi format rentang lama (perfectMin) → model ">"
  if ('perfectMin' in r && !('perfect' in r)) {
    return {
      perfect: clampNumber(r.perfectMin, base.perfect),
      good: clampNumber(r.goodMin, base.good),
      low: clampNumber(r.lowMin ?? r.okMin, base.low),
      bad: clampNumber(r.badMin, base.bad),
    }
  }
  return {
    perfect: clampNumber(r.perfect, base.perfect),
    good: clampNumber(r.good, base.good),
    // Migrasi: ambil low, atau fallback dari ok lama
    low: clampNumber(r.low ?? r.ok, base.low),
    bad: clampNumber(r.bad, base.bad),
  }
}

function normalizeOnuThresholds(
  raw: Partial<OnuStatusThresholds> | Record<string, unknown> | undefined,
): OnuStatusThresholds {
  return normalizeStatusThresholds(raw)
}

function normalizeRatioRow(
  raw: Partial<SplitterRatioSpec>,
  fallback: SplitterRatioSpec,
  legacyPrice: number,
): SplitterRatioSpec {
  const ratio = typeof raw.ratio === 'string' && raw.ratio.includes(':') ? raw.ratio : fallback.ratio
  const pct = percentsFromRatio(ratio)
  const hasRowPrice = raw.unitPrice != null && Number.isFinite(Number(raw.unitPrice))
  return {
    ratio,
    percentSmall: pct.percentSmall || fallback.percentSmall,
    percentLarge: pct.percentLarge || fallback.percentLarge,
    lossSmall: clampNumber(raw.lossSmall, fallback.lossSmall),
    lossLarge: clampNumber(raw.lossLarge, fallback.lossLarge),
    brand: typeof raw.brand === 'string' ? raw.brand : fallback.brand,
    unitPrice: Math.max(
      0,
      clampNumber(raw.unitPrice, hasRowPrice ? fallback.unitPrice : legacyPrice),
    ),
  }
}

function normalizeSplitterRatios(raw: unknown, legacyPrice: number): SplitterRatioSpec[] {
  const defaults = buildDefaultSplitterRatios()
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults.map((base) => ({ ...base }))
  }

  const byRatio = new Map<string, Partial<SplitterRatioSpec>>()
  for (const row of raw) {
    if (row && typeof row === 'object' && 'ratio' in row) {
      const r = row as Partial<SplitterRatioSpec>
      if (typeof r.ratio === 'string') byRatio.set(r.ratio, r)
    }
  }

  return defaults.map((base) => {
    const patch = byRatio.get(base.ratio)
    if (!patch) {
      return { ...base, unitPrice: legacyPrice }
    }
    return normalizeRatioRow(patch, base, legacyPrice)
  })
}

function portsFromBoxRatio(ratio: string, fallback: number): number {
  const parts = ratio.split(':')
  const n = Number(parts[1])
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function normalizeBoxRow(
  raw: Partial<SplitterBoxSpec>,
  fallback: SplitterBoxSpec,
  legacyPrice: number,
): SplitterBoxSpec {
  const ratio = typeof raw.ratio === 'string' && raw.ratio.includes(':') ? raw.ratio : fallback.ratio
  const hasRowPrice = raw.unitPrice != null && Number.isFinite(Number(raw.unitPrice))
  return {
    ratio,
    ports: portsFromBoxRatio(ratio, fallback.ports),
    loss: clampNumber(raw.loss, fallback.loss),
    brand: typeof raw.brand === 'string' ? raw.brand : fallback.brand,
    unitPrice: Math.max(
      0,
      clampNumber(raw.unitPrice, hasRowPrice ? fallback.unitPrice : legacyPrice),
    ),
  }
}

function normalizeMaterialDefaults(raw: unknown): MaterialDefaultsMap {
  const base = structuredClone(DEFAULT_MATERIAL_DEFAULTS)
  if (!raw || typeof raw !== 'object') return base
  const src = raw as Partial<Record<keyof MaterialDefaultsMap, Partial<MaterialDefaults>>>
  for (const key of Object.keys(base) as (keyof MaterialDefaultsMap)[]) {
    const row = src[key]
    if (!row || typeof row !== 'object') continue
    base[key] = {
      brand: typeof row.brand === 'string' ? row.brand : base[key].brand,
      unitPrice: Math.max(0, clampNumber(row.unitPrice, base[key].unitPrice)),
    }
  }
  return base
}

function readLegacySplitterPrice(
  rawMaterial: unknown,
  key: 'splitterRatio' | 'splitterBox',
): number {
  if (!rawMaterial || typeof rawMaterial !== 'object') {
    return LEGACY_SPLITTER_MATERIAL[key].unitPrice
  }
  const row = (rawMaterial as Record<string, { unitPrice?: unknown }>)[key]
  return Math.max(0, clampNumber(row?.unitPrice, LEGACY_SPLITTER_MATERIAL[key].unitPrice))
}

function normalizeSplitterBoxes(raw: unknown, legacyPrice: number): SplitterBoxSpec[] {
  const defaults = buildDefaultSplitterBoxes()
  if (!Array.isArray(raw) || raw.length === 0) {
    return defaults.map((base) => ({ ...base }))
  }

  const byRatio = new Map<string, Partial<SplitterBoxSpec>>()
  for (const row of raw) {
    if (row && typeof row === 'object' && 'ratio' in row) {
      const r = row as Partial<SplitterBoxSpec>
      if (typeof r.ratio === 'string') byRatio.set(r.ratio, r)
    }
  }

  return defaults.map((base) => {
    const patch = byRatio.get(base.ratio)
    if (!patch) {
      return { ...base, unitPrice: legacyPrice }
    }
    return normalizeBoxRow(patch, base, legacyPrice)
  })
}

export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const legacyRatioPrice = readLegacySplitterPrice(raw?.materialDefaults, 'splitterRatio')
  const legacyBoxPrice = readLegacySplitterPrice(raw?.materialDefaults, 'splitterBox')
  const splitterRatios = normalizeSplitterRatios(raw?.splitterRatios, legacyRatioPrice)
  const splitterBoxes = normalizeSplitterBoxes(raw?.splitterBoxes, legacyBoxPrice)

  const ratio =
    typeof raw?.splitterRatio === 'string' &&
    splitterRatios.some((s) => s.ratio === raw.splitterRatio)
      ? raw.splitterRatio
      : DEFAULT_APP_SETTINGS.splitterRatio

  const box =
    typeof raw?.splitterBox === 'string' &&
    splitterBoxes.some((s) => s.ratio === raw.splitterBox)
      ? raw.splitterBox
      : DEFAULT_APP_SETTINGS.splitterBox

  const ports = Math.min(16, Math.max(1, Math.round(clampNumber(raw?.oltPorts, 1))))

  const edgeStyleRaw = raw?.edgePathStyle
  const edgePathStyle: EdgePathStyle =
    typeof edgeStyleRaw === 'string' &&
    EDGE_PATH_STYLE_OPTIONS.some((o) => o.value === edgeStyleRaw)
      ? (edgeStyleRaw as EdgePathStyle)
      : DEFAULT_APP_SETTINGS.edgePathStyle

  // Migrasi: statusThresholds lama atau onuStatusThresholds
  const legacyShared = (raw as { statusThresholds?: unknown } | null | undefined)?.statusThresholds
  const onuRaw = raw?.onuStatusThresholds ?? legacyShared

  return {
    oltTxPower: clampNumber(raw?.oltTxPower, DEFAULT_APP_SETTINGS.oltTxPower),
    oltPorts: ports,
    splitterRatio: ratio,
    splitterBox: box,
    splitterRatios,
    splitterBoxes,
    connectorLoss: clampNumber(raw?.connectorLoss, DEFAULT_APP_SETTINGS.connectorLoss),
    patchcordLoss: clampNumber(raw?.patchcordLoss, DEFAULT_APP_SETTINGS.patchcordLoss),
    barrelLoss: clampNumber(raw?.barrelLoss, DEFAULT_APP_SETTINGS.barrelLoss),
    edgePathStyle,
    materialDefaults: normalizeMaterialDefaults(raw?.materialDefaults),
    onuStatusThresholds: normalizeOnuThresholds(onuRaw as Partial<OnuStatusThresholds> | undefined),
  }
}

function loadLegacy(): Partial<AppSettings> | null {
  for (const key of [
    'fo-simulator-settings-v7',
    'fo-simulator-settings-v6',
    'fo-simulator-settings-v5',
    'fo-simulator-settings-v4',
    'fo-simulator-settings-v3',
    'fo-simulator-settings-v2',
    'fo-simulator-settings-v1',
  ]) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as Partial<AppSettings>
    } catch {
      /* ignore */
    }
  }
  return null
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeSettings(JSON.parse(raw) as Partial<AppSettings>)
    const legacy = loadLegacy()
    if (legacy) return normalizeSettings(legacy)
    return normalizeSettings(DEFAULT_APP_SETTINGS)
  } catch {
    return normalizeSettings(DEFAULT_APP_SETTINGS)
  }
}

export function saveSettings(settings: AppSettings): void {
  const normalized = normalizeSettings(settings)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
}
