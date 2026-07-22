import type { ComponentType } from '../data/components'
import type { SignalStatus } from '../settings/types'

type FoBase = {
  label: string
  comment: string
  brand: string
  /** Harga satuan (Rp) untuk laporan material */
  unitPrice: number
  [key: string]: unknown
}

/** Konfigurasi DHCP server (Internet / Mikrotik) */
export type DhcpServerConfig = {
  enabled: boolean
  /**
   * Gateway + prefix CIDR, contoh: 192.168.88.1/24
   * (network/gateway/subnetMask lama tetap dibaca saat migrasi)
   */
  cidr: string
  poolStart: string
  poolEnd: string
  /** @deprecated pakai cidr */
  network?: string
  /** @deprecated pakai cidr */
  gateway?: string
  /** @deprecated pakai cidr */
  subnetMask?: string
}

export type OltData = FoBase & {
  type: 'olt'
  txPower: number
  ports: number
}

export type SplitterRatioData = FoBase & {
  type: 'splitterRatio'
  ratio: string
  percentSmall: number
  percentLarge: number
  lossSmall: number
  lossLarge: number
  powerLarge?: number | null
  powerSmall?: number | null
}

export type SplitterBoxData = FoBase & {
  type: 'splitterBox'
  ratio: string
  ports: number
  loss: number
  powerOut?: number | null
}

export type PatchcordData = FoBase & {
  type: 'patchcord'
  loss: number
}

export type ConnectorData = FoBase & {
  type: 'connector'
  loss: number
}

export type BarrelData = FoBase & {
  type: 'barrel'
  loss: number
}

/** ONU FO + LAN/WiFi (100 Mbps single / dual-band 1 Gbps) */
export type OnuData = FoBase & {
  type: 'onu' | 'onuDual'
  receivedPower: number | null
  totalLoss: number | null
  status: SignalStatus
  ssid: string
  wifiPassword: string
  /** 100 = single band, 1000 = dual band */
  speedMbps: number
}

export type OpmLinkStatus = 'connected' | 'disconnected'

export type OpmData = FoBase & {
  type: 'opm'
  measuredPower: number | null
  totalLoss: number | null
  status: OpmLinkStatus
}

/** Cloud Internet — 1 output WAN */
export type InternetData = FoBase & {
  type: 'internet'
  dhcpServer: DhcpServerConfig
}

/** Mikrotik router — 1 WAN in + 4 LAN out */
export type MikrotikData = FoBase & {
  type: 'mikrotik'
  dhcpClient: boolean
  dhcpServer: DhcpServerConfig
  /** Kapasitas throughput LAN (Mbps) — bottleneck dasar ke klien */
  lanSpeedMbps: number
  /** Runtime: IP WAN dari Internet DHCP */
  wanIp?: string | null
  wanGateway?: string | null
  wanSubnetMask?: string | null
  wanConnected?: boolean
}

/** Smartphone — wireless ke ONU (SSID/password) */
export type SmartphoneData = FoBase & {
  type: 'smartphone'
  /** Kredensial yang dicoba ke ONU */
  ssid: string
  wifiPassword: string
  ipAddress: string
  gateway?: string | null
  subnetMask?: string | null
  /** WiFi associated (SSID+password cocok) */
  wifiConnected?: boolean
  /** Online = dapat IP dari DHCP Mikrotik */
  online?: boolean
  speedMbps?: number | null
  connectedSsid?: string | null
  connectedPassword?: string | null
  wirelessOnuId?: string | null
}

/** Komputer — 1 port LAN in */
export type KomputerData = FoBase & {
  type: 'komputer'
  ipAddress: string
  gateway?: string | null
  subnetMask?: string | null
  connected?: boolean
  speedMbps?: number | null
}

export type FoNodeData =
  | OltData
  | SplitterRatioData
  | SplitterBoxData
  | PatchcordData
  | ConnectorData
  | BarrelData
  | OpmData
  | OnuData
  | InternetData
  | MikrotikData
  | SmartphoneData
  | KomputerData

export type FoEdgeData = {
  lengthValue: number
  lengthUnit: 'm' | 'km'
  lossPerKm: number
  color?: string | null
  hasPatchcord?: boolean
  patchcordBrand?: string
  patchcordUnitPrice?: number
  patchcordLoss?: number | null
  hasSleeve?: boolean
  sleeveBrand?: string
  sleeveUnitPrice?: number
  sleeveLoss?: number | null
  /** fo = optik, lan = ethernet, wireless = WiFi animasi */
  linkKind?: 'fo' | 'lan' | 'wireless'
  [key: string]: unknown
}

export type LossStep = {
  nodeId?: string
  edgeId?: string
  label: string
  type: ComponentType | 'connection'
  loss: number
  cumulative: number
  detail: string
}

export type PathResult = {
  onuId: string
  onuLabel: string
  txPower: number
  totalLoss: number
  receivedPower: number
  status: OnuData['status']
  steps: LossStep[]
  pathNodeIds: string[]
}

export const DEFAULT_DHCP_SERVER: DhcpServerConfig = {
  enabled: true,
  cidr: '192.168.88.1/24',
  poolStart: '192.168.88.10',
  poolEnd: '192.168.88.250',
}

export const DEFAULT_INTERNET_DHCP: DhcpServerConfig = {
  enabled: true,
  cidr: '10.0.0.1/24',
  poolStart: '10.0.0.2',
  poolEnd: '10.0.0.254',
}
