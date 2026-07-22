import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/translations'
import {
  DEFAULT_QUICK_COUNTS,
  type QuickTopologyCounts,
} from '../utils/quickTopology'
import './QuickPanel.css'

type RatioOption = { ratio: string }

type Props = {
  oltPorts: number
  splitterRatios: RatioOption[]
  defaultStartRatio?: string
  onGenerate: (counts: QuickTopologyCounts) => void
  onClose: () => void
}

const COUNT_FIELDS: {
  key: keyof Pick<
    QuickTopologyCounts,
    'olt' | 'splitterRatio' | 'splitterBox' | 'onu' | 'onuDual'
  >
  labelKey: TranslationKey
}[] = [
  { key: 'olt', labelKey: 'quickOlt' },
  { key: 'splitterRatio', labelKey: 'quickSplitterRatio' },
  { key: 'splitterBox', labelKey: 'quickSplitterBox' },
  { key: 'onu', labelKey: 'quickOnu' },
  { key: 'onuDual', labelKey: 'quickOnuDual' },
]

export function QuickPanel({
  splitterRatios,
  defaultStartRatio,
  onGenerate,
  onClose,
}: Props) {
  const { t } = useI18n()
  const ratioList = splitterRatios.length ? splitterRatios : [{ ratio: '1:99' }]
  const initialStart =
    defaultStartRatio && ratioList.some((r) => r.ratio === defaultStartRatio)
      ? defaultStartRatio
      : ratioList[0].ratio

  const [counts, setCounts] = useState<QuickTopologyCounts>(() => ({
    ...DEFAULT_QUICK_COUNTS,
    startSplitterRatio: initialStart,
  }))

  const setField = (
    key: keyof Pick<
      QuickTopologyCounts,
      'olt' | 'splitterRatio' | 'splitterBox' | 'onu' | 'onuDual'
    >,
    value: number,
  ) => {
    setCounts((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="quick-panel">
      <div className="quick-head">
        <h2>
          <Wand2 size={16} />
          {t('quickTitle')}
        </h2>
        <div className="quick-head-actions">
          <button
            type="button"
            className="btn-save"
            onClick={() => onGenerate(counts)}
          >
            {t('quickGenerate')}
          </button>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>

      <p className="quick-hint">{t('quickHint')}</p>

      <div className="quick-fields">
        {COUNT_FIELDS.map(({ key, labelKey }) => (
          <label key={key} className="quick-field">
            <span>{t(labelKey)}</span>
            <input
              type="number"
              min={0}
              max={128}
              step={1}
              value={counts[key]}
              onChange={(e) => setField(key, Number(e.target.value))}
            />
          </label>
        ))}

        <label className="quick-field">
          <span>{t('quickStartSplitterRatio')}</span>
          <select
            value={counts.startSplitterRatio}
            onChange={(e) =>
              setCounts((prev) => ({ ...prev, startSplitterRatio: e.target.value }))
            }
          >
            {ratioList.map((s) => (
              <option key={s.ratio} value={s.ratio}>
                {s.ratio}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="quick-rules">
        <strong>{t('quickRulesTitle')}</strong>
        <ul>
          <li>{t('quickRule1')}</li>
          <li>{t('quickRule2')}</li>
          <li>{t('quickRule3')}</li>
          <li>{t('quickRule4')}</li>
          <li>{t('quickRule5')}</li>
          <li>{t('quickRule6')}</li>
          <li>{t('quickRule7')}</li>
        </ul>
      </div>
    </div>
  )
}
