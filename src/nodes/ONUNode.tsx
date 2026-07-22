import { Handle, Position, useEdges, type NodeProps, type Node } from '@xyflow/react'
import { useMemo } from 'react'
import { useI18n } from '../i18n/context'
import { statusLabel } from '../i18n/translations'
import type { OnuData } from '../types/fo'
import { NodeComment } from './NodeComment'
import { useAutoVisibleHandles } from './useAutoVisibleHandles'
import './nodes.css'

type ONUNodeType = Node<OnuData, 'onu' | 'onuDual'>

const ONU_INPUTS = [
  { position: Position.Top, id: 'in-top', titleKey: 'inputTop' as const },
  { position: Position.Left, id: 'in', titleKey: 'inputLeft' as const },
  { position: Position.Right, id: 'in-right', titleKey: 'inputRight' as const },
]

export function ONUNode({ id, data, selected }: NodeProps<ONUNodeType>) {
  const { locale, t } = useI18n()
  const edges = useEdges()
  const { autoHandleClass, hoverProps } = useAutoVisibleHandles(id)
  const status = data.status
  const linked = status !== 'disconnected'
  const brand = data.brand?.trim()
  const dual = data.type === 'onuDual' || data.speedMbps >= 1000
  const rx =
    linked && data.receivedPower != null ? `${data.receivedPower.toFixed(2)}` : '—'
  const loss = linked && data.totalLoss != null ? `${data.totalLoss.toFixed(2)}` : '—'

  const wlanClientConnected = useMemo(
    () =>
      (edges ?? []).some(
        (e) =>
          (e.data as { linkKind?: string } | undefined)?.linkKind === 'wireless' &&
          ((e.source === id && e.sourceHandle === 'wlan') ||
            (e.target === id && e.targetHandle === 'wlan')),
      ),
    [edges, id],
  )

  const lanClientConnected = useMemo(
    () =>
      (edges ?? []).some((e) => {
        if ((e.data as { linkKind?: string } | undefined)?.linkKind === 'wireless') return false
        const isLanHandle = (h: string | null | undefined) =>
          Boolean(h && (h === 'lan-in' || h.startsWith('lan-out-')))
        if (e.source === id && isLanHandle(e.sourceHandle)) return true
        if (e.target === id && isLanHandle(e.targetHandle)) return true
        return false
      }),
    [edges, id],
  )

  const wlanOn = linked && wlanClientConnected
  const lanOn = lanClientConnected

  return (
    <div
      className={`fo-onu fo-onu-device status-${status} ${dual ? 'is-dual' : ''} ${selected ? 'selected' : ''}`}
      {...hoverProps}
    >
      {ONU_INPUTS.map(({ position, id: handleId, titleKey }) => (
        <Handle
          key={handleId}
          type="target"
          position={position}
          id={handleId}
          className={autoHandleClass(handleId, 'fo-handle fo-onu-handle')}
          title={t(titleKey)}
        />
      ))}

      {[1, 2, 3, 4].map((i) => (
        <Handle
          key={`lan-${i}`}
          type="source"
          position={Position.Bottom}
          id={`lan-out-${i}`}
          className="fo-handle fo-lan-handle"
          style={{ left: `${18 + (i - 1) * 21}%`, bottom: -2 }}
          title={`LAN ${i}`}
        />
      ))}
      <Handle
        type="source"
        position={Position.Right}
        id="wlan"
        className="fo-handle fo-wlan-handle"
        title="WiFi"
      />

      <div className="fo-onu-shell">
        <div className="fo-onu-stripe" aria-hidden="true" />

        <div className="fo-onu-head">
          <span className="fo-onu-chip">{dual ? 'DUAL' : 'Single'}</span>
          <div className="fo-onu-title">
            <strong>{data.label}</strong>
            {brand ? <span>{brand}</span> : null}
          </div>
          <span className="fo-onu-speed-badge">{data.speedMbps || (dual ? 1000 : 100)}M</span>
        </div>

        <div className="fo-onu-face">
          <div className="fo-onu-leds" aria-hidden="true">
            <div className={`fo-onu-led ${linked ? 'on' : ''}`}>
              <i />
              <em>PWR</em>
            </div>
            <div className={`fo-onu-led ${linked ? 'on pon' : ''}`}>
              <i />
              <em>PON</em>
            </div>
            <div
              className={`fo-onu-led ${
                !linked ? 'los' : status === 'bad' || status === 'low' ? 'warn' : ''
              }`}
            >
              <i />
              <em>LOS</em>
            </div>
            <div className={`fo-onu-led ${lanOn ? 'on lan blink' : ''}`}>
              <i />
              <em>LAN</em>
            </div>
            <div className={`fo-onu-led ${wlanOn ? 'on wlan blink' : ''}`}>
              <i />
              <em>WLAN</em>
            </div>
          </div>

          <div className="fo-onu-readout">
            <div className="fo-onu-metric">
              <span>RX</span>
              <strong>
                {rx}
                <em>dBm</em>
              </strong>
            </div>
            <div className="fo-onu-metric">
              <span>LOSS</span>
              <strong>
                {loss}
                <em>dB</em>
              </strong>
            </div>
          </div>

          <div className="fo-onu-wifi-info">
            <div>
              <em>SSID</em> <strong>{data.ssid || '—'}</strong>
            </div>
            <div>
              <em>Pass</em> <strong>{data.wifiPassword || '—'}</strong>
            </div>
          </div>

          <div className={`fo-onu-pill status-${status}`}>
            {statusLabel(locale, status)}
          </div>
        </div>

        <div className="fo-onu-art" aria-hidden="true">
          <svg className="fo-onu-svg" viewBox="0 0 200 118" fill="none">
            <ellipse cx="100" cy="108" rx="62" ry="5" fill="#0f766e" opacity="0.12" />
            <rect x="22" y="52" width="7" height="12" rx="2" fill="#475569" />
            <rect x="23.5" y="14" width="4" height="42" rx="2" fill="#334155" />
            <rect x="22" y="10" width="7" height="10" rx="3.5" fill="#1e293b" />
            <rect x="171" y="52" width="7" height="12" rx="2" fill="#475569" />
            <rect x="172.5" y="14" width="4" height="42" rx="2" fill="#334155" />
            <rect x="171" y="10" width="7" height="10" rx="3.5" fill="#1e293b" />
            <rect
              x="34"
              y="42"
              width="132"
              height="52"
              rx="8"
              fill="#f8fafc"
              stroke="#64748b"
              strokeWidth="1.6"
            />
            <rect x="34" y="42" width="132" height="12" rx="8" fill="#e2e8f0" />
            <rect x="46" y="62" width="72" height="14" rx="3" fill="#0f172a" />
            <circle cx="56" cy="69" r="2.6" className={linked ? 'onu-art-led on' : 'onu-art-led'} />
            <circle cx="68" cy="69" r="2.6" className={linked ? 'onu-art-led pon' : 'onu-art-led'} />
            <circle
              cx="80"
              cy="69"
              r="2.6"
              className={!linked ? 'onu-art-led los' : 'onu-art-led'}
            />
            <circle
              cx="92"
              cy="69"
              r="2.6"
              className={lanOn ? 'onu-art-led lan blink' : 'onu-art-led'}
            />
            <circle
              cx="104"
              cy="69"
              r="2.6"
              className={wlanOn ? 'onu-art-led wlan blink' : 'onu-art-led'}
            />
            <rect x="128" y="64" width="28" height="10" rx="2" fill="#047857" />
            <text
              x="142"
              y="71.2"
              textAnchor="middle"
              fill="#ecfdf5"
              fontSize="5.5"
              fontWeight="700"
              fontFamily="IBM Plex Sans, sans-serif"
            >
              {dual ? '1G' : '100M'}
            </text>
            <rect x="48" y="89" width="8" height="6" rx="1" fill="#0f766e" />
            <rect x="58" y="89" width="8" height="6" rx="1" fill="#0f766e" />
            <rect x="68" y="89" width="8" height="6" rx="1" fill="#0f766e" />
            <rect x="78" y="89" width="8" height="6" rx="1" fill="#0f766e" />
            <rect x="88" y="88" width="12" height="8" rx="1.5" fill="#134e4a" />
          </svg>
        </div>

        <NodeComment comment={data.comment ?? ''} />
      </div>
    </div>
  )
}
