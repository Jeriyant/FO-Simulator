import type { Edge, Node } from '@xyflow/react'
import type { ComponentType } from '../data/components'
import { statusLabel, t, type Locale } from '../i18n/translations'
import type { AppSettings } from '../settings/types'
import { DEFAULT_APP_SETTINGS } from '../settings/types'
import type { FoEdgeData, FoNodeData } from '../types/fo'
import { normalizeEdgeData } from './edgeData'

/** Qty Patchcord di laporan per tali ber-flag Patchcord. */
export const PATCHCORD_REPORT_QTY = 1

/** @deprecated gunakan t(locale, 'reportTitleMaterial') */
export const MATERIAL_REPORT_TITLE = 'Laporan Material & Biaya Proyek FO'
/** @deprecated */
export const QUANTITY_REPORT_TITLE = 'Laporan Rekap Jumlah Komponen FO'
/** @deprecated */
export const ONU_LOSS_REPORT_TITLE = 'Laporan Redaman ONU Proyek FO'

/** @deprecated gunakan MATERIAL_REPORT_TITLE */
export const REPORT_TITLE = MATERIAL_REPORT_TITLE

export type ReportRow = {
  no: number
  component: string
  brand: string
  qty: number
  unitPrice: number
  total: number
}

export type QuantityReportRow = {
  no: number
  component: string
  brand: string
  qty: number
}

export type OnuLossReportRow = {
  no: number
  label: string
  component: string
  status: string
  comment: string
  /** Daya terima ONU (dBm) — sama dengan RX di topologi */
  receivedPower: number | null
  /** Redaman total jalur (dB) — sama dengan LOSS di topologi */
  loss: number | null
}

export type MaterialReport = {
  kind: 'material'
  locale: Locale
  title: string
  projectTitle: string
  generatedAt: string
  rows: ReportRow[]
  grandTotal: number
}

export type QuantityReport = {
  kind: 'quantity'
  locale: Locale
  title: string
  projectTitle: string
  generatedAt: string
  rows: QuantityReportRow[]
  totalQty: number
}

export type OnuLossReport = {
  kind: 'onuLoss'
  locale: Locale
  title: string
  projectTitle: string
  generatedAt: string
  rows: OnuLossReportRow[]
}

export type FoReport = MaterialReport | QuantityReport | OnuLossReport

function dateLocale(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'id-ID'
}

function componentLabel(data: FoNodeData, locale: Locale): string {
  switch (data.type) {
    case 'olt':
      return t(locale, 'reportCompOlt')
    case 'splitterBox':
      return `${t(locale, 'reportCompSplitterBox')} ${data.ratio}`
    case 'splitterRatio':
      return `${t(locale, 'reportCompSplitterRatio')} ${data.ratio}`
    case 'onu':
      return t(locale, 'comp_onu')
    case 'onuDual':
      return t(locale, 'comp_onuDual')
    case 'opm':
      return t(locale, 'reportCompOpm')
    case 'patchcord':
      return t(locale, 'reportCompPatchcord')
    case 'connector':
      return t(locale, 'reportCompSleeve')
    case 'barrel':
      return t(locale, 'reportCompBarrel')
    case 'internet':
      return t(locale, 'comp_internet')
    case 'mikrotik':
      return t(locale, 'comp_mikrotik')
    case 'smartphone':
      return t(locale, 'comp_smartphone')
    case 'komputer':
      return t(locale, 'comp_komputer')
    default:
      return t(locale, 'reportCompGeneric')
  }
}

function sortKey(type: ComponentType): number {
  const order: ComponentType[] = [
    'olt',
    'opm',
    'splitterBox',
    'splitterRatio',
    'onu',
    'onuDual',
    'internet',
    'mikrotik',
    'smartphone',
    'komputer',
    'patchcord',
    'connector',
    'barrel',
  ]
  const i = order.indexOf(type)
  return i >= 0 ? i : 99
}

/** Tampilkan apa adanya dari data komponen (tanpa fallback setting). */
function asBrand(brand: unknown): string {
  return typeof brand === 'string' ? brand.trim() : ''
}

