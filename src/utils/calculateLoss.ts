import type { Edge, Node } from '@xyflow/react'
import {
  BARREL_LOSS,
  CONNECTOR_LOSS,
  PATCHCORD_LOSS,
  SPLITTER_BOXES,
  SPLITTER_RATIOS,
} from '../data/components'
import { DEFAULT_APP_SETTINGS, evaluateOnuSignalStatus, LEGACY_SPLITTER_MATERIAL, type AppSettings } from '../settings/types'
import type {
  FoEdgeData,
  FoNodeData,
  LossStep,
  OnuData,
  OpmData,
  PathResult,
  SplitterBoxData,
  SplitterRatioData,
} from '../types/fo'
import { DEFAULT_DHCP_SERVER, DEFAULT_INTERNET_DHCP } from '../types/fo'
import { getEdgeTotalLoss, normalizeEdgeData } from './edgeData'
import { buildOnuSsid } from './naming'

function isOnuNode(data: FoNodeData): data is OnuData {
  return data.type === 'onu' || data.type === 'onuDual'
}

export function getNodeBaseLoss(node: Node<FoNodeData>): number {
  const d = node.data
  switch (d.type) {
    case 'olt':
      return 0
    case 'patchcord':
      return d.loss ?? PATCHCORD_LOSS
    case 'connector':
      return d.loss ?? CONNECTOR_LOSS
    case 'barrel':
      return d.loss ?? BARREL_LOSS
    case 'opm':
      return 0
    case 'splitterBox':
      return d.loss
    case 'splitterRatio':
      return 0
    case 'onu':
    case 'onuDual':
    case 'internet':
    case 'mikrotik':
    case 'smartphone':
    case 'komputer':
      return 0
    default:
      return 0
  }
}

/** Loss applied when leaving a node via a specific source handle */
export function getExitLoss(node: Node<FoNodeData>, sourceHandle: string | null | undefined): number {
  const d = node.data
  if (d.type === 'splitterRatio') {
    if (sourceHandle === 'out-small') return d.lossSmall
    if (sourceHandle === 'out-large') return d.lossLarge
    return Math.max(d.lossSmall, d.lossLarge)
  }
  if (d.type === 'splitterBox') {
    return d.loss
  }
  return getNodeBaseLoss(node)
}

function writeOpmReading(
  opmUpdates: Map<string, Partial<OpmData>>,
  opmId: string,
  txPower: number,
  totalLoss: number,
) {
  const measuredPower = txPower - totalLoss
  const prev = opmUpdates.get(opmId)
  if (!prev || prev.totalLoss == null || totalLoss < (prev.totalLoss as number)) {
    opmUpdates.set(opmId, {
      measuredPower,
      totalLoss,
      status: 'connected',
    })
  }
}

function writeSplitterRatioPowers(
  srUpdates: Map<string, { powerLarge: number; powerSmall: number }>,
  nodeId: string,
  txPower: number,
  lossSoFar: number,
  sr: SplitterRatioData,
) {
  const powerIn = txPower - lossSoFar
  const powerLarge = powerIn - sr.lossLarge
  const powerSmall = powerIn - sr.lossSmall
  const prev = srUpdates.get(nodeId)
  if (!prev || powerLarge > prev.powerLarge) {
    srUpdates.set(nodeId, { powerLarge, powerSmall })
  }
}

function writeSplitterBoxPower(
  sbUpdates: Map<string, { powerOut: number }>,
  nodeId: string,
  txPower: number,
  lossSoFar: number,
  sb: SplitterBoxData,
) {
  const powerIn = txPower - lossSoFar
  const powerOut = powerIn - sb.loss
  const prev = sbUpdates.get(nodeId)
  if (!prev || powerOut > prev.powerOut) {
    sbUpdates.set(nodeId, { powerOut })
  }
}

/**
 * Trace every OLT → ONU path and compute optical budget.
 * Cable FO loss is applied on connection edges.
 * OPM measures at a tap: edge → OPM, or OPM → any input (probe).
 */
