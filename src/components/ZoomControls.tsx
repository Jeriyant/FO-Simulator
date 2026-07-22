import {
  ControlButton,
  Panel,
  useReactFlow,
  useStore,
  useStoreApi,
  useViewport,
} from '@xyflow/react'
import { Lock, LockOpen, Maximize2, Minus, Plus } from 'lucide-react'
import { shallow } from 'zustand/shallow'
import { useI18n } from '../i18n/context'
import './ZoomControls.css'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const ZOOM_STEP = 0.01

const interactiveSelector = (s: {
  nodesDraggable: boolean
  nodesConnectable: boolean
  elementsSelectable: boolean
  transform: [number, number, number]
  minZoom: number
  maxZoom: number
}) => ({
  isInteractive: s.nodesDraggable || s.nodesConnectable || s.elementsSelectable,
  minZoomReached: s.transform[2] <= s.minZoom,
  maxZoomReached: s.transform[2] >= s.maxZoom,
})

export function ZoomControls() {
  const { t } = useI18n()
  const { zoom } = useViewport()
  const { zoomTo, getZoom, fitView } = useReactFlow()
  const store = useStoreApi()
  const { isInteractive, minZoomReached, maxZoomReached } = useStore(
    interactiveSelector,
    shallow,
  )

  const percent = Math.round(zoom * 100)
  const fill =
    ((Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)) *
    100

  const stepZoom = (delta: number) => {
    const current = getZoom()
    const next = Math.min(
      MAX_ZOOM,
      Math.max(MIN_ZOOM, Math.round((current + delta) * 100) / 100),
    )
    void zoomTo(next)
  }

  const toggleInteractive = () => {
    store.setState({
      nodesDraggable: !isInteractive,
      nodesConnectable: !isInteractive,
      elementsSelectable: !isInteractive,
    })
  }

  const lockLabel = isInteractive ? t('canvasLock') : t('canvasUnlock')

  return (
    <Panel position="bottom-left" className="zoom-controls-wrap">
      <div className="zoom-controls-stack">
        <div className="zoom-controls-btns">
          <ControlButton
            onClick={() => stepZoom(ZOOM_STEP)}
            className="zoom-btn"
            title={t('zoomIn')}
            aria-label={t('zoomIn')}
            disabled={maxZoomReached}
          >
            <Plus size={14} />
          </ControlButton>
          <ControlButton
            onClick={() => stepZoom(-ZOOM_STEP)}
            className="zoom-btn"
            title={t('zoomOut')}
            aria-label={t('zoomOut')}
            disabled={minZoomReached}
          >
            <Minus size={14} />
          </ControlButton>
          <ControlButton
            onClick={() => fitView()}
            className="zoom-btn"
            title={t('zoomFit')}
            aria-label={t('zoomFit')}
          >
            <Maximize2 size={14} />
          </ControlButton>
          <ControlButton
            onClick={toggleInteractive}
            className="zoom-btn"
            title={lockLabel}
            aria-label={lockLabel}
          >
            {isInteractive ? (
              <LockOpen size={14} strokeWidth={1.75} />
            ) : (
              <Lock size={14} strokeWidth={1.75} />
            )}
          </ControlButton>
        </div>

        <div className="zoom-indicator" aria-label={`Zoom ${percent}%`}>
          <span className="zoom-label">{percent}%</span>
          <div className="zoom-bar" aria-hidden="true">
            <div className="zoom-bar-fill" style={{ width: `${fill}%` }} />
            <div className="zoom-bar-thumb" style={{ left: `${fill}%` }} />
          </div>
        </div>
      </div>
    </Panel>
  )
}
