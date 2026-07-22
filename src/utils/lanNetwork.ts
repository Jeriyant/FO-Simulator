import type { Edge, Node } from '@xyflow/react'
import type {
  DhcpServerConfig,
  FoEdgeData,
  FoNodeData,
  InternetData,
  KomputerData,
  MikrotikData,
  OnuData,
  SmartphoneData,
} from '../types/fo'
import { resolveDhcpCidr, deriveDhcpPoolFromCidr } from './cidr'
import { computeClientSpeedMbps } from './clientSpeed'
import { isLanHandle, isLanOutputHandle } from './connectionHelpers'

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) {
    return null
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

/** Pool DHCP dari gateway CIDR (.2–.254); nilai pool tersimpan di UI diabaikan. */
export function resolveDhcpPool(dhcp: DhcpServerConfig): { start: number; end: number } | null {
  const resolved = resolveDhcpCidr(dhcp)
  if (!resolved) return null
  const gw = ipToInt(resolved.gateway)
  if (gw == null) return null

  const pool = deriveDhcpPoolFromCidr(resolved.cidr)
  if (!pool) return null
  const start = ipToInt(pool.poolStart)
  const end = ipToInt(pool.poolEnd)
  if (start == null || end == null || start > end) return null
  if (start === gw || end === gw) return null
  return { start, end }
}

function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Ambil IP dari pool DHCP (subnet gateway).
 * Pilihan acak-stabil dari seed, tetap di dalam poolStart–poolEnd yang sudah di-resolve.
 */
export function pickPoolIp(
  dhcp: DhcpServerConfig,
  seed: string,
  used: Set<string>,
): string | null {
  const range = resolveDhcpPool(dhcp)
  const resolved = resolveDhcpCidr(dhcp)
  if (!range || !resolved) return null
  const { start, end } = range
  const size = end - start + 1
  const offset = hashSeed(seed) % size
  const gw = resolved.gateway
  for (let i = 0; i < size; i++) {
    const ip = intToIp(start + ((offset + i) % size))
    if (ip !== gw && !used.has(ip)) {
      used.add(ip)
      return ip
    }
  }
  return null
}

function isOnuType(data: FoNodeData): data is OnuData {
  return data.type === 'onu' || data.type === 'onuDual'
}

function dhcpKey(dhcp: DhcpServerConfig): string {
  const r = resolveDhcpCidr(dhcp)
  const pool = r ? deriveDhcpPoolFromCidr(r.cidr) : null
  return `${r?.cidr ?? ''}|${pool?.poolStart ?? ''}|${pool?.poolEnd ?? ''}`
}

/** Cari Mikrotik lewat jalur LAN saja (bukan FO optik). */
function findUpstreamMikrotik(
  nodes: Node<FoNodeData>[],
  edges: Edge<FoEdgeData>[],
  startId: string,
): MikrotikData | null {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const visited = new Set<string>()
  const queue = [startId]
  while (queue.length) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = nodeMap.get(id)
    if (!node) continue
    if (node.data.type === 'mikrotik' && node.data.dhcpServer?.enabled) {
      return node.data
    }
    for (const e of edges) {
      if (e.data?.linkKind === 'wireless' || e.data?.linkKind === 'fo') continue
      // Hanya ikuti edge LAN / tanpa kind (treat as possible LAN if handles LAN)
      const lanish =
        e.data?.linkKind === 'lan' ||
        isLanHandle(e.sourceHandle) ||
        isLanHandle(e.targetHandle)
      if (!lanish) continue
      if (e.target === id) queue.push(e.source)
      if (e.source === id) queue.push(e.target)
    }
  }
  // Fallback: mikrotik DHCP manapun di kanvas
  for (const n of nodes) {
    if (n.data.type === 'mikrotik' && n.data.dhcpServer?.enabled) return n.data
  }
  return null
}

function findInternet(nodes: Node<FoNodeData>[]): InternetData | null {
  for (const n of nodes) {
    if (n.data.type === 'internet') return n.data
  }
  return null
}

function lanNeighbors(
  edges: Edge<FoEdgeData>[],
  nodeId: string,
): { peerId: string; fromHandle: string | null; toHandle: string | null }[] {
  const out: { peerId: string; fromHandle: string | null; toHandle: string | null }[] = []
  for (const e of edges) {
    if (e.data?.linkKind === 'wireless') continue
    if (e.source === nodeId && isLanOutputHandle(e.sourceHandle)) {
      out.push({
        peerId: e.target,
        fromHandle: e.sourceHandle ?? null,
        toHandle: e.targetHandle ?? null,
      })
    }
  }
  return out
}