function asPrice(price: unknown): number {
  const n = typeof price === 'number' ? price : Number(price)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

export function formatRupiah(value: number): string {
  return `Rp${Math.round(value).toLocaleString('id-ID')}`
}

/** Format angka untuk input (titik pemisah ribuan, id-ID). */
export function formatCurrencyInput(value: number): string {
  if (!Number.isFinite(value) || value < 0) return ''
  if (value === 0) return '0'
  return Math.round(value).toLocaleString('id-ID')
}

/** Parse input mata uang → angka (abaikan non-digit). */
export function parseCurrencyInput(raw: string): number {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return 0
  const n = Number(digits)
  return Number.isFinite(n) ? n : 0
}

function reportMeta(projectTitle: string, locale: Locale) {
  return {
    locale,
    projectTitle: projectTitle.trim() || t(locale, 'untitledProject'),
    generatedAt: new Date().toLocaleString(dateLocale(locale), {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  }
}

type MatAgg = {
  type: ComponentType
  component: string
  brand: string
  unitPrice: number
  qty: number
}

type QtyAgg = {
  type: ComponentType
  component: string
  brand: string
  qty: number
}

function addMatQty(
  map: Map<string, MatAgg>,
  type: ComponentType,
  component: string,
  brand: string,
  unitPrice: number,
  qty: number,
) {
  if (!(qty > 0)) return
  const key = `${type}|${component}|${brand}|${unitPrice}`
  const prev = map.get(key)
  if (prev) prev.qty += qty
  else map.set(key, { type, component, brand, unitPrice, qty })
}

function addSimpleQty(
  map: Map<string, QtyAgg>,
  type: ComponentType,
  component: string,
  brand: string,
  qty: number,
) {
  if (!(qty > 0)) return
  const key = `${type}|${component}|${brand}`
  const prev = map.get(key)
  if (prev) prev.qty += qty
  else map.set(key, { type, component, brand, qty })
}

function aggregateEdgeAccessories(
  edges: Edge<FoEdgeData>[] | undefined,
  settings: AppSettings | undefined,
  onPatchcord: (brand: string, unitPrice: number, qty: number) => void,
  onSleeve: (brand: string, unitPrice: number, qty: number) => void,
) {
  if (!edges?.length) return
  const mat = settings?.materialDefaults ?? DEFAULT_APP_SETTINGS.materialDefaults
  for (const edge of edges) {
    const data = normalizeEdgeData(edge.data)
    if (data.hasPatchcord) {
      onPatchcord(
        asBrand(data.patchcordBrand) || asBrand(mat.patchcord.brand),
        (data.patchcordUnitPrice ?? 0) > 0
          ? asPrice(data.patchcordUnitPrice)
          : asPrice(mat.patchcord.unitPrice),
        PATCHCORD_REPORT_QTY,
      )
    }
    if (data.hasSleeve) {
      onSleeve(
        asBrand(data.sleeveBrand) || asBrand(mat.connector.brand),
        (data.sleeveUnitPrice ?? 0) > 0
          ? asPrice(data.sleeveUnitPrice)
          : asPrice(mat.connector.unitPrice),
        1,
      )
    }
  }
}

/**
 * Agregasi komponen kanvas → baris laporan (grup: nama komponen + merek + harga satuan).
 * Patchcord/Sleeve dari flag tali; Patchcord qty = 1 per tali.
 */
export function buildMaterialReport(
  nodes: Node<FoNodeData>[],
  projectTitle: string,
  locale: Locale = 'id',
  edges?: Edge<FoEdgeData>[],
  settings?: AppSettings,
): MaterialReport {
  const map = new Map<string, MatAgg>()

  for (const node of nodes) {
    const data = node.data
    const type = data.type
    const brand = asBrand(data.brand)
    const unitPrice = asPrice(data.unitPrice)
    const component = componentLabel(data, locale)
    const qty = type === 'patchcord' ? PATCHCORD_REPORT_QTY : 1
    addMatQty(map, type, component, brand, unitPrice, qty)
  }

  aggregateEdgeAccessories(
    edges,
    settings,
    (brand, unitPrice, qty) =>
      addMatQty(map, 'patchcord', t(locale, 'reportCompPatchcord'), brand, unitPrice, qty),
    (brand, unitPrice, qty) =>
      addMatQty(map, 'connector', t(locale, 'reportCompSleeve'), brand, unitPrice, qty),
  )

  const sorted = [...map.values()].sort((a, b) => {
    const d = sortKey(a.type) - sortKey(b.type)
    if (d !== 0) return d
    const c = a.component.localeCompare(b.component, dateLocale(locale))
    if (c !== 0) return c
    const br = a.brand.localeCompare(b.brand, dateLocale(locale))
    if (br !== 0) return br
    return a.unitPrice - b.unitPrice
  })

  const rows: ReportRow[] = sorted.map((row, i) => ({
    no: i + 1,
    component: row.component,
    brand: row.brand || '—',
    qty: row.qty,
    unitPrice: row.unitPrice,
    total: row.qty * row.unitPrice,
  }))

  const grandTotal = rows.reduce((sum, r) => sum + r.total, 0)

  return {
    kind: 'material',
    title: t(locale, 'reportTitleMaterial'),
    ...reportMeta(projectTitle, locale),
    rows,
    grandTotal,
  }
}

/**
 * Rekap jumlah komponen (grup: nama komponen + merek), tanpa harga.
 * Splitter Rasio digabung semua rasio (hanya hitung jumlah).
 */
export function buildQuantityReport(
  nodes: Node<FoNodeData>[],
  projectTitle: string,
  locale: Locale = 'id',
  edges?: Edge<FoEdgeData>[],
  settings?: AppSettings,
): QuantityReport {
  const map = new Map<string, QtyAgg>()

  for (const node of nodes) {
    const data = node.data
    const type = data.type
    const brand = asBrand(data.brand)
    const component =
      type === 'splitterRatio'
        ? t(locale, 'reportCompSplitterRatio')
        : componentLabel(data, locale)
    const qty = type === 'patchcord' ? PATCHCORD_REPORT_QTY : 1
    addSimpleQty(map, type, component, brand, qty)
  }

  aggregateEdgeAccessories(
    edges,
    settings,
    (brand, _unitPrice, qty) =>
      addSimpleQty(map, 'patchcord', t(locale, 'reportCompPatchcord'), brand, qty),
    (brand, _unitPrice, qty) =>
      addSimpleQty(map, 'connector', t(locale, 'reportCompSleeve'), brand, qty),
  )

  const sorted = [...map.values()].sort((a, b) => {
    const d = sortKey(a.type) - sortKey(b.type)
    if (d !== 0) return d
    const c = a.component.localeCompare(b.component, dateLocale(locale))
    if (c !== 0) return c
    return a.brand.localeCompare(b.brand, dateLocale(locale))
  })

  const rows: QuantityReportRow[] = sorted.map((row, i) => ({
    no: i + 1,
    component: row.component,
    brand: row.brand || '—',
    qty: row.qty,
  }))

  const totalQty = rows.reduce((sum, r) => sum + r.qty, 0)

  return {
    kind: 'quantity',
    title: t(locale, 'reportTitleQuantity'),
    ...reportMeta(projectTitle, locale),
    rows,
    totalQty,
  }
}

export function formatLossDb(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)} dB`
}

export function formatPowerDbm(value: number | null): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)} dBm`
}

/**
 * Daftar RX + total loss per ONU — nilai sama dengan metrik di topologi.
 */
export function buildOnuLossReport(
  nodes: Node<FoNodeData>[],
  projectTitle: string,
  locale: Locale = 'id',
): OnuLossReport {
  const onus = nodes
    .filter(
      (n): n is Node<Extract<FoNodeData, { type: 'onu' | 'onuDual' }>> =>
        n.data.type === 'onu' || n.data.type === 'onuDual',
    )
    .map((n) => n.data)
    .sort((a, b) => a.label.localeCompare(b.label, dateLocale(locale), { numeric: true }))

  const rows: OnuLossReportRow[] = onus.map((data, i) => {
    const linked = data.status !== 'disconnected'
    const loss =
      linked && typeof data.totalLoss === 'number' && Number.isFinite(data.totalLoss)
        ? data.totalLoss
        : null
    const receivedPower =
      linked && typeof data.receivedPower === 'number' && Number.isFinite(data.receivedPower)
        ? data.receivedPower
        : null
    const comment = typeof data.comment === 'string' ? data.comment.trim() : ''
    return {
      no: i + 1,
      label: data.label.trim() || '—',
      component:
        data.type === 'onuDual' ? t(locale, 'comp_onuDual') : t(locale, 'comp_onu'),
      status: statusLabel(locale, data.status),
      receivedPower,
      loss,
      comment: comment || '—',
    }
  })

  return {
    kind: 'onuLoss',
    title: t(locale, 'reportTitleOnuLoss'),
    ...reportMeta(projectTitle, locale),
    rows,
  }
}