export function analyzeNetwork(
  nodes: Node<FoNodeData>[],
  edges: Edge[],
  settings: AppSettings = DEFAULT_APP_SETTINGS,
): { results: PathResult[]; updatedNodes: Node<FoNodeData>[] } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  /** OPM yang mem-probe input suatu node: targetNodeId → opmIds */
  const probesAt = new Map<string, string[]>()
  for (const e of edges) {
    const src = nodeMap.get(e.source)
    if (src?.data.type !== 'opm') continue
    const list = probesAt.get(e.target) ?? []
    list.push(e.source)
    probesAt.set(e.target, list)
  }

  const outEdges = new Map<string, Edge[]>()
  for (const e of edges) {
    if (e.data && (e.data as FoEdgeData).linkKind === 'lan') continue
    if (e.data && (e.data as FoEdgeData).linkKind === 'wireless') continue
    if (nodeMap.get(e.source)?.data.type === 'opm') continue
    // Skip LAN-only node types as FO path sources
    const srcType = nodeMap.get(e.source)?.data.type
    if (
      srcType === 'internet' ||
      srcType === 'mikrotik' ||
      srcType === 'smartphone' ||
      srcType === 'komputer'
    ) {
      continue
    }
    const list = outEdges.get(e.source) ?? []
    list.push(e)
    outEdges.set(e.source, list)
  }

  const results: PathResult[] = []
  const bestByOnu = new Map<string, PathResult>()
  const onuUpdates = new Map<string, Partial<OnuData>>()
  const opmUpdates = new Map<string, Partial<OpmData>>()
  const srUpdates = new Map<string, { powerLarge: number; powerSmall: number }>()
  const sbUpdates = new Map<string, { powerOut: number }>()

  const olts = nodes.filter((n) => n.data.type === 'olt')

  for (const olt of olts) {
    const txPower = olt.data.type === 'olt' ? olt.data.txPower : 0

    type Frame = {
      nodeId: string
      lossSoFar: number
      steps: LossStep[]
      path: string[]
    }

    const stack: Frame[] = [
      {
        nodeId: olt.id,
        lossSoFar: 0,
        steps: [
          {
            nodeId: olt.id,
            label: olt.data.label,
            type: 'olt',
            loss: 0,
            cumulative: 0,
            detail: `TX ${txPower.toFixed(2)} dBm`,
          },
        ],
        path: [olt.id],
      },
    ]

    while (stack.length) {
      const frame = stack.pop()!
      const node = nodeMap.get(frame.nodeId)
      if (!node) continue

      const probingOpms = probesAt.get(node.id)
      if (probingOpms) {
        for (const opmId of probingOpms) {
          writeOpmReading(opmUpdates, opmId, txPower, frame.lossSoFar)
        }
      }

      if (node.data.type === 'splitterRatio') {
        writeSplitterRatioPowers(
          srUpdates,
          node.id,
          txPower,
          frame.lossSoFar,
          node.data,
        )
      }

      if (node.data.type === 'splitterBox') {
        writeSplitterBoxPower(sbUpdates, node.id, txPower, frame.lossSoFar, node.data)
      }

      if (node.data.type === 'opm') {
        writeOpmReading(opmUpdates, node.id, txPower, frame.lossSoFar)
        continue
      }

      if (isOnuNode(node.data)) {
        const totalLoss = frame.lossSoFar
        const receivedPower = txPower - totalLoss
        const status = evaluateOnuSignalStatus(
          receivedPower,
          settings.onuStatusThresholds,
          true,
        )
        const candidate: PathResult = {
          onuId: node.id,
          onuLabel: node.data.label,
          txPower,
          totalLoss,
          receivedPower,
          status,
          steps: frame.steps,
          pathNodeIds: frame.path,
        }
        // Satu jalur aktif per ONU — pilih loss terkecil (hindari animasi cabang paralel)
        const prev = bestByOnu.get(node.id)
        if (!prev || candidate.totalLoss < prev.totalLoss) {
          bestByOnu.set(node.id, candidate)
          onuUpdates.set(node.id, {
            receivedPower,
            totalLoss,
            status,
          })
        }
        continue
      }

      const outgoing = outEdges.get(node.id) ?? []
      for (const edge of outgoing) {
        if (frame.path.includes(edge.target)) continue

        const nextNode = nodeMap.get(edge.target)
        if (!nextNode) continue

        const exitLoss = getExitLoss(node, edge.sourceHandle)
        const addLoss =
          node.data.type === 'olt'
            ? 0
            : node.data.type === 'splitterRatio' || node.data.type === 'splitterBox'
              ? exitLoss
              : getNodeBaseLoss(node)

        let stepLoss = addLoss
        let detail = `${addLoss.toFixed(2)} dB`

        if (node.data.type === 'splitterRatio') {
          const sr = node.data as SplitterRatioData
          const branch = edge.sourceHandle === 'out-small' ? 'kecil' : 'besar'
          const pct = edge.sourceHandle === 'out-small' ? sr.percentSmall : sr.percentLarge
          detail = `Cabang ${branch} ${pct}% · ${addLoss.toFixed(2)} dB · ${sr.brand}`
        } else if (node.data.type === 'splitterBox') {
          const sb = node.data as SplitterBoxData
          detail = `PLC ${sb.ratio} · ${addLoss.toFixed(2)} dB`
        } else if (node.data.type === 'olt') {
          stepLoss = 0
          detail = 'Port keluar'
        }

        let cumulative = frame.lossSoFar + stepLoss
        let nextSteps: LossStep[] =
          node.data.type === 'olt'
            ? frame.steps
            : [
                ...frame.steps,
                {
                  nodeId: node.id,
                  label: node.data.label,
                  type: node.data.type,
                  loss: stepLoss,
                  cumulative,
                  detail,
                },
              ]

        const edgeData = normalizeEdgeData(edge.data)
        const edgeLoss = getEdgeTotalLoss(edgeData, settings)
        if (edgeLoss > 0) {
          cumulative += edgeLoss
          const fromLabel = node.data.label
          const toLabel = nextNode.data.label
          const parts: string[] = []
          if (edgeData.hasPatchcord) parts.push('Patchcord')
          if (edgeData.hasSleeve) parts.push('Sleeve')
          if (edgeData.lengthValue > 0) {
            parts.push(`Kabel ${edgeData.lengthValue} ${edgeData.lengthUnit}`)
          }
          const detail =
            parts.length > 0
              ? `${parts.join(' + ')} · ${edgeLoss.toFixed(2)} dB`
              : `${edgeLoss.toFixed(2)} dB`
          nextSteps = [
            ...nextSteps,
            {
              edgeId: edge.id,
              label: `${fromLabel} → ${toLabel}`,
              type: 'connection',
              loss: edgeLoss,
              cumulative,
              detail,
            },
          ]
        }

        stack.push({
          nodeId: edge.target,
          lossSoFar: cumulative,
          steps: nextSteps,
          path: [...frame.path, edge.target],
        })
      }
    }
  }

  results.push(...bestByOnu.values())

  const connectedOnuIds = new Set(results.map((r) => r.onuId))
  for (const node of nodes) {
    if (isOnuNode(node.data) && !connectedOnuIds.has(node.id)) {
      onuUpdates.set(node.id, {
        receivedPower: null,
        totalLoss: null,
        status: 'disconnected',
      })
    }
    if (node.data.type === 'opm') {
      const linked = edges.some((e) => e.source === node.id || e.target === node.id)
      if (!linked || !opmUpdates.has(node.id)) {
        opmUpdates.set(node.id, {
          measuredPower: 0,
          totalLoss: 0,
          status: 'disconnected',
        })
      }
    }
  }

  const updatedNodes = nodes.map((n) => {
    if (isOnuNode(n.data)) {
      const patch = onuUpdates.get(n.id)
      if (!patch) return n
      return {
        ...n,
        data: {
          ...n.data,
          ...patch,
          type: n.data.type,
        },
      }
    }
    if (n.data.type === 'opm') {
      const patch = opmUpdates.get(n.id)
      if (!patch) return n
      return {
        ...n,
        data: {
          ...n.data,
          ...patch,
          type: 'opm' as const,
        },
      }
    }
    if (n.data.type === 'splitterRatio') {
      const patch = srUpdates.get(n.id)
      return {
        ...n,
        data: {
          ...n.data,
          powerLarge: patch?.powerLarge ?? null,
          powerSmall: patch?.powerSmall ?? null,
          type: 'splitterRatio' as const,
        },
      }
    }
    if (n.data.type === 'splitterBox') {
      const patch = sbUpdates.get(n.id)
      return {
        ...n,
        data: {
          ...n.data,
          powerOut: patch?.powerOut ?? null,
          type: 'splitterBox' as const,
        },
      }
    }
    return n
  })

  return { results, updatedNodes }
}

