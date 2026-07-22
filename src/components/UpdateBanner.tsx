import { Copy, ExternalLink, RefreshCw, Terminal, X } from 'lucide-react'
import { useState } from 'react'
import { useI18n } from '../i18n/context'
import { UPDATE_SCRIPT_COMMAND, type LatestReleaseInfo } from '../utils/githubUpdate'
import type { UpdateStatus } from '../hooks/useAppUpdate'
import './UpdateBanner.css'

type Props = {
  latest: LatestReleaseInfo
  onCopyCommand: () => Promise<boolean>
  onDismiss: () => void
}

export function UpdateBanner({ latest, onCopyCommand, onDismiss }: Props) {
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
        <span className="update-banner-note">{t('updateScriptHint')}</span>
        <code className="update-banner-cmd">{UPDATE_SCRIPT_COMMAND}</code>
        {notePreview ? <span className="update-banner-note">{notePreview}</span> : null}
      </div>
      <div className="update-banner-actions">
        <button type="button" className="update-banner-btn primary" onClick={() => void handleCopy()}>
          {copied ? <Terminal size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2.4} />}
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
        <button type="button" className="update-banner-btn ghost" onClick={onDismiss}>
          {t('updateLater')}
        </button>
        <button
          type="button"
          className="update-banner-close"
          onClick={onDismiss}
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
  onCopyCommand: () => Promise<boolean>
}

export function UpdateSettingsSection({
  currentVersion,
  status,
  latest,
  error,
  onCheck,
  onCopyCommand,
}: SettingsProps) {
  const { t, tf } = useI18n()
  const [copied, setCopied] = useState(false)

  let statusText = t('updateIdle')
  if (status === 'checking') statusText = t('updateChecking')
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
      {status === 'available' && latest && !latest.downloadUrl ? (
        <div className="settings-static">{t('updateNoAsset')}</div>
      ) : null}
      <p className="settings-hint">{t('updateBackendHint')}</p>
      <code className="update-banner-cmd">{UPDATE_SCRIPT_COMMAND}</code>
      <div className="update-settings-actions">
        <button
          type="button"
          className="btn-ghost"
          onClick={() => void onCheck()}
          disabled={status === 'checking'}
        >
          <RefreshCw size={14} strokeWidth={2.4} />
          {t('updateCheckNow')}
        </button>
        {status === 'available' ? (
          <button type="button" className="btn-save" onClick={() => void handleCopy()}>
            <Copy size={14} strokeWidth={2.4} />
            {copied ? t('updateCommandCopied') : t('updateCopyCommand')}
          </button>
        ) : null}
      </div>
    </section>
  )
}
