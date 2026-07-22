import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useI18n } from '../i18n/context'
import type { OltData } from '../types/fo'
import { NodeHeader } from './NodeHeader'
import { NodeBrand } from './NodeBrand'
import { NodeComment } from './NodeComment'
import { useAutoVisibleHandles } from './useAutoVisibleHandles'
import './nodes.css'

type OltNodeType = Node<OltData, 'olt'>

export function OLTNode({ id, data, selected }: NodeProps<OltNodeType>) {
  const { t, tf } = useI18n()
  const ports = Math.min(Math.max(data.ports || 1, 1), 16)
  const { autoHandleClass, hoverProps } = useAutoVisibleHandles(id)

  return (
    <div className={`fo-node fo-olt ${selected ? 'selected' : ''}`} {...hoverProps}>
      {/* Uplink GE / input — atas */}
      <Handle
        type="target"
        position={Position.Top}
        id="lan-in"
        className="fo-handle fo-lan-handle"
        style={{ left: '35%' }}
        title="GE / Uplink (LAN)"
      />
      <Handle
        type="source"
        position={Position.Top}
        id="out-top"
        className={autoHandleClass('out-top', 'fo-handle')}
        style={{ left: '65%' }}
        title={t('outputTop')}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="out-left"
        className={autoHandleClass('out-left', 'fo-handle')}
        title={t('outputLeft')}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-bottom"
        className={autoHandleClass('out-bottom', 'fo-handle')}
        title={t('outputBottom')}
      />
      <NodeHeader typeName={t('comp_olt')} componentType="olt" />
      <div className="fo-node-body">
        <div className="fo-node-label">{data.label}</div>
        <NodeBrand brand={data.brand} />
        <div className="fo-field">
          <span>{t('propTxPower')}</span>
          <strong>{data.txPower} dBm</strong>
        </div>
        <div className="fo-field">
          <span>{t('propPort')}</span>
          <strong>{data.ports}</strong>
        </div>
        <NodeComment comment={data.comment ?? ''} />
      </div>
      {Array.from({ length: ports }, (_, i) => {
        const handleId = `port-${i + 1}`
        return (
          <Handle
            key={handleId}
            type="source"
            position={Position.Right}
            id={handleId}
            className={autoHandleClass(handleId, 'fo-handle')}
            style={{ top: `${((i + 1) / (ports + 1)) * 100}%` }}
            title={tf('portN', { n: i + 1 })}
          />
        )
      })}
    </div>
  )
}
