import { useEffect, useState } from 'react'
import type { Edge, Node } from '@xyflow/react'
import { Trash2, Save, X } from 'lucide-react'
import { CABLE_LOSS_PER_KM } from '../data/components'
import type { AppSettings } from '../settings/types'
import type { FoEdgeData, FoNodeData } from '../types/fo'
import {
  accessoryDefaultsFromSettings,
  getEdgeCableLoss,
  getEdgeTotalLoss,
  normalizeEdgeData,
} from '../utils/edgeData'
import { useI18n } from '../i18n/context'
import { handleLabel } from '../i18n/translations'
import { CurrencyInput } from './CurrencyInput'
import './PropertiesPanel.css'

type Props = {
  edge: Edge<FoEdgeData> | null
  nodes: Node<FoNodeData>[]
  settings: AppSettings
  onChange: (id: string, data: FoEdgeData) => void
  onDelete: (edgeId: string) => void
  onClose: () => void
}

function nodeLabel(nodes: Node<FoNodeData>[], id: string): string {
  return nodes.find((n) => n.id === id)?.data.label ?? id
}

export function EdgePropertiesPanel({
  edge,
  nodes,
  settings,
  onChange,
  onDelete,
  onClose,
}: Props) {
  const { locale, t } = useI18n()
  const [draft, setDraft] = useState<FoEdgeData | null>(null)
  const defaults = accessoryDefaultsFromSettings(settings)

  useEffect(() => {
    setDraft(edge ? normalizeEdgeData(edge.data) : null)
  }, [edge?.id, edge?.data])

  if (!edge || !draft) {
    return (
      <aside className="props-panel empty">
        <div className="props-head">
          <h2>{t('connectionProperties')}</h2>
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
        <p>{t('selectConnection')}</p>
      </aside>
    )
  }

  const cableLoss = getEdgeCableLoss(draft)
  const totalLoss = getEdgeTotalLoss(draft, settings)
  const from = nodeLabel(nodes, edge.source)
  const to = nodeLabel(nodes, edge.target)

  const set = (patch: Partial<FoEdgeData>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev))
  }

  const togglePatchcord = (on: boolean) => {
    if (on) {
      set({
        hasPatchcord: true,
        patchcordBrand: draft.patchcordBrand || defaults.patchcordBrand,
        patchcordUnitPrice: draft.patchcordUnitPrice || defaults.patchcordUnitPrice,
        patchcordLoss:
          draft.patchcordLoss != null ? draft.patchcordLoss : defaults.patchcordLoss,
      })
    } else {
      set({ hasPatchcord: false })
    }
  }

  const toggleSleeve = (on: boolean) => {
    if (on) {
      set({
        hasSleeve: true,
        sleeveBrand: draft.sleeveBrand || defaults.sleeveBrand,
        sleeveUnitPrice: draft.sleeveUnitPrice || defaults.sleeveUnitPrice,
        sleeveLoss: draft.sleeveLoss != null ? draft.sleeveLoss : defaults.sleeveLoss,
      })
    } else {
      set({ hasSleeve: false })
    }
  }

  return (
    <aside className="props-panel">
      <div className="props-head">
        <h2>{t('connectionProperties')}</h2>
        <div className="props-actions">
          <button
            type="button"
            className="btn-save"
            onClick={() => {
              onChange(edge.id, normalizeEdgeData(draft))
              onClose()
            }}
            title={t('save')}
          >
            <Save size={14} strokeWidth={2.4} />
            {t('save')}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={() => onDelete(edge.id)}
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

      <div className="prop-meta onu-readout">
        <div>
          {t('from')}: <strong>{from}</strong>
        </div>
        <div>
          {t('outPort')}: <strong>{handleLabel(locale, edge.sourceHandle)}</strong>
        </div>
        <div>
          {t('to')}: <strong>{to}</strong>
        </div>
        <div>
          {t('inPort')}: <strong>{handleLabel(locale, edge.targetHandle)}</strong>
        </div>
      </div>

      <label className="prop-field">
        <span>{t('cableLength')}</span>
        <div className="prop-row">
          <input
            type="number"
            step="0.01"
            min={0}
            value={draft.lengthValue}
            onChange={(e) => set({ lengthValue: Number(e.target.value) })}
          />
          <select
            value={draft.lengthUnit}
            onChange={(e) => set({ lengthUnit: e.target.value as 'm' | 'km' })}
          >
            <option value="m">{t('unitMeter')}</option>
            <option value="km">{t('unitKilometer')}</option>
          </select>
        </div>
      </label>

      <label className="prop-field">
        <span>{t('lossPerKm')}</span>
        <input
          type="number"
          step="0.01"
          value={draft.lossPerKm}
          onChange={(e) => set({ lossPerKm: Number(e.target.value) })}
        />
        <div className="prop-meta">{t('defaultLossPerKm')} {CABLE_LOSS_PER_KM} dB/km</div>
      </label>

      <div className="prop-meta onu-readout">
        <div>
          {t('connectionLoss')}: <strong>{totalLoss.toFixed(3)} dB</strong>
          {totalLoss !== cableLoss ? (
            <span className="prop-meta-sub">
              {' '}
              ({t('cableLossShort')} {cableLoss.toFixed(3)} dB)
            </span>
          ) : null}
        </div>
      </div>

      <fieldset className="prop-field prop-color-field">
        <legend>{t('edgeColor')}</legend>
        <div className="prop-color-mode">
          <label className="prop-check">
            <input
              type="radio"
              name={`edge-color-mode-${edge.id}`}
              checked={!draft.color}
              onChange={() => set({ color: null })}
            />
            <span>{t('edgeColorAuto')}</span>
          </label>
          <label className="prop-check">
            <input
              type="radio"
              name={`edge-color-mode-${edge.id}`}
              checked={Boolean(draft.color)}
              onChange={() => set({ color: draft.color || '#0f766e' })}
            />
            <span>{t('edgeColorCustom')}</span>
          </label>
        </div>
        <div className="prop-color-row">
          <input
            type="color"
            value={draft.color || '#0f766e'}
            disabled={!draft.color}
            onChange={(e) => set({ color: e.target.value })}
            title={t('edgeColorCustom')}
          />
          <input
            type="text"
            className="prop-color-hex"
            value={draft.color || ''}
            disabled={!draft.color}
            placeholder="#0f766e"
            onChange={(e) => {
              const v = e.target.value.trim()
              if (!v) {
                set({ color: null })
                return
              }
              set({ color: v })
            }}
          />
        </div>
        <div className="prop-color-swatches" role="listbox" aria-label={t('edgeColor')}>
          {['#0f766e', '#dc2626', '#1e40af', '#ca8a04', '#db2777', '#57534e', '#0369a1', '#000000'].map(
            (c) => (
              <button
                key={c}
                type="button"
                className={`prop-swatch${draft.color === c ? ' active' : ''}`}
                style={{ background: c }}
                title={c}
                onClick={() => set({ color: c })}
              />
            ),
          )}
        </div>
      </fieldset>

      <fieldset className="prop-field prop-accessory-field">
        <legend>{t('edgeAccessories')}</legend>
        <label className="prop-check">
          <input
            type="checkbox"
            checked={Boolean(draft.hasPatchcord)}
            onChange={(e) => togglePatchcord(e.target.checked)}
          />
          <span>{t('edgeHasPatchcord')}</span>
        </label>
        {draft.hasPatchcord ? (
          <div className="prop-accessory-details">
            <label className="prop-field">
              <span>{t('settingsBrand')}</span>
              <input
                value={draft.patchcordBrand ?? ''}
                onChange={(e) => set({ patchcordBrand: e.target.value })}
              />
            </label>
            <label className="prop-field">
              <span>{t('settingsPrice')}</span>
              <CurrencyInput
                value={draft.patchcordUnitPrice ?? 0}
                onChange={(patchcordUnitPrice) => set({ patchcordUnitPrice })}
                min={0}
              />
            </label>
            <label className="prop-field">
              <span>{t('customLoss')}</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={draft.patchcordLoss ?? defaults.patchcordLoss}
                onChange={(e) => set({ patchcordLoss: Number(e.target.value) })}
              />
            </label>
          </div>
        ) : null}

        <label className="prop-check">
          <input
            type="checkbox"
            checked={Boolean(draft.hasSleeve)}
            onChange={(e) => toggleSleeve(e.target.checked)}
          />
          <span>{t('edgeHasSleeve')}</span>
        </label>
        {draft.hasSleeve ? (
          <div className="prop-accessory-details">
            <label className="prop-field">
              <span>{t('settingsBrand')}</span>
              <input
                value={draft.sleeveBrand ?? ''}
                onChange={(e) => set({ sleeveBrand: e.target.value })}
              />
            </label>
            <label className="prop-field">
              <span>{t('settingsPrice')}</span>
              <CurrencyInput
                value={draft.sleeveUnitPrice ?? 0}
                onChange={(sleeveUnitPrice) => set({ sleeveUnitPrice })}
                min={0}
              />
            </label>
            <label className="prop-field">
              <span>{t('customLoss')}</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={draft.sleeveLoss ?? defaults.sleeveLoss}
                onChange={(e) => set({ sleeveLoss: Number(e.target.value) })}
              />
            </label>
          </div>
        ) : null}
      </fieldset>
    </aside>
  )
}
