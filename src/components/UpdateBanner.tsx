import { Download, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { startUpdateDownload, type LatestReleaseInfo } from '../utils/githubUpdate'
import './UpdateBanner.css'

type Props = {
  latest: LatestReleaseInfo
  onDismiss: () => void
}

export function UpdateBanner({ latest, onDismiss }: Props) {
  const { t, tf } = useI18n()
  const notePreview = latest.notes
    ? latest.notes.split('\n').find((line) => line.trim())?.trim() ?? ''
    : ''

  return (
    <div className="update-banner" role="status">
      <div className="update-banner-text">
        <strong>{tf('updateAvailable', { version: latest.version })}</strong>
        {notePreview ? <span className="update-banner-note">{notePreview}</span> : null}
      </div>
      <div className="update-banner-actions">
        <button
          type="button"
          className="update-banner-btn primary"
          onClick={() => startUpdateDownload(latest)}
          title={latest.downloadUrl ? t('updateDownload') : t('updateNoAsset')}
        >
          <Download size={14} strokeWidth={2.4} />
          {t('updateDownload')}
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
  status: 'idle' | 'checking' | 'available' | 'upToDate' | 'error'
  latest: LatestReleaseInfo | null
  error: string | null
  onCheck: () => void
}

export function UpdateSettingsSection({
  currentVersion,
  status,
  latest,
  error,
  onCheck,
}: SettingsProps) {
  const { t, tf } = useI18n()

  let statusText = t('updateIdle')
  if (status === 'checking') statusText = t('updateChecking')
  else if (status === 'upToDate') statusText = t('updateUpToDate')
  else if (status === 'available' && latest)
    statusText = tf('updateAvailable', { version: latest.version })
  else if (status === 'error') statusText = error || t('updateCheckFailed')

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
        {status === 'available' && latest ? (
          <button
            type="button"
            className="btn-save"
            onClick={() => startUpdateDownload(latest)}
          >
            <Download size={14} strokeWidth={2.4} />
            {t('updateDownload')}
          </button>
        ) : null}
      </div>
    </section>
  )
}
