import { Download, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useI18n } from '../i18n/context'
import {
  formatReleaseNotesPreview,
  type LatestReleaseInfo,
  type UpdateProgress,
} from '../utils/githubUpdate'
import type { UpdateStatus } from '../hooks/useAppUpdate'
import './UpdateBanner.css'

type Props = {
  latest: LatestReleaseInfo
  applying?: boolean
  error?: string | null
  progress?: UpdateProgress | null
  onApply: () => void
  onDismiss: () => void
}

function ProgressBlock({ progress }: { progress: UpdateProgress }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress.percent || 0)))
  return (
    <div className="update-progress">
      <div className="update-progress-row">
        <span className="update-progress-msg">
          {progress.message || '…'}
        </span>
        <span className="update-progress-pct">{pct}%</span>
      </div>
      <div
        className="update-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="update-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function UpdateBanner({
  latest,
  applying = false,
  error = null,
  progress = null,
  onApply,
  onDismiss,
}: Props) {
  const { t, tf } = useI18n()
  const notePreview = formatReleaseNotesPreview(latest.notes)

  return (
    <div className="update-banner" role="status">
      <div className="update-banner-text">
        <strong>{tf('updateAvailable', { version: latest.version })}</strong>
        {!applying && notePreview ? (
          <span className="update-banner-note">{notePreview}</span>
        ) : null}
        {applying && progress ? <ProgressBlock progress={progress} /> : null}
        {applying && !progress ? (
          <span className="update-banner-note">{t('updateApplying')}</span>
        ) : null}
        {error ? <span className="update-banner-error">{error}</span> : null}
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
  progress?: UpdateProgress | null
  onCheck: () => void
  onApply: () => void
}

export function UpdateSettingsSection({
  currentVersion,
  status,
  latest,
  error,
  progress = null,
  onCheck,
  onApply,
}: SettingsProps) {
  const { t, tf } = useI18n()

  let statusText = t('updateIdle')
  if (status === 'checking') statusText = t('updateChecking')
  else if (status === 'applying')
    statusText = progress?.message || t('updateApplying')
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
      {status === 'applying' && progress ? (
        <ProgressBlock progress={progress} />
      ) : null}
      {error && status !== 'error' ? (
        <div className="settings-static update-banner-error">{error}</div>
      ) : null}
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
      </div>
    </section>
  )
}
