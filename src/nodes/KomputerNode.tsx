import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useI18n } from '../i18n/context'
import type { KomputerData } from '../types/fo'
import { NodeComment } from './NodeComment'
import './nodes.css'

type KomputerNodeType = Node<KomputerData, 'komputer'>

export function KomputerNode({ data, selected }: NodeProps<KomputerNodeType>) {
  const { t } = useI18n()
  const connected = Boolean(data.connected)
  const led = data.inetLed ?? 'gray'
  const ledClass =
    led === 'green' ? 'on blink' : led === 'red' ? 'err blink' : 'gray'
  const ledTitle =
    led === 'green'
      ? 'Online · Internet OK'
      : led === 'red'
        ? 'Terpasang · belum IP / Internet MT / FO ONU'
        : 'Tali belum ke ONU/Mikrotik'

  return (
    <div className={`fo-pc ${selected ? 'selected' : ''} ${led === 'green' ? 'is-online' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        id="lan-in"
        className="fo-handle fo-lan-handle"
        title="LAN In"
      />

      <div className="fo-pc-tower">
        <div className={`fo-pc-online ${ledClass}`} title={ledTitle} />
        <div className="fo-pc-monitor">
          <div className="fo-pc-screen">
            <strong>{data.label}</strong>
            <span>{data.brand || t('comp_komputer')}</span>
            <div className="fo-pc-row">
              <em>IP</em>
              <span>{connected ? data.ipAddress || '—' : '—'}</span>
            </div>
            <div className="fo-pc-row">
              <em>GW</em>
              <span>{connected ? data.gateway || '—' : '—'}</span>
            </div>
            <div className="fo-pc-row">
              <em>Mask</em>
              <span>{connected ? data.subnetMask || '—' : '—'}</span>
            </div>
            <div className={`fo-pc-status ${connected ? 'on' : 'off'}`}>
              {connected && data.speedMbps ? `${data.speedMbps} Mbps` : '—'}
            </div>
            <NodeComment comment={data.comment ?? ''} />
          </div>
        </div>
        <div className="fo-pc-stand" aria-hidden="true" />
        <div className="fo-pc-base" aria-hidden="true" />
      </div>
    </div>
  )
}
