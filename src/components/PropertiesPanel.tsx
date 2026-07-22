import { useEffect, useState } from 'react'
import type { Node } from '@xyflow/react'
import { Trash2, Save, X } from 'lucide-react'
import {
  BARREL_LOSS,
  CONNECTOR_LOSS,
  PATCHCORD_LOSS,
  SPLITTER_BOXES,
  SPLITTER_RATIOS,
} from '../data/components'
import type { AppSettings } from '../settings/types'
import type { FoNodeData } from '../types/fo'
import { resolveDhcpCidr, deriveDhcpPoolFromCidr } from '../utils/cidr'
import { isDuplicateLabel } from '../utils/naming'
import { useI18n } from '../i18n/context'
import { statusLabel } from '../i18n/translations'
import './PropertiesPanel.css'

import { CurrencyInput } from './CurrencyInput'

type Props = {
  node: Node<FoNodeData> | null
  allLabels: string[]
  settings: AppSettings
  onChange: (id: string, data: FoNodeData) => void
  onDelete: (id: string) => void
  onClose: () => void
}

function BrandPriceFields({
  brand,
  unitPrice,
  onBrand,
  onPrice,
}: {
  brand: string
  unitPrice: number
  onBrand: (v: string) => void
  onPrice: (v: number) => void
}) {
  const { t } = useI18n()
  return (
    <>
      <label className="prop-field">
        <span>{t('settingsBrand')}</span>
        <input value={brand ?? ''} onChange={(e) => onBrand(e.target.value)} />
      </label>
      <label className="prop-field">
        <span>{t('propUnitPrice')}</span>
        <CurrencyInput value={unitPrice ?? 0} onChange={onPrice} min={0} />
      </label>
    </>
  )
}

