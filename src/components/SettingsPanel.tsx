import { useEffect, useState } from 'react'
import { RotateCcw, Save, X } from 'lucide-react'
import './SettingsPanel.css'
import type { SplitterBoxSpec, SplitterRatioSpec } from '../data/components'
import { useI18n } from '../i18n/context'
import type { Locale, TranslationKey } from '../i18n/translations'
import {
  DEFAULT_APP_SETTINGS,
  DEFAULT_MATERIAL_DEFAULTS,
  DEFAULT_ONU_STATUS_THRESHOLDS,
  EDGE_PATH_STYLE_OPTIONS,
  buildDefaultSplitterBoxes,
  buildDefaultSplitterRatios,
  type AppSettings,
  type EdgePathStyle,
  type MaterialDefaultsMap,
  type StatusThresholds,
} from '../settings/types'
import type { ThemeMode } from '../theme'
import { CurrencyInput } from './CurrencyInput'
import { UpdateSettingsSection } from './UpdateBanner'
import type { AppUpdateState } from '../hooks/useAppUpdate'
import { APP_VERSION } from '../version'

type Props = {
  settings: AppSettings
  theme: ThemeMode
  onThemeChange: (theme: ThemeMode) => void
  onSave: (next: AppSettings) => void
  onClose: () => void
  update?: AppUpdateState
}

const EDGE_STYLE_KEYS: Record<EdgePathStyle, TranslationKey> = {
  bezier: 'edgeStyle_bezier',
  smoothstep: 'edgeStyle_smoothstep',
  step: 'edgeStyle_step',
  straight: 'edgeStyle_straight',
  smart: 'edgeStyle_smart',
}

function StatusThresholdFields({
  title,
  th,
  onChange,
  ruleKey,
}: {
  title: string
  th: StatusThresholds
  onChange: (key: keyof StatusThresholds, value: number) => void
  ruleKey: 'settingsStatusRuleOnu'
}) {
  const { t, tf } = useI18n()
  return (
    <section className="settings-section">
      <h3>{title}</h3>
      <p className="settings-hint">{t('settingsStatusHint')}</p>

      <div className="settings-status-legend">
        <span>
          <i className="swatch perfect" /> {t('status_perfect')}
        </span>
        <span>
          <i className="swatch good" /> {t('status_good')}
        </span>
        <span>
          <i className="swatch low" /> {t('status_low')}
        </span>
        <span>
          <i className="swatch bad" /> {t('status_bad')}
        </span>
      </div>

      <label className="settings-field settings-row">
        <span>{t('status_perfect')}</span>
        <input
          type="number"
          step="0.1"
          value={th.perfect}
          onChange={(e) => onChange('perfect', Number(e.target.value))}
        />
        <em>dBm</em>
      </label>
      <label className="settings-field settings-row">
        <span>{t('status_good')}</span>
        <input
          type="number"
          step="0.1"
          value={th.good}
          onChange={(e) => onChange('good', Number(e.target.value))}
        />
        <em>dBm</em>
      </label>
      <label className="settings-field settings-row">
        <span>{t('status_low')}</span>
        <input
          type="number"
          step="0.1"
          value={th.low}
          onChange={(e) => onChange('low', Number(e.target.value))}
        />
        <em>dBm</em>
      </label>
      <label className="settings-field settings-row">
        <span>{t('status_bad')}</span>
        <input
          type="number"
          step="0.1"
          value={th.bad}
          onChange={(e) => onChange('bad', Number(e.target.value))}
        />
        <em>dBm</em>
      </label>
      <div className="settings-static">
        {tf(ruleKey, {
          perfect: th.perfect,
          good: th.good,
          low: th.low,
          bad: th.bad,
        })}
      </div>
      <div className="settings-static">{t('settingsDisconnectedHint')}</div>
    </section>
  )
}

