import { type NodeProps, type Node } from '@xyflow/react'
import { Cable } from 'lucide-react'
import { useI18n } from '../i18n/context'
import type { PatchcordData } from '../types/fo'
import { QuadSideHandles } from './QuadSideHandles'
import { useAutoVisibleHandles } from './useAutoVisibleHandles'
import './nodes.css'

type PCNode = Node<PatchcordData, 'patchcord'>

export function PatchcordNode({ id, data, selected }: NodeProps<PCNode>) {
  const { t, tf } = useI18n()
  const title = tf('iconTooltip', {
    label: data.label,
    type: t('comp_patchcord'),
    loss: data.loss,
  })
  const { autoHandleClass, hoverProps } = useAutoVisibleHandles(id)

  return (
    <div
      className={`fo-icon-node fo-pc ${selected ? 'selected' : ''}`}
      title={title}
      {...hoverProps}
    >
      <div className="fo-icon-node-ports">
        <QuadSideHandles autoHandleClass={autoHandleClass} />
        <div className="fo-icon-node-badge">
          <Cable size={22} strokeWidth={2.2} />
        </div>
      </div>
      <span className="fo-icon-node-label">{data.label}</span>
      {data.brand?.trim() ? (
        <span className="fo-icon-node-brand">{data.brand.trim()}</span>
      ) : null}
    </div>
  )
}
