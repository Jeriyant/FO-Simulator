import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { Fragment } from 'react'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/translations'
import type { OpmData } from '../types/fo'
import { NodeComment } from './NodeComment'
import { useAutoVisibleHandles } from './useAutoVisibleHandles'
import './nodes.css'

type OPMNodeType = Node<OpmData, 'opm'>

const OPM_SIDES = [
  { position: Position.Top, inId: 'in-top', probeId: 'probe-top', sideKey: 'sideTop' as const },
  { position: Position.Left, inId: 'in', probeId: 'probe', sideKey: 'sideLeft' as const },
  {
    position: Position.Right,
    inId: 'in-right',
    probeId: 'probe-right',
    sideKey: 'sideRight' as const,
  },
  {
    position: Position.Bottom,
    inId: 'in-bottom',
    probeId: 'probe-bottom',
    sideKey: 'sideBottom' as const,
  },
]

function MultimeterDial() {
  return (
    <svg className="fo-opm-dial-svg" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="46" className="fo-opm-dial-ring" />
      <circle cx="50" cy="50" r="34" className="fo-opm-dial-face" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i * 30 - 90) * Math.PI) / 180
        const x1 = 50 + Math.cos(a) * 28
        const y1 = 50 + Math.sin(a) * 28
        const x2 = 50 + Math.cos(a) * 38
        const y2 = 50 + Math.sin(a) * 38
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className={i % 3 === 0 ? 'fo-opm-dial-tick major' : 'fo-opm-dial-tick'}
          />
        )
      })}
      <polygon points="50,18 54,50 46,50" className="fo-opm-dial-needle" />
      <circle cx="50" cy="50" r="8" className="fo-opm-dial-hub" />
      <circle cx="50" cy="50" r="3.5" className="fo-opm-dial-hub-core" />
    </svg>
  )
}

export function OPMNode({ id, data, selected }: NodeProps<OPMNodeType>) {
  const { t, tf } = useI18n()
  const { usedHandles, autoHandleClass, hoverProps } = useAutoVisibleHandles(id)
  const isLinked = usedHandles.size > 0
  const connected = isLinked && data.status === 'connected'

  const measured = connected && data.measuredPower != null ? data.measuredPower : 0
  const totalLoss = connected && data.totalLoss != null ? data.totalLoss : 0
  const linkStatus = connected ? 'connected' : 'disconnected'
  const brand = data.brand?.trim()

  return (
    <div
      className={`fo-opm fo-opm-meter status-${linkStatus} ${selected ? 'selected' : ''}`}
      {...hoverProps}
    >
      {OPM_SIDES.map(({ position, inId, probeId, sideKey }) => {
        const inLinked = usedHandles.has(inId)
        const probeLinked = usedHandles.has(probeId)
        const inClass = `fo-handle fo-handle-opm${inLinked ? ' is-linked' : ''}`
        const probeClass = `fo-handle fo-handle-opm fo-handle-opm-probe${probeLinked ? ' is-linked' : ''}`
        const side = t(sideKey as TranslationKey)

        return (
          <Fragment key={inId}>
            <Handle
              type="target"
              position={position}
              id={inId}
              className={`${autoHandleClass(inId, inClass)} fo-handle-opm-stack`}
              isConnectable
              title={tf('opmMeasureFrom', { side })}
            />
            <Handle
              type="source"
              position={position}
              id={probeId}
              className={`${autoHandleClass(probeId, probeClass)} fo-handle-opm-stack`}
              isConnectable
              title={tf('opmProbeTo', { side })}
            />
          </Fragment>
        )
      })}

      <div className="fo-opm-chassis">
        <div className="fo-opm-grip fo-opm-grip-top" aria-hidden="true" />

        <div className="fo-opm-plate">
          <span className="fo-opm-model">{t('comp_opm')}</span>
          <span className="fo-opm-serial">{data.label}</span>
        </div>

        <div className={`fo-opm-lcd ${connected ? 'is-on' : 'is-off'}`}>
          <div className="fo-opm-lcd-glare" aria-hidden="true" />
          <div className="fo-opm-lcd-row">
            <span className="fo-opm-lcd-label">dBm</span>
            <strong className="fo-opm-lcd-value">
              {Number(measured).toFixed(2)}
            </strong>
          </div>
          <div className="fo-opm-lcd-row sub">
            <span className="fo-opm-lcd-label">LOSS</span>
            <strong className="fo-opm-lcd-value">
              {Number(totalLoss).toFixed(2)}
              <em>dB</em>
            </strong>
          </div>
        </div>

        <div className="fo-opm-dial-wrap">
          <MultimeterDial />
          <div className="fo-opm-keys" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className={`fo-opm-link status-${linkStatus}`}>
          <i className="fo-opm-led" aria-hidden="true" />
          <span>{connected ? t('status_connected') : t('status_disconnect')}</span>
        </div>

        <div className="fo-opm-jacks" aria-hidden="true">
          <span className="fo-opm-jack in" title="IN" />
          <span className="fo-opm-jack out" title="OUT" />
        </div>

        {brand ? <div className="fo-opm-brand">{brand}</div> : null}
        <NodeComment comment={data.comment ?? ''} />

        <div className="fo-opm-grip fo-opm-grip-bottom" aria-hidden="true" />
      </div>
    </div>
  )
}
