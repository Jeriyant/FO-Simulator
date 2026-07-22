import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useI18n } from '../i18n/context'
import type { SplitterBoxData } from '../types/fo'
import { NodeHeader } from './NodeHeader'
import { NodeBrand } from './NodeBrand'
import { NodeComment } from './NodeComment'
import './nodes.css'

type SBNode = Node<SplitterBoxData, 'splitterBox'>

function formatPower(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)} dBm`
}

export function SplitterBoxNode({ data, selected }: NodeProps<SBNode>) {
  const { t, tf } = useI18n()
  const ports = Math.min(Math.max(data.ports || 2, 1), 16)

  return (
    <div className={`fo-node fo-sb ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} id="in" className="fo-handle" />
      <NodeHeader typeName={t('comp_splitterBox')} componentType="splitterBox" />
      <div className="fo-node-body">
        <div className="fo-node-title-row">
          <div className="fo-node-label">{data.label}</div>
          <div className="fo-ratio">PLC {data.ratio}</div>
        </div>
        <NodeBrand brand={data.brand} />
        <div className="fo-field">
          <span>{t('propOutArrow')}</span>
          <strong>{formatPower(data.powerOut)}</strong>
        </div>
        <div className="fo-field">
          <span>{t('propPort')}</span>
          <strong>{data.ports}</strong>
        </div>
        <NodeComment comment={data.comment ?? ''} />
      </div>
      {Array.from({ length: ports }, (_, i) => (
        <Handle
          key={`out-${i}`}
          type="source"
          position={Position.Bottom}
          id={`out-${i + 1}`}
          className="fo-handle"
          style={{ left: `${((i + 1) / (ports + 1)) * 100}%` }}
          title={tf('outNPower', { n: i + 1, power: formatPower(data.powerOut) })}
        />
      ))}
    </div>
  )
}
