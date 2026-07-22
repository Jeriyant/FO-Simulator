import type { Edge, Node } from '@xyflow/react'
import type { FoNodeData, FoEdgeData } from '../types/fo'
import { readStoredLocale, t, type Locale } from '../i18n/translations'
import { resolveDhcpCidr } from './cidr'
import { normalizeEdge, migrateLegacyQuadPortHandles } from './edgeData'
import { buildOnuSsid } from './naming'

export const PROJECT_FILE_VERSION = 1
export const PROJECT_FILE_EXT = '.fo.json'

export type FoProjectFile = {
  version: typeof PROJECT_FILE_VERSION
  title: string
  nodes: Node<FoNodeData>[]
  edges: Edge<FoEdgeData>[]
  savedAt: string
}

export function createEmptyProject(title?: string, locale?: Locale): FoProjectFile {
  const loc = locale ?? readStoredLocale()
  return {
    version: PROJECT_FILE_VERSION,
    title: title ?? t(loc, 'newProject'),
    nodes: [],
    edges: [],
    savedAt: new Date().toISOString(),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeNode(node: Node<FoNodeData>): Node<FoNodeData> | null {
  if ((node.data as { type?: string }).type === 'cable') return null
  const data = node.data as FoNodeData & { brand?: unknown; unitPrice?: unknown }
  let next = {
    ...data,
    comment: typeof data.comment === 'string' ? data.comment : '',
    brand: typeof data.brand === 'string' ? data.brand : '',
    unitPrice:
      typeof data.unitPrice === 'number' && Number.isFinite(data.unitPrice)
        ? data.unitPrice
        : 0,
  } as FoNodeData

  if (next.type === 'onu' || next.type === 'onuDual') {
    next = {
      ...next,
      ssid:
        typeof next.ssid === 'string' && next.ssid
          ? next.ssid
          : buildOnuSsid(next.type, next.label),
      wifiPassword:
        typeof next.wifiPassword === 'string' && next.wifiPassword
          ? next.wifiPassword
          : '1234',
      speedMbps:
        typeof next.speedMbps === 'number' && next.speedMbps > 0
          ? next.speedMbps
          : next.type === 'onuDual'
            ? 1000
            : 100,
    }
  }

  if (next.type === 'smartphone') {
    next = {
      ...next,
      ssid: typeof next.ssid === 'string' ? next.ssid : '',
      wifiPassword: typeof next.wifiPassword === 'string' ? next.wifiPassword : '',
    }
  }

  if (next.type === 'internet' || next.type === 'mikrotik') {
    const dhcp = next.dhcpServer
    if (dhcp) {
      const resolved = resolveDhcpCidr(dhcp)
      next = {
        ...next,
        dhcpServer: {
          enabled: Boolean(dhcp.enabled),
          cidr: resolved?.cidr ?? dhcp.cidr ?? '',
          poolStart: typeof dhcp.poolStart === 'string' ? dhcp.poolStart : '',
          poolEnd: typeof dhcp.poolEnd === 'string' ? dhcp.poolEnd : '',
        },
      }
    }
    if (next.type === 'mikrotik') {
      next = {
        ...next,
        lanSpeedMbps:
          typeof next.lanSpeedMbps === 'number' && next.lanSpeedMbps > 0
            ? next.lanSpeedMbps
            : 1000,
      }
    }
  }

  return {
    ...node,
    data: next,
  }
}

export function parseProjectFile(raw: unknown, locale?: Locale): FoProjectFile {
  const loc = locale ?? readStoredLocale()
  if (!isRecord(raw)) {
    throw new Error(t(loc, 'fileInvalidFormat'))
  }

  if (raw.version !== PROJECT_FILE_VERSION) {
    throw new Error(t(loc, 'fileUnsupportedVersion'))
  }

  if (typeof raw.title !== 'string') {
    throw new Error(t(loc, 'fileTitleMissing'))
  }

  if (!Array.isArray(raw.nodes) || !Array.isArray(raw.edges)) {
    throw new Error(t(loc, 'fileDataInvalid'))
  }

  const nodes = (raw.nodes as Node<FoNodeData>[])
    .map(normalizeNode)
    .filter((n): n is Node<FoNodeData> => n !== null)
  const edges = migrateLegacyQuadPortHandles(
    (raw.edges as Edge[]).map(normalizeEdge),
    nodes,
  )

  return {
    version: PROJECT_FILE_VERSION,
    title: raw.title.trim() || t(loc, 'untitledProject'),
    nodes,
    edges,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date().toISOString(),
  }
}

export function serializeProject(
  title: string,
  nodes: Node<FoNodeData>[],
  edges: Edge<FoEdgeData>[],
  locale?: Locale,
): FoProjectFile {
  const loc = locale ?? readStoredLocale()
  const cleanNodes = nodes.map(({ selected: _s, dragging: _d, ...node }) => node)
  const cleanEdges = edges.map(({ selected: _s, ...edge }) => edge)

  return {
    version: PROJECT_FILE_VERSION,
    title: title.trim() || t(loc, 'untitledProject'),
    nodes: cleanNodes,
    edges: cleanEdges,
    savedAt: new Date().toISOString(),
  }
}

export function slugifyFilename(title: string): string {
  const slug = title
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'proyek-fo'
}

/** Ambil judul tampilan dari nama file (buang ekstensi .fo.json / .json). */
export function titleFromFilename(filename: string, locale?: Locale): string {
  const loc = locale ?? readStoredLocale()
  let name = filename.trim()
  const lower = name.toLowerCase()
  if (lower.endsWith('.fo.json')) {
    name = name.slice(0, -'.fo.json'.length)
  } else if (lower.endsWith('.json')) {
    name = name.slice(0, -'.json'.length)
  }
  return name.trim() || t(loc, 'untitledProject')
}

export function downloadProject(project: FoProjectFile): void {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${slugifyFilename(project.title)}${PROJECT_FILE_EXT}`
  anchor.click()
  URL.revokeObjectURL(url)
}

const FO_FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: 'FO Simulator Project',
    accept: { 'application/json': ['.fo.json', '.json'] },
  },
]

export function supportsFileSystemAccess(): boolean {
  return typeof window !== 'undefined' && 'showOpenFilePicker' in window
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export async function writeProjectToHandle(
  handle: FileSystemFileHandle,
  project: FoProjectFile,
): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(JSON.stringify(project, null, 2))
  await writable.close()
}

export async function openProjectWithPicker(): Promise<{
  project: FoProjectFile
  handle: FileSystemFileHandle
} | null> {
  const [handle] = await window.showOpenFilePicker({
    types: FO_FILE_TYPES,
    multiple: false,
  })
  const file = await handle.getFile()
  const project = parseProjectFile(JSON.parse(await file.text()))
  return { project, handle }
}

export async function saveProjectWithPicker(
  project: FoProjectFile,
): Promise<FileSystemFileHandle | null> {
  const handle = await window.showSaveFilePicker({
    types: FO_FILE_TYPES,
    suggestedName: `${slugifyFilename(project.title)}${PROJECT_FILE_EXT}`,
  })
  return handle
}

export function syncIdCounter(nodes: Node[], edges: Edge[]): number {
  let max = 0
  const scan = (id: string) => {
    const match = id.match(/-(\d+)$/)
    if (match) max = Math.max(max, Number.parseInt(match[1], 10))
  }
  for (const node of nodes) scan(node.id)
  for (const edge of edges) scan(edge.id)
  return max + 1
}
