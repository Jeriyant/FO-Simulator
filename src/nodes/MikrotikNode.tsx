import { Handle, Position, useEdges, type NodeProps, type Node } from '@xyflow/react'
import { useMemo } from 'react'
import { useI18n } from '../i18n/context'
import type { MikrotikData } from '../types/fo'
import { resolveDhcpCidr } from '../utils/cidr'
import { NodeComment } from './NodeComment'
import './nodes.css'

type MikrotikNodeType = Node<MikrotikData, 'mikrotik'>

const PORTS = [
  { key: 'W', handleId: 'wan-in', title: 'WAN' },
  { key: '1', handleId: 'lan-out-1', title: 'LAN 1' },
  { key: '2', handleId: 'lan-out-2', title: 'LAN 2' },
  { key: '3', handleId: 'lan-out-3', title: 'LAN 3' },
  { key: '4', handleId: 'lan-out-4', title: 'LAN 4' },
] as const

export function MikrotikNode({ id, data, selected }: NodeProps<MikrotikNodeType>) {
  const { t } = useI18n()
  const edges = useEdges()
  const wanOk = Boolean(data.wanConnected)
  const lanCidr = data.dhcpServer?.enabled
    ? resolveDhcpCidr(data.dhcpServer)?.cidr
    : null

  const litPorts = useMemo(() => {
    const lit = new Set<string>()
    for (const e of edges ?? []) {
      if (e.data && (e.data as { linkKind?: string }).linkKind === 'wireless') continue
      if (e.source === id && e.sourceHandle) lit.add(e.sourceHandle)
      if (e.target === id && e.targetHandle) lit.add(e.targetHandle)
    }
    return lit
  }, [edges, id])

  return (
    <div className={`fo-mikrotik ${selected ? 'selected' : ''} ${wanOk ? 'is-online' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        id="wan-in"
        className="fo-handle fo-lan-handle"
        style={{ top: '50%' }}
        title="WAN In"
      />
      {[1, 2, 3, 4].map((i) => (
        <Handle
          key={i}
          type="source"
          position={Position.Bottom}
          id={`lan-out-${i}`}
          className="fo-handle fo-lan-handle"
          style={{ left: `${18 + (i - 1) * 21}%` }}
          title={`LAN ${i}`}
        />
      ))}

      <div className="fo-mikrotik-box">
        <div className="fo-mikrotik-top">
          <span className="fo-mikrotik-logo">MikroTik</span>
          <i className={`fo-mikrotik-led ${wanOk ? 'on blink' : ''}`} />
        </div>
        <div className="fo-mikrotik-vents" aria-hidden="true" />
        <strong>{data.label}</strong>
        <span className="fo-mikrotik-brand">{data.brand || t('comp_mikrotik')}</span>
        <div className="fo-mikrotik-meta">
          <span>DHCP Server {data.dhcpServer?.enabled ? 'ON' : 'OFF'}</span>
          <span>Speed {data.lanSpeedMbps || 1000} Mbps</span>
        </div>
        {wanOk ? (
          <div className="fo-mikrotik-wan">
            WAN {data.wanIp}
            <em>GW {data.wanGateway}</em>
          </div>
        ) : (
          <div className="fo-mikrotik-wan off">WAN disconnected</div>
        )}
        {lanCidr ? <div className="fo-mikrotik-lan-dhcp">LAN {lanCidr}</div> : null}
        <div className="fo-mikrotik-ports">
          {PORTS.map((p) => {
            const on = litPorts.has(p.handleId)
            return (
              <span
                key={p.key}
                className={`fo-mikrotik-port-led ${on ? 'on' : ''} ${p.key === 'W' ? 'wan' : 'lan'}`}
                title={on ? `${p.title} connected` : `${p.title} disconnected`}
              >
                {p.key}
              </span>
            )
          })}
        </div>
        <NodeComment comment={data.comment ?? ''} />
      </div>
    </div>
  )
}
