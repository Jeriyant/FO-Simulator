import type { Edge } from '@xyflow/react'
import {
  CABLE_LOSS_PER_KM,
  CONNECTOR_LOSS,
  PATCHCORD_LOSS,
} from '../data/components'
import type { AppSettings } from '../settings/types'
import { DEFAULT_APP_SETTINGS } from '../settings/types'
import type { FoEdgeData } from '../types/fo'

function asOptionalNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function asNonNegNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function createDefaultEdgeData(
  extras?: Partial<
    Pick<
      FoEdgeData,
      | 'hasPatchcord'
      | 'hasSleeve'
      | 'patchcordBrand'
      | 'patchcordUnitPrice'
      | 'patchcordLoss'
      | 'sleeveBrand'
      | 'sleeveUnitPrice'
      | 'sleeveLoss'
    >
  >,
): FoEdgeData {
  return normalizeEdgeData({
    lengthValue: 0,
    lengthUnit: 'm',
    lossPerKm: CABLE_LOSS_PER_KM,
    color: null,
    hasPatchcord: Boolean(extras?.hasPatchcord),
    hasSleeve: Boolean(extras?.hasSleeve),
    patchcordBrand: extras?.patchcordBrand ?? '',
    patchcordUnitPrice: extras?.patchcordUnitPrice ?? 0,
    patchcordLoss: extras?.patchcordLoss ?? null,
    sleeveBrand: extras?.sleeveBrand ?? '',
    sleeveUnitPrice: extras?.sleeveUnitPrice ?? 0,
    sleeveLoss: extras?.sleeveLoss ?? null,
  })
}

/** Isi default aksesori dari settings (saat Quick / toggle on). */
export function accessoryDefaultsFromSettings(settings: AppSettings = DEFAULT_APP_SETTINGS) {
  const mat = settings.materialDefaults ?? DEFAULT_APP_SETTINGS.materialDefaults
  return {
    patchcordBrand: mat.patchcord.brand ?? '',
    patchcordUnitPrice: mat.patchcord.unitPrice ?? 0,
    patchcordLoss: settings.patchcordLoss ?? PATCHCORD_LOSS,
    sleeveBrand: mat.connector.brand ?? '',
    sleeveUnitPrice: mat.connector.unitPrice ?? 0,
    sleeveLoss: settings.connectorLoss ?? CONNECTOR_LOSS,
  }
}

export function normalizeEdgeData(data: unknown): FoEdgeData {
  const d = (data ?? {}) as Partial<FoEdgeData>
  const color =
    typeof d.color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(d.color.trim())
      ? d.color.trim()
      : null
  return {
    lengthValue: typeof d.lengthValue === 'number' ? d.lengthValue : 0,
    lengthUnit: d.lengthUnit === 'km' ? 'km' : 'm',
    lossPerKm: typeof d.lossPerKm === 'number' ? d.lossPerKm : CABLE_LOSS_PER_KM,
    color,
    hasPatchcord: Boolean(d.hasPatchcord),
    patchcordBrand: typeof d.patchcordBrand === 'string' ? d.patchcordBrand : '',
    patchcordUnitPrice: asNonNegNumber(d.patchcordUnitPrice, 0),
    patchcordLoss: asOptionalNumber(d.patchcordLoss),
    hasSleeve: Boolean(d.hasSleeve),
    sleeveBrand: typeof d.sleeveBrand === 'string' ? d.sleeveBrand : '',
    sleeveUnitPrice: asNonNegNumber(d.sleeveUnitPrice, 0),
    sleeveLoss: asOptionalNumber(d.sleeveLoss),
    linkKind:
      d.linkKind === 'lan' || d.linkKind === 'wireless' || d.linkKind === 'fo'
        ? d.linkKind
        : undefined,
  }
}

export function getEdgeCableLoss(data: FoEdgeData): number {
  const km = data.lengthUnit === 'km' ? data.lengthValue : data.lengthValue / 1000
  return km * (data.lossPerKm ?? CABLE_LOSS_PER_KM)
}

/** Loss Patchcord + Sleeve pada tali (custom edge → settings → default). */
export function getEdgeAccessoryLoss(
  data: FoEdgeData,
  settings?: Pick<AppSettings, 'patchcordLoss' | 'connectorLoss'>,
): number {
  const pcDefault = settings?.patchcordLoss ?? PATCHCORD_LOSS
  const slDefault = settings?.connectorLoss ?? CONNECTOR_LOSS
  let loss = 0
  if (data.hasPatchcord) {
    loss += data.patchcordLoss != null && Number.isFinite(data.patchcordLoss)
      ? data.patchcordLoss
      : pcDefault
  }
  if (data.hasSleeve) {
    loss += data.sleeveLoss != null && Number.isFinite(data.sleeveLoss)
      ? data.sleeveLoss
      : slDefault
  }
  return loss
}

export function getEdgeTotalLoss(
  data: FoEdgeData,
  settings?: Pick<AppSettings, 'patchcordLoss' | 'connectorLoss'>,
): number {
  return getEdgeCableLoss(data) + getEdgeAccessoryLoss(data, settings)
}

/** Label tampilan di tali koneksi; kosong jika panjang belum diisi. */
export function formatEdgeLengthLabel(data: FoEdgeData | undefined): string | undefined {
  if (!data || !(data.lengthValue > 0)) return undefined
  const raw = data.lengthValue
  const value = Number.isInteger(raw) ? String(raw) : String(Number(raw.toFixed(2)))
  return `${value} ${data.lengthUnit}`
}

export function normalizeEdge(edge: Edge): Edge<FoEdgeData> {
  return {
    ...edge,
    data: normalizeEdgeData(edge.data),
  }
}

/** Map handle lama Patchcord/Sleeve/Barel → port dua arah top/left/right/bottom. */
export function mapQuadPortHandle(handle: string | null | undefined): string | null {
  if (!handle) return handle ?? null
  if (handle === 'top' || handle === 'left' || handle === 'right' || handle === 'bottom') {
    return handle
  }
  if (handle === 'out' || handle === 'out-1') return 'right'
  if (handle === 'out-top') return 'top'
  if (handle === 'out-left') return 'left'
  if (handle === 'out-bottom' || handle === 'out-2') return 'bottom'
  if (handle === 'in' || handle === 'in-1') return 'left'
  if (handle === 'in-top' || handle === 'in-2') return 'top'
  if (handle === 'in-right') return 'right'
  if (handle === 'in-bottom') return 'bottom'
  return handle
}

/** Patchcord/Sleeve/Barel: map handle lama ke 4 port dua arah. */
export function migrateLegacyQuadPortHandles<
  E extends Edge,
  N extends { id: string; type?: string },
>(edges: E[], nodes: N[]): E[] {
  const quadTypes = new Set(['patchcord', 'connector', 'barrel'])
  const byId = new Map(nodes.map((n) => [n.id, n]))

  return edges.map((edge) => {
    const sourceNode = byId.get(edge.source)
    const targetNode = byId.get(edge.target)
    let sourceHandle = edge.sourceHandle ?? null
    let targetHandle = edge.targetHandle ?? null
    let changed = false

    if (sourceNode && quadTypes.has(sourceNode.type ?? '')) {
      const next = mapQuadPortHandle(sourceHandle)
      if (next !== sourceHandle) {
        sourceHandle = next
        changed = true
      }
    }
    if (targetNode && quadTypes.has(targetNode.type ?? '')) {
      const next = mapQuadPortHandle(targetHandle)
      if (next !== targetHandle) {
        targetHandle = next
        changed = true
      }
    }

    if (!changed) return edge
    return { ...edge, sourceHandle, targetHandle }
  })
}
