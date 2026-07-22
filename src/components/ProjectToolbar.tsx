import { useEffect, useRef, useState } from 'react'
import {
  ChevronDown,
  ClipboardList,
  File,
  FileImage,
  FileOutput,
  FilePlus,
  FolderOpen,
  PanelLeft,
  PanelLeftClose,
  Printer,
  Redo2,
  Save,
  Settings,
  Undo2,
  Wand2,
} from 'lucide-react'
import { useI18n } from '../i18n/context'
import { APP_VERSION } from '../version'
import { FoLogo } from './FoLogo'
import './ProjectToolbar.css'

type Props = {
  canUndo: boolean
  canRedo: boolean
  isMobile?: boolean
  sidebarOpen?: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExportPng: () => void
  onExportJpg: () => void
  onPrintTopology: () => void
  onUndo: () => void
  onRedo: () => void
  onOpenSettings: () => void
  onOpenMaterialReport: () => void
  onOpenQuantityReport: () => void
  onOpenOnuLossReport: () => void
  onToggleSidebar?: () => void
  onOpenQuick?: () => void
  updateAvailable?: boolean
  onVersionClick?: () => void
}

export function ProjectToolbar({
  canUndo,
  canRedo,
  isMobile = false,
  sidebarOpen = true,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportPng,
  onExportJpg,
  onPrintTopology,
  onUndo,
  onRedo,
  onOpenSettings,
  onOpenMaterialReport,
  onOpenQuantityReport,
  onOpenOnuLossReport,
  onToggleSidebar,
  onOpenQuick,
  updateAvailable = false,
  onVersionClick,
}: Props) {
  const { t } = useI18n()
  const [fileOpen, setFileOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const fileRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!fileOpen && !reportOpen) return
    const close = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      if (fileOpen && fileRef.current && !fileRef.current.contains(target)) {
        setFileOpen(false)
      }
      if (reportOpen && reportRef.current && !reportRef.current.contains(target)) {
        setReportOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('touchstart', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [fileOpen, reportOpen])

  const runFileAction = (action: () => void) => {
    setFileOpen(false)
    action()
  }

  const sidebarToggleLabel = sidebarOpen ? t('hideComponents') : t('showComponents')

  return (
    <header className={`toolbar${isMobile ? ' toolbar--mobile' : ''}`}>
      <div className="toolbar-left">
        <div className="toolbar-brand">
          <FoLogo className="toolbar-mark" size={isMobile ? 32 : 36} title={t('sidebarTitle')} />
          <div className="toolbar-brand-text">
            <strong>
              {t('sidebarTitle')}
              <button
                type="button"
                className={`app-version${updateAvailable ? ' has-update' : ''}`}
                title={
                  updateAvailable
                    ? t('updateCheckNow')
                    : `v${APP_VERSION}`
                }
                onClick={onVersionClick}
              >
                v{APP_VERSION}
                {updateAvailable ? <span className="app-version-dot" aria-hidden="true" /> : null}
              </button>
            </strong>
            <span>{t('sidebarSubtitle')}</span>
          </div>
        </div>

        {onToggleSidebar ? (
          <button
            type="button"
            className={`icon-btn components-btn${sidebarOpen ? ' is-active' : ''}`}
            onClick={onToggleSidebar}
            title={sidebarToggleLabel}
            aria-label={sidebarToggleLabel}
            aria-pressed={sidebarOpen}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
          </button>
        ) : null}

        <div className="toolbar-divider" aria-hidden="true" />

        <div className="toolbar-group" ref={fileRef}>
          <button
            type="button"
            className="file-menu-trigger"
            onClick={() => {
              setFileOpen((v) => !v)
              setReportOpen(false)
            }}
            aria-expanded={fileOpen}
            aria-haspopup="menu"
            title={t('fileMenu')}
          >
            <File size={15} />
            <span className="file-menu-trigger-label">{t('fileMenu')}</span>
            <ChevronDown size={14} />
          </button>
          {fileOpen && (
            <div className="file-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => runFileAction(onNew)}>
                <FilePlus size={15} />
                <span>
                  {t('newProject')}
                  <small>Ctrl+N</small>
                </span>
              </button>
              <button type="button" role="menuitem" onClick={() => runFileAction(onOpen)}>
                <FolderOpen size={15} />
                <span>
                  {t('open')}
                  <small>Ctrl+O</small>
                </span>
              </button>
              <button type="button" role="menuitem" onClick={() => runFileAction(onSave)}>
                <Save size={15} />
                <span>
                  {t('save')}
                  <small>Ctrl+S</small>
                </span>
              </button>
              <button type="button" role="menuitem" onClick={() => runFileAction(onSaveAs)}>
                <FileOutput size={15} />
                <span>{t('saveAs')}</span>
              </button>
              <button type="button" role="menuitem" onClick={() => runFileAction(onExportPng)}>
                <FileImage size={15} />
                <span>{t('exportPng')}</span>
              </button>
              <button type="button" role="menuitem" onClick={() => runFileAction(onExportJpg)}>
                <FileImage size={15} />
                <span>{t('exportJpg')}</span>
              </button>
              <button type="button" role="menuitem" onClick={() => runFileAction(onPrintTopology)}>
                <Printer size={15} />
                <span>
                  {t('print')}
                  <small>Ctrl+P</small>
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-divider" aria-hidden="true" />

        <div className="toolbar-group" ref={reportRef}>
          <button
            type="button"
            className="report-btn"
            onClick={() => {
              setReportOpen((v) => !v)
              setFileOpen(false)
            }}
            aria-haspopup="menu"
            aria-expanded={reportOpen}
            title={t('reports')}
          >
            <ClipboardList size={15} />
            <span className="report-btn-label">{t('reports')}</span>
            <ChevronDown size={14} />
          </button>
          {reportOpen ? (
            <div className="file-menu report-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setReportOpen(false)
                  onOpenMaterialReport()
                }}
              >
                <ClipboardList size={15} />
                <span>
                  {t('reportMaterial')}
                  <small>{t('reportMaterialHint')}</small>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setReportOpen(false)
                  onOpenQuantityReport()
                }}
              >
                <ClipboardList size={15} />
                <span>
                  {t('reportQuantity')}
                  <small>{t('reportQuantityHint')}</small>
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setReportOpen(false)
                  onOpenOnuLossReport()
                }}
              >
                <ClipboardList size={15} />
                <span>
                  {t('reportOnuLoss')}
                  <small>{t('reportOnuLossHint')}</small>
                </span>
              </button>
            </div>
          ) : null}
        </div>

        {onOpenQuick ? (
          <>
            <div className="toolbar-divider" aria-hidden="true" />
            <button
              type="button"
              className="quick-btn"
              onClick={onOpenQuick}
              title={t('quickTitle')}
            >
              <Wand2 size={15} />
              <span className="quick-btn-label">{t('quick')}</span>
            </button>
          </>
        ) : null}

        <div className="toolbar-divider" aria-hidden="true" />

        <div className="history-group">
          <button
            type="button"
            className="icon-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title={t('undo')}
            aria-label={t('undo')}
          >
            <Undo2 size={17} />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title={t('redo')}
            aria-label={t('redo')}
          >
            <Redo2 size={17} />
          </button>
        </div>
      </div>

      <div className="toolbar-actions">
        <button
          type="button"
          className="icon-btn settings-btn"
          onClick={onOpenSettings}
          title={t('settings')}
          aria-label={t('settings')}
        >
          <Settings size={17} />
        </button>
      </div>
    </header>
  )
}
