import type { ReactNode } from 'react'
import {
  Box,
  Cable,
  CircleDot,
  Cloud,
  Cpu,
  Gauge,
  GitFork,
  Link2,
  Monitor,
  Radio,
  Router,
  Smartphone,
  Wifi,
} from 'lucide-react'
import type { ComponentType } from '../data/components'

const HEADER_ICONS: Record<ComponentType, ReactNode> = {
  olt: <Radio size={13} strokeWidth={2.4} />,
  splitterRatio: <GitFork size={13} strokeWidth={2.4} />,
  splitterBox: <Box size={13} strokeWidth={2.4} />,
  patchcord: <Cable size={13} strokeWidth={2.4} />,
  connector: <Link2 size={13} strokeWidth={2.4} />,
  barrel: <CircleDot size={13} strokeWidth={2.4} />,
  opm: <Gauge size={13} strokeWidth={2.4} />,
  onu: <Router size={13} strokeWidth={2.4} />,
  onuDual: <Wifi size={13} strokeWidth={2.4} />,
  internet: <Cloud size={13} strokeWidth={2.4} />,
  mikrotik: <Cpu size={13} strokeWidth={2.4} />,
  smartphone: <Smartphone size={13} strokeWidth={2.4} />,
  komputer: <Monitor size={13} strokeWidth={2.4} />,
}

type Props = {
  typeName: string
  componentType: ComponentType
}

/** Header tipe komponen — area drag + ikon */
export function NodeHeader({ typeName, componentType }: Props) {
  return (
    <div className="fo-node-header">
      <span className="fo-node-header-icon" aria-hidden="true">
        {HEADER_ICONS[componentType]}
      </span>
      <span className="fo-node-header-title">{typeName}</span>
    </div>
  )
}