export function PropertiesPanel({ node, allLabels, settings, onChange, onDelete, onClose }: Props) {
  const { locale, t, tf } = useI18n()
  const [draft, setDraft] = useState<FoNodeData | null>(null)
  const splitterRatios = settings.splitterRatios?.length ? settings.splitterRatios : SPLITTER_RATIOS
  const splitterBoxes = settings.splitterBoxes?.length ? settings.splitterBoxes : SPLITTER_BOXES
  const patchcordDefault = settings.patchcordLoss ?? PATCHCORD_LOSS
  const connectorDefault = settings.connectorLoss ?? CONNECTOR_LOSS
  const barrelDefault = settings.barrelLoss ?? BARREL_LOSS

  useEffect(() => {
    if (!node) {
      setDraft(null)
      return
    }
    const data = structuredClone(node.data) as FoNodeData
    if (
      (data.type === 'internet' || data.type === 'mikrotik') &&
      data.dhcpServer
    ) {
      const resolved = resolveDhcpCidr(data.dhcpServer)
      const pool = resolved ? deriveDhcpPoolFromCidr(resolved.cidr) : null
      data.dhcpServer = {
        enabled: Boolean(data.dhcpServer.enabled),
        cidr: resolved?.cidr ?? data.dhcpServer.cidr ?? '',
        poolStart: pool?.poolStart ?? data.dhcpServer.poolStart ?? '',
        poolEnd: pool?.poolEnd ?? data.dhcpServer.poolEnd ?? '',
      }
    }
    setDraft(data)
  }, [node?.id, node?.data])

  if (!node || !draft) {
    return (
      <aside className="props-panel empty">
        <div className="props-head">
          <h2>{t('properties')}</h2>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            title={t('close')}
          >
            <X size={14} strokeWidth={2.4} />
            {t('close')}
          </button>
        </div>
        <p>{t('selectComponent')}</p>
      </aside>
    )
  }

  const set = (patch: Partial<FoNodeData>) => {
    setDraft((prev) => (prev ? ({ ...prev, ...patch } as FoNodeData) : prev))
  }

  const duplicate = isDuplicateLabel(allLabels, draft.label, node.data.label)

  const handleSave = () => {
    if (duplicate) return
    onChange(node.id, draft)
    onClose()
  }

  return (
    <aside className="props-panel">
      <div className="props-head">
        <h2>{t('properties')}</h2>
        <div className="props-actions">
          <button
            type="button"
            className="btn-save"
            onClick={handleSave}
            disabled={duplicate}
            title={t('save')}
          >
            <Save size={14} strokeWidth={2.4} />
            {t('save')}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => onDelete(node.id)}
            title={t('delete')}
          >
            <Trash2 size={14} strokeWidth={2.4} />
            {t('delete')}
          </button>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            title={t('close')}
          >
            <X size={14} strokeWidth={2.4} />
            {t('close')}
          </button>
        </div>
      </div>

      <label className="prop-field">
        <span>{t('label')}</span>
        <input value={draft.label} onChange={(e) => set({ label: e.target.value })} />
        {duplicate && <span className="prop-error">{t('duplicateName')}</span>}
      </label>

      {draft.type === 'olt' && (
        <>
          <label className="prop-field">
            <span>{t('propOltTx')}</span>
            <input
              type="number"
              step="0.1"
              value={draft.txPower}
              onChange={(e) => set({ txPower: Number(e.target.value) })}
            />
          </label>
          <label className="prop-field">
            <span>{t('propOltPorts')}</span>
            <input
              type="number"
              min={1}
              max={16}
              value={draft.ports}
              onChange={(e) => set({ ports: Number(e.target.value) })}
            />
          </label>
        </>
      )}

      {draft.type === 'splitterRatio' && (
        <label className="prop-field">
          <span>{t('settingsSplitterRatio')}</span>
          <select
            value={draft.ratio}
            onChange={(e) => {
              const spec = splitterRatios.find((s) => s.ratio === e.target.value)
              if (!spec) return
              set({
                ratio: spec.ratio,
                percentSmall: spec.percentSmall,
                percentLarge: spec.percentLarge,
                lossSmall: spec.lossSmall,
                lossLarge: spec.lossLarge,
                brand: spec.brand || draft.brand,
                unitPrice:
                  typeof spec.unitPrice === 'number' && Number.isFinite(spec.unitPrice)
                    ? spec.unitPrice
                    : draft.unitPrice,
              })
            }}
          >
            {splitterRatios.map((s) => (
              <option key={s.ratio} value={s.ratio}>
                {tf('settingsRatioOption', {
                  ratio: s.ratio,
                  large: s.lossLarge,
                  small: s.lossSmall,
                })}
              </option>
            ))}
          </select>
        </label>
      )}

      {draft.type === 'splitterBox' && (
        <label className="prop-field">
          <span>{t('propSplitterPlc')}</span>
          <select
            value={draft.ratio}
            onChange={(e) => {
              const spec = splitterBoxes.find((s) => s.ratio === e.target.value)
              if (!spec) return
              set({
                ratio: spec.ratio,
                ports: spec.ports,
                loss: spec.loss,
                brand: spec.brand || draft.brand,
                unitPrice:
                  typeof spec.unitPrice === 'number' && Number.isFinite(spec.unitPrice)
                    ? spec.unitPrice
                    : draft.unitPrice,
              })
            }}
          >
            {splitterBoxes.map((s) => (
              <option key={s.ratio} value={s.ratio}>
                {s.ratio} — {s.loss} dB
              </option>
            ))}
          </select>
        </label>
      )}

      {draft.type === 'patchcord' && (
        <label className="prop-field">
          <span>{t('propLossDb')}</span>
          <input
            type="number"
            step="0.01"
            value={draft.loss}
            onChange={(e) => set({ loss: Number(e.target.value) })}
          />
          <div className="prop-meta">
            {t('defaultLossPerKm')} {patchcordDefault} dB
          </div>
        </label>
      )}

      {draft.type === 'connector' && (
        <label className="prop-field">
          <span>{t('propLossDb')}</span>
          <input
            type="number"
            step="0.01"
            value={draft.loss}
            onChange={(e) => set({ loss: Number(e.target.value) })}
          />
          <div className="prop-meta">
            {t('defaultLossPerKm')} {connectorDefault} dB
          </div>
        </label>
      )}

      {draft.type === 'barrel' && (
        <label className="prop-field">
          <span>{t('propLossDb')}</span>
          <input
            type="number"
            step="0.01"
            value={draft.loss}
            onChange={(e) => set({ loss: Number(e.target.value) })}
          />
          <div className="prop-meta">
            {t('defaultLossPerKm')} {barrelDefault} dB
          </div>
        </label>
      )}

      {draft.type === 'onu' || draft.type === 'onuDual' ? (
        <>
          <label className="prop-field">
            <span>{t('propSsid')}</span>
            <input
              value={draft.ssid ?? ''}
              onChange={(e) => set({ ssid: e.target.value })}
            />
          </label>
          <label className="prop-field">
            <span>{t('propWifiPassword')}</span>
            <input
              value={draft.wifiPassword ?? ''}
              onChange={(e) => set({ wifiPassword: e.target.value })}
            />
          </label>
        </>
      ) : null}

      {draft.type === 'smartphone' ? (
        <>
          <label className="prop-field">
            <span>{t('propSsid')}</span>
            <input
              value={draft.ssid ?? ''}
              onChange={(e) => set({ ssid: e.target.value })}
            />
          </label>
          <label className="prop-field">
            <span>{t('propWifiPassword')}</span>
            <input
              value={draft.wifiPassword ?? ''}
              onChange={(e) => set({ wifiPassword: e.target.value })}
            />
          </label>
        </>
      ) : null}

      {draft.type === 'internet' || draft.type === 'mikrotik' ? (
        <>
          {draft.type === 'mikrotik' ? (
            <>
              <label className="prop-field prop-check">
                <span>{t('propDhcpClient')}</span>
                <input
                  type="checkbox"
                  checked={Boolean(draft.dhcpClient)}
                  onChange={(e) => set({ dhcpClient: e.target.checked })}
                />
              </label>
              <label className="prop-field">
                <span>{t('propLanSpeed')}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.lanSpeedMbps ?? 1000}
                  onChange={(e) =>
                    set({ lanSpeedMbps: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
                <div className="prop-meta">{t('propLanSpeedHint')}</div>
              </label>
            </>
          ) : null}
          <div className="prop-section-title">{t('propDhcpServer')}</div>
          <label className="prop-field prop-check">
            <span>{t('propDhcpEnabled')}</span>
            <input
              type="checkbox"
              checked={Boolean(draft.dhcpServer?.enabled)}
              onChange={(e) =>
                set({
                  dhcpServer: {
                    ...(draft.dhcpServer ?? {
                      enabled: true,
                      cidr: '',
                      poolStart: '',
                      poolEnd: '',
                    }),
                    enabled: e.target.checked,
                  },
                })
              }
            />
          </label>
          <label className="prop-field">
            <span>{t('propDhcpCidr')}</span>
            <input
              placeholder="192.168.1.1/24"
              value={draft.dhcpServer?.cidr ?? ''}
              onChange={(e) => {
                const cidr = e.target.value
                const pool = deriveDhcpPoolFromCidr(cidr)
                set({
                  dhcpServer: {
                    ...(draft.dhcpServer ?? {
                      enabled: true,
                      cidr: '',
                      poolStart: '',
                      poolEnd: '',
                    }),
                    cidr,
                    ...(pool
                      ? { poolStart: pool.poolStart, poolEnd: pool.poolEnd }
                      : {}),
                  },
                })
              }}
            />
          </label>
          {(
            [
              ['poolStart', 'propDhcpPoolStart'],
              ['poolEnd', 'propDhcpPoolEnd'],
            ] as const
          ).map(([key, labelKey]) => (
            <label key={key} className="prop-field">
              <span>{t(labelKey)}</span>
              <input
                value={draft.dhcpServer?.[key] ?? ''}
                readOnly
                title={t('propDhcpPoolAuto')}
              />
            </label>
          ))}
        </>
      ) : null}


      <BrandPriceFields
        brand={typeof draft.brand === 'string' ? draft.brand : ''}
        unitPrice={typeof draft.unitPrice === 'number' ? draft.unitPrice : 0}
        onBrand={(brand) => set({ brand })}
        onPrice={(unitPrice) => set({ unitPrice })}
      />

      <label className="prop-field">
        <span>{t('comment')}</span>
        <textarea
          rows={3}
          value={draft.comment ?? ''}
          onChange={(e) => set({ comment: e.target.value })}
        />
      </label>

      {draft.type === 'opm' && (
        <div className="prop-meta onu-readout">
          <div>
            {t('propMeasuredPower')}:{' '}
            <strong>
              {(draft.status === 'disconnected' || draft.measuredPower == null
                ? 0
                : draft.measuredPower
              ).toFixed(2)}{' '}
              dBm
            </strong>
          </div>
          <div>
            {t('propTotalLoss')}:{' '}
            <strong>
              {(draft.status === 'disconnected' || draft.totalLoss == null
                ? 0
                : draft.totalLoss
              ).toFixed(2)}{' '}
              dB
            </strong>
          </div>
          <div>
            {t('propStatus')}:{' '}
            <strong>
              {draft.status === 'connected' ? t('status_connected') : t('status_disconnect')}
            </strong>
          </div>
        </div>
      )}

      {(draft.type === 'onu' || draft.type === 'onuDual') && (
        <div className="prop-meta onu-readout">
          <div>
            {t('propRxPower')}:{' '}
            <strong>
              {draft.receivedPower == null ? '—' : `${draft.receivedPower.toFixed(2)} dBm`}
            </strong>
          </div>
          <div>
            {t('propTotalLoss')}:{' '}
            <strong>{draft.totalLoss == null ? '—' : `${draft.totalLoss.toFixed(2)} dB`}</strong>
          </div>
          <div>
            {t('propStatus')}: <strong>{statusLabel(locale, draft.status)}</strong>
          </div>
          <div>
            Speed: <strong>{draft.speedMbps || (draft.type === 'onuDual' ? 1000 : 100)} Mbps</strong>
          </div>
        </div>
      )}

      {draft.type === 'splitterRatio' && (
        <div className="prop-meta">
          <div>
            % {t('large')} {draft.percentLarge}% → loss {draft.lossLarge} dB
          </div>
          <div>
            % {t('small')} {draft.percentSmall}% → loss {draft.lossSmall} dB
          </div>
          {draft.powerLarge != null && (
            <div>
              {t('calcLarge')}: {draft.powerLarge.toFixed(2)} dBm
            </div>
          )}
          {draft.powerSmall != null && (
            <div>
              {t('calcSmall')}: {draft.powerSmall.toFixed(2)} dBm
            </div>
          )}
        </div>
      )}

      {draft.type === 'splitterBox' && (
        <div className="prop-meta">
          <div>
            {tf('propSbSummary', { loss: draft.loss, ports: draft.ports })}
          </div>
          <div>
            {t('propInput')}:{' '}
            {draft.powerOut != null
              ? `${(draft.powerOut + draft.loss).toFixed(2)} dBm`
              : '—'}
          </div>
          <div>
            {t('propOutput')}:{' '}
            {draft.powerOut != null ? `${draft.powerOut.toFixed(2)} dBm` : '—'}
          </div>
        </div>
      )}
    </aside>
  )
}
