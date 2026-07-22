import {
  getNodesBounds,
  getViewportForBounds,
  type Node,
} from '@xyflow/react'
import { toJpeg, toPng } from 'html-to-image'
import { readStoredLocale, t, type Locale } from '../i18n/translations'
import { slugifyFilename } from './projectFile'

export type MapImageFormat = 'png' | 'jpg'

const PADDING = 0.15
const MIN_ZOOM = 0
const MAX_ZOOM = 2
const MAX_SIDE = 4096
const BG = '#f5f5f4'

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = filename
  anchor.click()
}

async function saveBlobWithPicker(
  blob: Blob,
  suggestedName: string,
  format: MapImageFormat,
): Promise<boolean> {
  if (!('showSaveFilePicker' in window)) return false
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        format === 'png'
          ? {
              description: 'PNG Image',
              accept: { 'image/png': ['.png'] },
            }
          : {
              description: 'JPEG Image',
              accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
            },
      ],
    })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return true
    return false
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(',')
  const mime = /data:([^;]+);/.exec(header)?.[1] ?? 'image/png'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Export seluruh peta (semua node) ke PNG atau JPG.
 */
export async function exportMapAsImage(options: {
  nodes: Node[]
  projectTitle: string
  format: MapImageFormat
  locale?: Locale
}): Promise<void> {
  const { nodes, projectTitle, format } = options
  const locale = options.locale ?? readStoredLocale()
  if (nodes.length === 0) {
    throw new Error(t(locale, 'exportEmpty'))
  }

  const viewportEl = document.querySelector(
    '.react-flow__viewport',
  ) as HTMLElement | null
  if (!viewportEl) {
    throw new Error(t(locale, 'exportNoCanvas'))
  }

  const bounds = getNodesBounds(nodes)
  const width = Math.max(bounds.width, 1)
  const height = Math.max(bounds.height, 1)
  const paddedW = Math.ceil(width * (1 + PADDING * 2))
  const paddedH = Math.ceil(height * (1 + PADDING * 2))
  const scale = Math.min(1, MAX_SIDE / Math.max(paddedW, paddedH))
  const imageWidth = Math.max(1, Math.round(paddedW * scale))
  const imageHeight = Math.max(1, Math.round(paddedH * scale))

  const viewport = getViewportForBounds(
    bounds,
    imageWidth,
    imageHeight,
    MIN_ZOOM,
    MAX_ZOOM,
    PADDING,
  )

  const exportFn = format === 'png' ? toPng : toJpeg
  const dataUrl = await exportFn(viewportEl, {
    backgroundColor: BG,
    width: imageWidth,
    height: imageHeight,
    pixelRatio: 2,
    quality: format === 'jpg' ? 0.92 : undefined,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  })

  const base = slugifyFilename(projectTitle.trim() || 'peta-fo')
  const ext = format === 'png' ? 'png' : 'jpg'
  const filename = `${base}-peta.${ext}`

  const blob = dataUrlToBlob(dataUrl)
  const saved = await saveBlobWithPicker(blob, filename, format)
  if (!saved) downloadDataUrl(dataUrl, filename)
}
