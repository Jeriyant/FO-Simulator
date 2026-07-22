export type ComponentType =
  | 'olt'
  | 'splitterRatio'
  | 'splitterBox'
  | 'patchcord'
  | 'connector'
  | 'barrel'
  | 'opm'
  | 'onu'
  | 'onuDual'
  | 'internet'
  | 'mikrotik'
  | 'smartphone'
  | 'komputer'

export interface SplitterRatioSpec {
  ratio: string
  percentSmall: number
  percentLarge: number
  lossSmall: number
  lossLarge: number
  brand: string
  /** Harga satuan default untuk rasio ini (Rp) */
  unitPrice: number
}

export interface SplitterBoxSpec {
  ratio: string
  ports: number
  loss: number
  brand: string
  /** Harga satuan default untuk PLC ini (Rp) */
  unitPrice: number
}

export const SPLITTER_RATIOS: SplitterRatioSpec[] = [
  { ratio: '1:99', percentSmall: 1, percentLarge: 99, lossSmall: 20.9, lossLarge: 0.69, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '2:98', percentSmall: 2, percentLarge: 98, lossSmall: 17.9, lossLarge: 0.73, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '3:97', percentSmall: 3, percentLarge: 97, lossSmall: 16.5, lossLarge: 0.65, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '4:96', percentSmall: 4, percentLarge: 96, lossSmall: 16.0, lossLarge: 0.7, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '5:95', percentSmall: 5, percentLarge: 95, lossSmall: 14.58, lossLarge: 0.87, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '6:94', percentSmall: 6, percentLarge: 94, lossSmall: 12.42, lossLarge: 0.47, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '7:93', percentSmall: 7, percentLarge: 93, lossSmall: 13.48, lossLarge: 0.62, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '8:92', percentSmall: 8, percentLarge: 92, lossSmall: 12.35, lossLarge: 0.94, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '9:91', percentSmall: 9, percentLarge: 91, lossSmall: 11.7, lossLarge: 1.01, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '10:90', percentSmall: 10, percentLarge: 90, lossSmall: 11.06, lossLarge: 1.11, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '12:88', percentSmall: 12, percentLarge: 88, lossSmall: 10.8, lossLarge: 0.9, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '15:85', percentSmall: 15, percentLarge: 85, lossSmall: 9.3, lossLarge: 1.2, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '18:82', percentSmall: 18, percentLarge: 82, lossSmall: 7.65, lossLarge: 1.06, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '20:80', percentSmall: 20, percentLarge: 80, lossSmall: 7.9, lossLarge: 1.5, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '22:78', percentSmall: 22, percentLarge: 78, lossSmall: 6.78, lossLarge: 1.28, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '25:75', percentSmall: 25, percentLarge: 75, lossSmall: 7.0, lossLarge: 1.65, brand: 'Xumikura', unitPrice: 60_000 },
  { ratio: '28:72', percentSmall: 28, percentLarge: 72, lossSmall: 5.73, lossLarge: 1.63, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '30:70', percentSmall: 30, percentLarge: 70, lossSmall: 6.0, lossLarge: 2.1, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '35:65', percentSmall: 35, percentLarge: 65, lossSmall: 5.3, lossLarge: 2.6, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '40:60', percentSmall: 40, percentLarge: 60, lossSmall: 4.18, lossLarge: 2.42, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '45:55', percentSmall: 45, percentLarge: 55, lossSmall: 4.3, lossLarge: 3.2, brand: 'Fujitomo', unitPrice: 60_000 },
  { ratio: '50:50', percentSmall: 50, percentLarge: 50, lossSmall: 3.7, lossLarge: 3.7, brand: 'Xumikura', unitPrice: 60_000 },
]

export const SPLITTER_BOXES: SplitterBoxSpec[] = [
  { ratio: '1:2', ports: 2, loss: 3.25, brand: 'Fujitomo', unitPrice: 50_000 },
  { ratio: '1:4', ports: 4, loss: 7, brand: 'Fujitomo', unitPrice: 50_000 },
  { ratio: '1:8', ports: 8, loss: 10, brand: 'Fujitomo', unitPrice: 50_000 },
  { ratio: '1:16', ports: 16, loss: 13.5, brand: 'Fujitomo', unitPrice: 50_000 },
  { ratio: '1:32', ports: 32, loss: 17, brand: 'Fujitomo', unitPrice: 50_000 },
  { ratio: '1:64', ports: 64, loss: 20, brand: 'Fujitomo', unitPrice: 50_000 },
]

export const PATCHCORD_LOSS = 0.2
export const CONNECTOR_LOSS = 0.2
export const BARREL_LOSS = 0.3
export const CABLE_LOSS_PER_KM = 0.2

/** Typical XPON/ONU receive window (dBm) — legacy reference */
export const ONU_RX_MIN = -28
export const ONU_RX_MAX = -8

export const COMPONENT_META: Record<
  ComponentType,
  { label: string; color: string; description: string }
> = {
  olt: {
    label: 'OLT',
    color: '#1e40af',
    description: 'Sumber daya optik (TX)',
  },
  splitterRatio: {
    label: 'Splitter Ratio',
    color: '#dc2626',
    description: 'Pembagi tidak seimbang (besar/kecil)',
  },
  splitterBox: {
    label: 'Splitter Box',
    color: '#eab308',
    description: 'Pembagi PLC seimbang (1:N)',
  },
  patchcord: {
    label: 'Patchcord',
    color: '#0369a1',
    description: `Kabel jumper · ${PATCHCORD_LOSS} dB · 4 port`,
  },
  connector: {
    label: 'Sleeve',
    color: '#4b5563',
    description: `Sambungan sleeve · ${CONNECTOR_LOSS} dB · 4 port`,
  },
  barrel: {
    label: 'Barel SC/UPC',
    color: '#2563eb',
    description: `Adapter SC/UPC · ${BARREL_LOSS} dB · 4 port`,
  },
  opm: {
    label: 'OPM',
    color: '#db2777',
    description: 'Ukur daya optik di jalur mana pun',
  },
  onu: {
    label: 'ONU Single Band',
    color: '#047857',
    description: 'ONU single band · 100 Mbps · WiFi + 4 LAN',
  },
  onuDual: {
    label: 'ONU Dual Band',
    color: '#4f46e5',
    description: 'ONU dual band · 1 Gbps · WiFi + 4 LAN',
  },
  internet: {
    label: 'Internet',
    color: '#0284c7',
    description: 'Cloud Internet · DHCP Server · 1 out',
  },
  mikrotik: {
    label: 'Mikrotik',
    color: '#b45309',
    description: 'Router Mikrotik · 1 WAN in · 4 LAN out',
  },
  smartphone: {
    label: 'Smartphone',
    color: '#7c3aed',
    description: 'Klien WiFi · cocokkan SSID & password ONU',
  },
  komputer: {
    label: 'Komputer',
    color: '#334155',
    description: 'PC klien · 1 port LAN in',
  },
}
