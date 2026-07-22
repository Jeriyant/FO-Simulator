import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import type { SplitterRatioData } from '../types/fo'
import { useI18n } from '../i18n/context'
import { NodeHeader } from './NodeHeader'
import { NodeBrand } from './NodeBrand'
import { NodeComment } from './NodeComment'
import './nodes.css'

type SRNode = Node<SplitterRatioData, 'splitterRatio'>

function formatPower(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return `${value.toFixed(2)} dBm`
}

export function SplitterRatioNode({ data, selected }: NodeProps<SRNode>) {
  const { t } = useI18n()
  const largeLabel = t('large')
  const smallLabel = t('small')

  return (
    <div className={`fo-node fo-sr ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" className="fo-handle" />
      <NodeHeader typeName={t('comp_splitterRatio')} componentType="splitterRatio" />
      <div className="fo-node-body">
        <div className="fo-node-title-row">
          <div className="fo-node-label">{data.label}</div>
          <div className="fo-ratio">{data.ratio}</div>
        </div>
        <NodeBrand brand={data.brand} />
        <div className="fo-field">
          <span>% {largeLabel} →</span>
          <strong>{formatPower(data.powerLarge)}</strong>
        </div>
        <div className="fo-field">
          <span>% {smallLabel} →</span>
          <strong>{formatPower(data.powerSmall)}</strong>
        </div>
        <NodeComment comment={data.comment ?? ''} />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="out-small"
        className="fo-handle fo-handle-small"
        title={`${smallLabel} ${data.percentSmall}% · ${formatPower(data.powerSmall)}`}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-large"
        className="fo-handle fo-handle-large"
        title={`${largeLabel} ${data.percentLarge}% · ${formatPower(data.powerLarge)}`}
      />
    </div>
  )
}
