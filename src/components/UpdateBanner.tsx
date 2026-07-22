import { Copy, Download, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { UPDATE_SCRIPT_COMMAND, type LatestReleaseInfo } from '../utils/githubUpdate'
import type { UpdateStatus } from '../hooks/useAppUpdate'
import './UpdateBanner.css'

type Props = {
  latest: LatestReleaseInfo
  applying?: boolean
  error?: string | null
  onApply: () => void
  onCopyCommand: () => Promise<boolean>
  onDismiss: () => void
}

export function UpdateBanner({
  latest,
  applying = false,
  error = null,
  onApply,
  onCopyCommand,
  onDismiss,
}: Props) {
  const { t, tf } = useI18n()
  const [copied, setCopied] = useState(false)
  const notePreview = latest.notes
    ? latest.notes.split('\n').find((line) => line.trim())?.trim() ?? ''
    : ''

  const handleCopy = async () => {
    const ok = await onCopyCommand()
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="update-banner" role="status">
      <div className="update-banner-text">
        <strong>{tf('updateAvailable', { version: latest.version })}</strong>
        <span className="update-banner-note">{t('updateUiHint')}</span>
        {notePreview ? <span className="update-banner-note">{notePreview}</span> : null}
        {error ? <span className="update-banner-error">{error}</span> : null}
        {applying ? <span className="update-banner-note">{t('updateApplying')}</span> : null}
      </div>
      <div className="update-banner-actions">
        <button
          type="button"
          className="update-banner-btn primary"
          onClick={onApply}
          disabled={applying}
        >
          <Download size={14} strokeWidth={2.4} />
          {applying ? t('updateApplying') : t('updateInstall')}
        </button>
        <button
          type="button"
          className="update-banner-btn ghost"
          onClick={() => void handleCopy()}
          disabled={applying}
          title={UPDATE_SCRIPT_COMMAND}
        >
          <Copy size={14} strokeWidth={2.4} />
          {copied ? t('updateCommandCopied') : t('updateCopyCommand')}
        </button>
        <a
          className="update-banner-btn ghost"
          href={latest.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={14} strokeWidth={2.4} />
          {t('updateViewRelease')}
        </a>
        <button
          type="button"
          className="update-banner-btn ghost"
          onClick={onDismiss}
          disabled={applying}
        >
          {t('updateLater')}
        </button>
        <button
          type="button"
          className="update-banner-close"
          onClick={onDismiss}
          disabled={applying}
          aria-label={t('close')}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

type SettingsProps = {
  currentVersion: string
  status: UpdateStatus
  latest: LatestReleaseInfo | null
  error: string | null
  onCheck: () => void
  onApply: () => void
  onCopyCommand: () => Promise<boolean>
}

export function UpdateSettingsSection({
  currentVersion,
  status,
  latest,
  error,
  onCheck,
  onApply,
  onCopyCommand,
}: SettingsProps) {
  const { t, tf } = useI18n()
  const [copied, setCopied] = useState(false)

  let statusText = t('updateIdle')
  if (status === 'checking') statusText = t('updateChecking')
  else if (status === 'applying') statusText = t('updateApplying')
  else if (status === 'upToDate') statusText = t('updateUpToDate')
  else if (status === 'available' && latest)
    statusText = tf('updateAvailable', { version: latest.version })
  else if (status === 'error') statusText = error || t('updateCheckFailed')

  const handleCopy = async () => {
    const ok = await onCopyCommand()
    setCopied(ok)
    if (ok) window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="settings-section">
      <h3>{t('updateSection')}</h3>
      <p className="settings-hint">
        {tf('updateCurrentVersion', { version: currentVersion })}
      </p>
      <div className="settings-static">{statusText}</div>
      {error && status !== 'error' ? (
        <div className="settings-static update-banner-error">{error}</div>
      ) : null}
      <p className="settings-hint">{t('updateBackendHint')}</p>
      <div className="update-settings-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void onCheck()}
          disabled={status === 'checking' || status === 'applying'}
        >
          <RefreshCw size={14} strokeWidth={2.4} />
          {t('updateCheckNow')}
        </button>
        {status === 'available' || status === 'applying' ? (
          <button
            type="button"
            className="btn-save"
            onClick={() => void onApply()}
            disabled={status === 'applying'}
          >
            <Download size={14} strokeWidth={2.4} />
            {status === 'applying' ? t('updateApplying') : t('updateInstall')}
          </button>
        ) : null}
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void handleCopy()}
          disabled={status === 'applying'}
        >
          <Copy size={14} strokeWidth={2.4} />
          {copied ? t('updateCommandCopied') : t('updateCopyCommand')}
        </button>
      </div>
    </section>
  )
}