export function createDefaultData(
  type: FoNodeData['type'],
  label: string,
  settings: AppSettings = DEFAULT_APP_SETTINGS,
): FoNodeData {
  const comment = ''
  const ratios = settings.splitterRatios?.length ? settings.splitterRatios : SPLITTER_RATIOS
  const boxes = settings.splitterBoxes?.length ? settings.splitterBoxes : SPLITTER_BOXES
  const mat = settings.materialDefaults ?? DEFAULT_APP_SETTINGS.materialDefaults

  switch (type) {
    case 'olt':
      return {
        type: 'olt',
        label,
        comment,
        brand: mat.olt.brand,
        unitPrice: mat.olt.unitPrice,
        txPower: settings.oltTxPower,
        ports: settings.oltPorts,
      }
    case 'splitterRatio': {
      const spec =
        ratios.find((s) => s.ratio === settings.splitterRatio) ??
        ratios.find((s) => s.ratio === '1:99') ??
        ratios[0]
      return {
        type: 'splitterRatio',
        label,
        comment,
        ratio: spec.ratio,
        percentSmall: spec.percentSmall,
        percentLarge: spec.percentLarge,
        lossSmall: spec.lossSmall,
        lossLarge: spec.lossLarge,
        brand: spec.brand || LEGACY_SPLITTER_MATERIAL.splitterRatio.brand,
        unitPrice: Math.max(0, spec.unitPrice ?? LEGACY_SPLITTER_MATERIAL.splitterRatio.unitPrice),
        powerLarge: null,
        powerSmall: null,
      }
    }
    case 'splitterBox': {
      const spec =
        boxes.find((s) => s.ratio === settings.splitterBox) ??
        boxes.find((s) => s.ratio === '1:4') ??
        boxes[0]
      return {
        type: 'splitterBox',
        label,
        comment,
        ratio: spec.ratio,
        ports: spec.ports,
        loss: spec.loss,
        powerOut: null,
        brand: spec.brand || LEGACY_SPLITTER_MATERIAL.splitterBox.brand,
        unitPrice: Math.max(0, spec.unitPrice ?? LEGACY_SPLITTER_MATERIAL.splitterBox.unitPrice),
      }
    }
    case 'patchcord':
      return {
        type: 'patchcord',
        label,
        comment,
        brand: mat.patchcord.brand,
        unitPrice: mat.patchcord.unitPrice,
        loss: settings.patchcordLoss ?? PATCHCORD_LOSS,
      }
    case 'connector':
      return {
        type: 'connector',
        label,
        comment,
        brand: mat.connector.brand,
        unitPrice: mat.connector.unitPrice,
        loss: settings.connectorLoss ?? CONNECTOR_LOSS,
      }
    case 'barrel':
      return {
        type: 'barrel',
        label,
        comment,
        brand: mat.barrel.brand,
        unitPrice: mat.barrel.unitPrice,
        loss: settings.barrelLoss ?? BARREL_LOSS,
      }
    case 'opm':
      return {
        type: 'opm',
        label,
        comment,
        brand: mat.opm.brand,
        unitPrice: mat.opm.unitPrice,
        measuredPower: 0,
        totalLoss: 0,
        status: 'disconnected',
      }
    case 'onu':
      return {
        type: 'onu',
        label,
        comment,
        brand: mat.onu.brand,
        unitPrice: mat.onu.unitPrice,
        receivedPower: null,
        totalLoss: null,
        status: 'disconnected',
        ssid: buildOnuSsid('onu', label),
        wifiPassword: '1234',
        speedMbps: 100,
      }
    case 'onuDual':
      return {
        type: 'onuDual',
        label,
        comment,
        brand: mat.onuDual?.brand ?? mat.onu.brand,
        unitPrice: mat.onuDual?.unitPrice ?? mat.onu.unitPrice,
        receivedPower: null,
        totalLoss: null,
        status: 'disconnected',
        ssid: buildOnuSsid('onuDual', label),
        wifiPassword: '1234',
        speedMbps: 1000,
      }
    case 'internet':
      return {
        type: 'internet',
        label,
        comment,
        brand: mat.internet?.brand ?? 'ISP',
        unitPrice: mat.internet?.unitPrice ?? 0,
        dhcpServer: { ...DEFAULT_INTERNET_DHCP },
      }
    case 'mikrotik':
      return {
        type: 'mikrotik',
        label,
        comment,
        brand: mat.mikrotik?.brand ?? 'MikroTik',
        unitPrice: mat.mikrotik?.unitPrice ?? 1_200_000,
        dhcpClient: true,
        dhcpServer: { ...DEFAULT_DHCP_SERVER },
        lanSpeedMbps: 1000,
        wanIp: null,
        wanGateway: null,
        wanSubnetMask: null,
        wanConnected: false,
      }
    case 'smartphone':
      return {
        type: 'smartphone',
        label,
        comment,
        brand: mat.smartphone?.brand ?? 'Generic',
        unitPrice: mat.smartphone?.unitPrice ?? 2_500_000,
        ssid: '',
        wifiPassword: '',
        ipAddress: '',
        gateway: null,
        subnetMask: null,
        wifiConnected: false,
        online: false,
        speedMbps: null,
        connectedSsid: null,
        connectedPassword: null,
        wirelessOnuId: null,
      }
    case 'komputer':
      return {
        type: 'komputer',
        label,
        comment,
        brand: mat.komputer?.brand ?? 'Generic',
        unitPrice: mat.komputer?.unitPrice ?? 5_000_000,
        ipAddress: '',
        gateway: null,
        subnetMask: null,
        connected: false,
        speedMbps: null,
      }
  }
}

