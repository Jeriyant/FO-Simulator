import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Radio,
  GitFork,
  Boxes,
  Cable,
  Link2,
  CircleDot,
  Gauge,
  Router,
  Cloud,
  Cpu,
  Smartphone,
  Monitor,
  Wifi,
  X,
} from 'lucide-react'
import type { ComponentType } from '../data/components'
import {
  BARREL_LOSS,
  COMPONENT_META,
  CONNECTOR_LOSS,
  PATCHCORD_LOSS,
} from '../data/components'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/translations'
import './Sidebar.css'

const ICONS: Record<ComponentType, ReactNode> = {
  olt: <Radio size={16} strokeWidth={2.4} />,
  splitterRatio: <GitFork size={16} strokeWidth={2.4} />,
  splitterBox: <Boxes size={16} strokeWidth={2.4} />,
  patchcord: <Cable size={16} strokeWidth={2.4} />,
  connector: <Link2 size={16} strokeWidth={2.4} />,
  barrel: <CircleDot size={16} strokeWidth={2.4} />,
  opm: <Gauge size={16} strokeWidth={2.4} />,
  onu: <Router size={16} strokeWidth={2.4} />,
  onuDual: <Wifi size={16} strokeWidth={2.4} />,
  internet: <Cloud size={16} strokeWidth={2.4} />,
  mikrotik: <Cpu size={16} strokeWidth={2.4} />,
  smartphone: <Smartphone size={16} strokeWidth={2.4} />,
  komputer: <Monitor size={16} strokeWidth={2.4} />,
}

const ORDER: ComponentType[] = [
  'olt',
  'splitterRatio',
  'splitterBox',
  'barrel',
  'opm',
  'onu',
  'onuDual',
  'internet',
  'mikrotik',
  'smartphone',
  'komputer',
]

const COMP_LABEL: Record<ComponentType, TranslationKey> = {
  olt: 'comp_olt',
  splitterRatio: 'comp_splitterRatio',
  splitterBox: 'comp_splitterBox',
  patchcord: 'comp_patchcord',
  connector: 'comp_connector',
  barrel: 'comp_barrel',
  opm: 'comp_opm',
  onu: 'comp_onu',
  onuDual: 'comp_onuDual',
  internet: 'comp_internet',
  mikrotik: 'comp_mikrotik',
  smartphone: 'comp_smartphone',
  komputer: 'comp_komputer',
}

const COMP_DESC: Record<ComponentType, TranslationKey> = {
  olt: 'compDesc_olt',
  splitterRatio: 'compDesc_splitterRatio',
  splitterBox: 'compDesc_splitterBox',
  patchcord: 'compDesc_patchcord',
  connector: 'compDesc_connector',
  barrel: 'compDesc_barrel',
  opm: 'compDesc_opm',
  onu: 'compDesc_onu',
  onuDual: 'compDesc_onuDual',
  internet: 'compDesc_internet',
  mikrotik: 'compDesc_mikrotik',
  smartphone: 'compDesc_smartphone',
  komputer: 'compDesc_komputer',
}

type Props = {
  open?: boolean
  isMobile?: boolean
  title: string
  fileName: string | null
  isDirty: boolean
  onTitleChange: (title: string) => void
  onClose?: () => void
  onDragStart: (type: ComponentType) => void
  onAddComponent?: (type: ComponentType) => void
}

export function Sidebar({
  open = true,
  isMobile = false,
  title,
  fileName,
  isDirty,
  onTitleChange,
  onClose,
  onDragStart,
  onAddComponent,
}: Props) {
  const { t, tf } = useI18n()
  const [editingTitle, setEditingTitle] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTitle) titleRef.current?.focus()
  }, [editingTitle])

  const descriptionFor = (type: ComponentType): string => {
    if (type === 'patchcord') return tf('compDesc_patchcord', { loss: PATCHCORD_LOSS })
    if (type === 'connector') return tf('compDesc_connector', { loss: CONNECTOR_LOSS })
    if (type === 'barrel') return tf('compDesc_barrel', { loss: BARREL_LOSS })
    return t(COMP_DESC[type])
  }

  const displayTitle = title.trim() || t('untitledProject')
  const fileStatus = fileName
    ? isDirty
      ? `${fileName} · ${t('unsaved')}`
      : `${fileName} · ${t('saved')}`
    : isDirty
      ? t('notSavedToFileDirty')
      : t('notSavedToFile')

  return (
    <>
      {isMobile && open ? (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label={t('closeComponents')}
          onClick={onClose}
        />
      ) : null}

      <aside
        className={[
          'sidebar',
          open ? 'sidebar--open' : 'sidebar--hidden',
          isMobile ? 'sidebar--drawer' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden={!open ? true : undefined}
      >
        <div className="sidebar-project">
          {editingTitle ? (
            <input
              ref={titleRef}
              className="project-title-input"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditingTitle(false)
              }}
              placeholder={t('projectTitlePlaceholder')}
            />
          ) : (
            <button
              type="button"
              className="project-title-btn"
              onClick={() => setEditingTitle(true)}
              title={t('renameProject')}
            >
              {displayTitle}
              {isDirty ? <span className="dirty-mark">*</span> : null}
            </button>
          )}
          <span className="file-status" title={fileStatus}>
            {fileStatus}
          </span>
        </div>

        <div className="sidebar-head">
          <h2>{t('components')}</h2>
          {isMobile ? (
            <button
              type="button"
              className="sidebar-close"
              onClick={onClose}
              aria-label={t('close')}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="palette">
          {ORDER.map((type) => {
            const meta = COMPONENT_META[type]
            const label = t(COMP_LABEL[type])
            return (
              <div
                key={type}
                className="palette-item"
                draggable={!isMobile}
                role={isMobile ? 'button' : undefined}
                tabIndex={isMobile ? 0 : undefined}
                title={label}
                aria-label={label}
                onClick={() => {
                  if (!isMobile) return
                  onAddComponent?.(type)
                }}
                onKeyDown={(e) => {
                  if (!isMobile) return
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onAddComponent?.(type)
                  }
                }}
                onDragStart={(e) => {
                  if (isMobile) {
                    e.preventDefault()
                    return
                  }
                  e.dataTransfer.setData('application/fo-type', type)
                  e.dataTransfer.effectAllowed = 'move'
                  onDragStart(type)
                }}
                style={{ ['--accent' as string]: meta.color }}
              >
                <span className="palette-icon">{ICONS[type]}</span>
                <div className="palette-text">
                  <strong>{label}</strong>
                  <span>{descriptionFor(type)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </aside>
    </>
  )
}