function credsMatch(a: string | undefined | null, b: string | undefined | null): boolean {
  return (a ?? '').trim() === (b ?? '').trim() && (a ?? '').trim() !== ''
}

export type LanAnalyzeResult = {
  updatedNodes: Node<FoNodeData>[]
  wirelessEdges: Edge<FoEdgeData>[]
}

/**
 * Simulasi LAN/WiFi:
 * - Internet → Mikrotik (WAN DHCP client)
 * - Mikrotik DHCP server → komputer / ONU LAN → komputer / smartphone WiFi
 * IP klien selalu dari pool yang disesuaikan ke subnet gateway Mikrotik.
 */
export function analyzeLanNetwork(
  nodes: Node<FoNodeData>[],
  edges: Edge<FoEdgeData>[],
): LanAnalyzeResult {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const usedByDhcp = new Map<string, Set<string>>()
  const patches = new Map<string, Partial<FoNodeData>>()
  const wirelessEdges: Edge<FoEdgeData>[] = []

  const usedSet = (dhcp: DhcpServerConfig) => {
    const key = dhcpKey(dhcp)
    let set = usedByDhcp.get(key)
    if (!set) {
      set = new Set<string>()
      usedByDhcp.set(key, set)
    }
    return set
  }

  const internet = findInternet(nodes)

  // Mikrotik WAN dari Internet
  for (const n of nodes) {
    if (n.data.type !== 'mikrotik') continue
    const mt = n.data
    const linkedToInternet = edges.some((e) => {
      if (e.data?.linkKind === 'wireless') return false
      const a = e.source === n.id ? e.target : e.target === n.id ? e.source : null
      if (!a) return false
      return nodeMap.get(a)?.data.type === 'internet'
    })

    if (mt.dhcpClient && linkedToInternet && internet?.dhcpServer?.enabled) {
      const inetDhcp = internet.dhcpServer
      const inetResolved = resolveDhcpCidr(inetDhcp)
      const wanIp =
        pickPoolIp(inetDhcp, `wan:${n.id}`, usedSet(inetDhcp)) ??
        (() => {
          const range = resolveDhcpPool(inetDhcp)
          return range ? intToIp(range.start) : inetDhcp.poolStart
        })()
      patches.set(n.id, {
        ...mt,
        wanIp,
        wanGateway: inetResolved?.cidr ?? inetDhcp.cidr,
        wanSubnetMask: inetResolved ? `/${inetResolved.prefix}` : null,
        wanConnected: true,
      } as MikrotikData)
    } else {
      patches.set(n.id, {
        ...mt,
        wanIp: null,
        wanGateway: null,
        wanSubnetMask: null,
        wanConnected: false,
      } as MikrotikData)
    }
  }

  const assignClient = (
    nodeId: string,
    dhcp: DhcpServerConfig,
    speedMbps: number,
    kind: 'komputer' | 'smartphone',
    extra: Record<string, unknown> = {},
  ) => {
    const ip = pickPoolIp(dhcp, `${kind}:${nodeId}`, usedSet(dhcp))
    const resolved = resolveDhcpCidr(dhcp)
    const gateway = resolved?.gateway ?? null
    const subnetMask = resolved ? `/${resolved.prefix}` : null
    if (kind === 'komputer') {
      const cur = nodeMap.get(nodeId)?.data as KomputerData
      patches.set(nodeId, {
        ...cur,
        ipAddress: ip ?? '',
        gateway: ip ? gateway : null,
        subnetMask: ip ? subnetMask : null,
        connected: Boolean(ip),
        speedMbps: ip ? speedMbps : null,
        ...extra,
      } as KomputerData)
    } else {
      const cur = nodeMap.get(nodeId)?.data as SmartphoneData
      patches.set(nodeId, {
        ...cur,
        ipAddress: ip ?? '',
        gateway: ip ? gateway : null,
        subnetMask: ip ? subnetMask : null,
        online: Boolean(ip),
        speedMbps: ip ? speedMbps : null,
        ...extra,
      } as SmartphoneData)
    }
  }

  // Wired: Mikrotik LAN → komputer / ONU → komputer
  for (const n of nodes) {
    if (n.data.type !== 'mikrotik' || !n.data.dhcpServer?.enabled) continue
    const dhcp = n.data.dhcpServer
    const mtSpeed = n.data.lanSpeedMbps || 1000
    for (const hop of lanNeighbors(edges, n.id)) {
      const peer = nodeMap.get(hop.peerId)
      if (!peer) continue
      if (peer.data.type === 'komputer') {
        assignClient(
          peer.id,
          dhcp,
          computeClientSpeedMbps({ mikrotikSpeedMbps: mtSpeed }),
          'komputer',
        )
      }
      if (isOnuType(peer.data)) {
        // ONU harus FO-linked agar meneruskan DHCP Mikrotik
        if (peer.data.status === 'disconnected') continue
        for (const hop2 of lanNeighbors(edges, peer.id)) {
          const client = nodeMap.get(hop2.peerId)
          if (client?.data.type === 'komputer') {
            assignClient(
              client.id,
              dhcp,
              computeClientSpeedMbps({
                mikrotikSpeedMbps: mtSpeed,
                onuSpeedMbps: peer.data.speedMbps || 100,
                onuStatus: peer.data.status,
              }),
              'komputer',
            )
          }
        }
      }
    }
  }

  // Fallback: komputer di ONU LAN tanpa kabel Mikrotik→ONU (ONU tetap harus FO-linked)
  for (const n of nodes) {
    if (!isOnuType(n.data)) continue
    if (n.data.status === 'disconnected') continue
    const mt = findUpstreamMikrotik(nodes, edges, n.id)
    if (!mt?.dhcpServer?.enabled) continue
    const mtSpeed = mt.lanSpeedMbps || 1000
    for (const hop of lanNeighbors(edges, n.id)) {
      const client = nodeMap.get(hop.peerId)
      if (client?.data.type !== 'komputer') continue
      if (patches.has(client.id)) continue
      assignClient(
        client.id,
        mt.dhcpServer,
        computeClientSpeedMbps({
          mikrotikSpeedMbps: mtSpeed,
          onuSpeedMbps: n.data.speedMbps || 100,
          onuStatus: n.data.status,
        }),
        'komputer',
      )
    }
  }

  // Smartphone: wajib cocok SSID & password ke ONU FO-linked
  for (const n of nodes) {
    if (n.data.type !== 'smartphone') continue
    const phone = n.data
    const phoneSsid = (phone.ssid ?? '').trim()
    const phonePass = (phone.wifiPassword ?? '').trim()

    let matched: Node<FoNodeData> | null = null
    for (const onu of nodes) {
      if (!isOnuType(onu.data)) continue
      if (onu.data.status === 'disconnected') continue
      if (!credsMatch(phoneSsid, onu.data.ssid)) continue
      if (!credsMatch(phonePass, onu.data.wifiPassword)) continue
      matched = onu
      break
    }

    if (matched && isOnuType(matched.data)) {
      const mt = findUpstreamMikrotik(nodes, edges, matched.id)
      const dhcp = mt?.dhcpServer?.enabled ? mt.dhcpServer : null
      const speed = computeClientSpeedMbps({
        mikrotikSpeedMbps: mt?.lanSpeedMbps || 1000,
        onuSpeedMbps: matched.data.speedMbps || 100,
        onuStatus: matched.data.status,
      })
      const wifiExtra = {
        wifiConnected: true,
        connectedSsid: matched.data.ssid,
        connectedPassword: matched.data.wifiPassword,
        wirelessOnuId: matched.id,
      }

      if (dhcp) {
        assignClient(n.id, dhcp, speed, 'smartphone', wifiExtra)
      } else {
        patches.set(n.id, {
          ...phone,
          ...wifiExtra,
          online: false,
          speedMbps: null,
          ipAddress: '',
          gateway: null,
          subnetMask: null,
        } as SmartphoneData)
      }

      wirelessEdges.push({
        id: `wireless-${matched.id}-${n.id}`,
        source: matched.id,
        target: n.id,
        sourceHandle: 'wlan',
        targetHandle: 'wlan-in',
        type: 'foWireless',
        data: {
          lengthValue: 0,
          lengthUnit: 'm',
          lossPerKm: 0,
          linkKind: 'wireless',
        },
        animated: false,
        zIndex: -1,
        className: 'fo-wireless-edge',
        style: { stroke: 'transparent', strokeWidth: 0 },
      })
    } else {
      patches.set(n.id, {
        ...phone,
        wifiConnected: false,
        online: false,
        speedMbps: null,
        connectedSsid: null,
        connectedPassword: null,
        wirelessOnuId: null,
        gateway: null,
        subnetMask: null,
        ipAddress: '',
      } as SmartphoneData)
    }
  }

  // Disconnect komputer yang tidak dapat patch
  for (const n of nodes) {
    if (n.data.type === 'komputer' && !patches.has(n.id)) {
      patches.set(n.id, {
        ...n.data,
        connected: false,
        speedMbps: null,
        gateway: null,
        subnetMask: null,
        ipAddress: '',
      } as KomputerData)
    }
  }

  const updatedNodes = nodes.map((n) => {
    const patch = patches.get(n.id)
    if (!patch) return n
    return { ...n, data: { ...n.data, ...patch } as FoNodeData }
  })

  return { updatedNodes, wirelessEdges }
}
