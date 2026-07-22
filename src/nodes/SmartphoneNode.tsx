import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useI18n } from '../i18n/context'
import type { SmartphoneData } from '../types/fo'
import { NodeComment } from './NodeComment'
import './nodes.css'

type SmartphoneNodeType = Node<SmartphoneData, 'smartphone'>

export function SmartphoneNode({ data, selected }: NodeProps<SmartphoneNodeType>) {
  const { t } = useI18n()
  const wifiOk = Boolean(data.wifiConnected)
  const online = Boolean(data.online)
  const led = data.inetLed ?? 'gray'
  const ledClass =
    led === 'green' ? 'on blink' : led === 'red' ? 'err blink' : 'gray'
  const ledTitle =
    led === 'green'
      ? 'Online · Internet OK'
      : led === 'red'
        ? 'Terpasang · belum IP / Internet MT / FO ONU'
        : 'WiFi belum ke ONU'

  return (
    <div
      className={`fo-phone ${selected ? 'selected' : ''} ${wifiOk ? 'is-wifi' : ''} ${led === 'green' ? 'is-online' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        id="wlan-in"
        className="fo-handle fo-wlan-handle"
        title="WiFi"
      />

      <div className="fo-phone-device">
        <div className={`fo-phone-online ${ledClass}`} title={ledTitle} />
        <div className="fo-phone-notch" aria-hidden="true" />
        <div className="fo-phone-screen">
          <strong>{data.label}</strong>
          <span className="fo-phone-brand">{data.brand || t('comp_smartphone')}</span>
          {wifiOk ? (
            <>
              <div className="fo-phone-row">
                <em>SSID</em>
                <span>{data.connectedSsid || data.ssid || '—'}</span>
              </div>
              <div className="fo-phone-row">
                <em>Pass</em>
                <span>{data.connectedPassword || data.wifiPassword || '—'}</span>
              </div>
              {online ? (
                <>
                  <div className="fo-phone-row">
                    <em>IP</em>
                    <span>{data.ipAddress || '—'}</span>
                  </div>
                  <div className="fo-phone-row">
                    <em>GW</em>
                    <span>{data.gateway || '—'}</span>
                  </div>
                  <div className="fo-phone-row">
                    <em>Mask</em>
                    <span>{data.subnetMask || '—'}</span>
                  </div>
                  <div className="fo-phone-status on">
                    {data.speedMbps ? `${data.speedMbps} Mbps` : '—'}
                  </div>
                </>
              ) : (
                <div className="fo-phone-status off">—</div>
              )}
            </>
          ) : (
            <div className="fo-phone-status off">—</div>
          )}
          <NodeComment comment={data.comment ?? ''} />
        </div>
        <div className="fo-phone-home" aria-hidden="true" />
      </div>
    </div>
  )
}