export function SettingsPanel({
  settings,
  theme,
  onThemeChange,
  onSave,
  onClose,
  update,
}: Props) {
  const { locale, setLocale, t, tf } = useI18n()
  const [draft, setDraft] = useState<AppSettings>(() => structuredClone(settings))

  useEffect(() => {
    setDraft(structuredClone(settings))
  }, [settings])

  const set = (patch: Partial<AppSettings>) => {
    setDraft((prev) => ({ ...prev, ...patch }))
  }

  const setOnuThreshold = (key: keyof StatusThresholds, value: number) => {
    setDraft((prev) => ({
      ...prev,
      onuStatusThresholds: { ...prev.onuStatusThresholds, [key]: value },
    }))
  }

  const updateRatioRow = (ratio: string, patch: Partial<SplitterRatioSpec>) => {
    setDraft((prev) => ({
      ...prev,
      splitterRatios: prev.splitterRatios.map((row) =>
        row.ratio === ratio ? { ...row, ...patch } : row,
      ),
    }))
  }

  const updateBoxRow = (ratio: string, patch: Partial<SplitterBoxSpec>) => {
    setDraft((prev) => ({
      ...prev,
      splitterBoxes: prev.splitterBoxes.map((row) =>
        row.ratio === ratio ? { ...row, ...patch } : row,
      ),
    }))
  }

  const resetDefaults = () => {
    setDraft({
      ...DEFAULT_APP_SETTINGS,
      splitterRatios: buildDefaultSplitterRatios(),
      splitterBoxes: buildDefaultSplitterBoxes(),
      materialDefaults: structuredClone(DEFAULT_MATERIAL_DEFAULTS),
      onuStatusThresholds: { ...DEFAULT_ONU_STATUS_THRESHOLDS },
    })
  }

  const setMaterial = (
    key: keyof MaterialDefaultsMap,
    patch: Partial<MaterialDefaultsMap[keyof MaterialDefaultsMap]>,
  ) => {
    setDraft((prev) => ({
      ...prev,
      materialDefaults: {
        ...prev.materialDefaults,
        [key]: { ...prev.materialDefaults[key], ...patch },
      },
    }))
  }

  const handleSave = () => {
    onSave(draft)
    onClose()
  }

  const materialRows: { key: keyof MaterialDefaultsMap; label: string }[] = [
    { key: 'olt', label: t('comp_olt') },
    { key: 'onu', label: t('comp_onu') },
    { key: 'onuDual', label: t('comp_onuDual') },
    { key: 'opm', label: t('comp_opm') },
    { key: 'internet', label: t('comp_internet') },
    { key: 'mikrotik', label: t('comp_mikrotik') },
    { key: 'smartphone', label: t('comp_smartphone') },
    { key: 'komputer', label: t('comp_komputer') },
    { key: 'patchcord', label: t('comp_patchcord') },
    { key: 'connector', label: t('comp_connector') },
    { key: 'barrel', label: t('comp_barrel') },
  ]

  return (
    <aside className="settings-panel">
      <div className="settings-head">
        <h2>{t('settings')}</h2>
        <div className="settings-head-actions">
          <button type="button" className="btn-save" onClick={handleSave}>
            <Save size={14} strokeWidth={2.4} />
            {t('saveSettings')}
          </button>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={14} strokeWidth={2.4} />
            {t('close')}
          </button>
        </div>
      </div>

      <section className="settings-section">
        <h3>{t('appearance')}</h3>
        <label className="settings-field">
          <span>{t('language')}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            <option value="id">{t('langId')}</option>
            <option value="en">{t('langEn')}</option>
          </select>
        </label>
        <label className="settings-field">
          <span>{t('theme')}</span>
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as ThemeMode)}
          >
            <option value="light">{t('themeLight')}</option>
            <option value="dark">{t('themeDark')}</option>
          </select>
        </label>
      </section>

      {update ? (
        <UpdateSettingsSection
          currentVersion={APP_VERSION}
          status={update.status}
          latest={update.latest}
          error={update.error}
          onCheck={() => {
            void update.checkNow()
          }}
          onApply={() => {
            void update.applyUpdate()
          }}
        />
      ) : null}

      <section className="settings-section">
        <h3>{t('settingsDefaults')}</h3>

        <label className="settings-field">
          <span>{t('settingsOltTx')}</span>
          <input
            type="number"
            step="0.1"
            value={draft.oltTxPower}
            onChange={(e) => set({ oltTxPower: Number(e.target.value) })}
          />
        </label>

        <label className="settings-field">
          <span>{t('settingsOltPorts')}</span>
          <input
            type="number"
            min={1}
            max={16}
            step={1}
            value={draft.oltPorts}
            onChange={(e) => set({ oltPorts: Number(e.target.value) })}
          />
        </label>

        <label className="settings-field">
          <span>{t('settingsSplitterRatio')}</span>
          <select
            value={draft.splitterRatio}
            onChange={(e) => set({ splitterRatio: e.target.value })}
          >
            {draft.splitterRatios.map((s) => (
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

        <label className="settings-field">
          <span>{t('settingsSplitterBox')}</span>
          <select
            value={draft.splitterBox}
            onChange={(e) => set({ splitterBox: e.target.value })}
          >
            {draft.splitterBoxes.map((s) => (
              <option key={s.ratio} value={s.ratio}>
                {tf('settingsBoxOption', {
                  ratio: s.ratio,
                  ports: s.ports,
                  loss: s.loss,
                })}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field">
          <span>{t('settingsSleeveLoss')}</span>
          <input
            type="number"
            step="0.01"
            min={0}
            value={draft.connectorLoss}
            onChange={(e) => set({ connectorLoss: Number(e.target.value) })}
          />
        </label>

        <label className="settings-field">
          <span>{t('settingsPatchcordLoss')}</span>
          <input
            type="number"
            step="0.01"
            min={0}
            value={draft.patchcordLoss}
            onChange={(e) => set({ patchcordLoss: Number(e.target.value) })}
          />
        </label>

        <label className="settings-field">
          <span>{t('settingsBarrelLoss')}</span>
          <input
            type="number"
            step="0.01"
            min={0}
            value={draft.barrelLoss}
            onChange={(e) => set({ barrelLoss: Number(e.target.value) })}
          />
        </label>

        <label className="settings-field">
          <span>{t('settingsEdgeStyle')}</span>
          <select
            value={draft.edgePathStyle}
            onChange={(e) =>
              set({ edgePathStyle: e.target.value as AppSettings['edgePathStyle'] })
            }
          >
            {EDGE_PATH_STYLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(EDGE_STYLE_KEYS[o.value])}
              </option>
            ))}
          </select>
        </label>
        <p className="settings-hint">{t('settingsEdgeStyleHint')}</p>
      </section>

      <section className="settings-section">
        <h3>{t('settingsMaterialTitle')}</h3>
        <p className="settings-hint">{t('settingsMaterialHint')}</p>
        <div className="settings-table-wrap">
          <table className="settings-table settings-table-material">
            <thead>
              <tr>
                <th>{t('reportColComponent')}</th>
                <th>{t('settingsBrand')}</th>
                <th>{t('settingsPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {materialRows.map(({ key, label }) => (
                <tr key={key}>
                  <td className="settings-ratio-cell">{label}</td>
                  <td>
                    <input
                      type="text"
                      value={draft.materialDefaults[key].brand}
                      onChange={(e) => setMaterial(key, { brand: e.target.value })}
                    />
                  </td>
                  <td>
                    <CurrencyInput
                      value={draft.materialDefaults[key].unitPrice}
                      onChange={(unitPrice) => setMaterial(key, { unitPrice })}
                      min={0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-section">
        <h3>{t('settingsRatioParams')}</h3>
        <p className="settings-hint">{t('settingsRatioParamsHint')}</p>
        <div className="settings-table-wrap">
          <table className="settings-table">
            <thead>
              <tr>
                <th>{t('settingsColRatio')}</th>
                <th>{t('settingsColLossSmall')}</th>
                <th>{t('settingsColLossLarge')}</th>
                <th>{t('settingsBrand')}</th>
                <th>{t('settingsPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {draft.splitterRatios.map((row) => (
                <tr key={row.ratio}>
                  <td className="settings-ratio-cell">
                    {row.ratio}
                    <small>
                      {row.percentSmall}% / {row.percentLarge}%
                    </small>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.lossSmall}
                      onChange={(e) =>
                        updateRatioRow(row.ratio, { lossSmall: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.lossLarge}
                      onChange={(e) =>
                        updateRatioRow(row.ratio, { lossLarge: Number(e.target.value) })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.brand}
                      placeholder="—"
                      onChange={(e) => updateRatioRow(row.ratio, { brand: e.target.value })}
                    />
                  </td>
                  <td>
                    <CurrencyInput
                      value={row.unitPrice ?? 0}
                      onChange={(unitPrice) => updateRatioRow(row.ratio, { unitPrice })}
                      min={0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="settings-section">
        <h3>{t('settingsBoxParams')}</h3>
        <p className="settings-hint">{t('settingsBoxParamsHint')}</p>
        <div className="settings-table-wrap">
          <table className="settings-table settings-table-box">
            <thead>
              <tr>
                <th>{t('settingsColPlc')}</th>
                <th>{t('settingsColPorts')}</th>
                <th>{t('settingsColLossDb')}</th>
                <th>{t('settingsBrand')}</th>
                <th>{t('settingsPrice')}</th>
              </tr>
            </thead>
            <tbody>
              {draft.splitterBoxes.map((row) => (
                <tr key={row.ratio}>
                  <td className="settings-ratio-cell">{row.ratio}</td>
                  <td>{row.ports}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={row.loss}
                      onChange={(e) => updateBoxRow(row.ratio, { loss: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.brand}
                      placeholder="—"
                      onChange={(e) => updateBoxRow(row.ratio, { brand: e.target.value })}
                    />
                  </td>
                  <td>
                    <CurrencyInput
                      value={row.unitPrice ?? 0}
                      onChange={(unitPrice) => updateBoxRow(row.ratio, { unitPrice })}
                      min={0}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <StatusThresholdFields
        title={t('settingsOnuStatus')}
        th={draft.onuStatusThresholds}
        onChange={setOnuThreshold}
        ruleKey="settingsStatusRuleOnu"
      />

      <div className="settings-actions">
        <button type="button" className="btn-secondary" onClick={resetDefaults}>
          <RotateCcw size={14} strokeWidth={2.4} />
          {t('settingsResetDefaults')}
        </button>
      </div>
    </aside>
  )
}
