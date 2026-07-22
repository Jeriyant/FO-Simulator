import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_VERSION } from '../version'
import {
  compareSemver,
  fetchLatestRelease,
  type LatestReleaseInfo,
} from '../utils/githubUpdate'

const DISMISS_KEY = 'fo-update-dismissed'

export type UpdateStatus = 'idle' | 'checking' | 'available' | 'upToDate' | 'error'

export type AppUpdateState = {
  status: UpdateStatus
  latest: LatestReleaseInfo | null
  error: string | null
  /** True when a newer version exists and user has not dismissed this tag. */
  showBanner: boolean
  checkNow: () => Promise<void>
  dismiss: () => void
}

function readDismissedTag(): string | null {
  try {
    return localStorage.getItem(DISMISS_KEY)
  } catch {
    return null
  }
}

function writeDismissedTag(tag: string) {
  try {
    localStorage.setItem(DISMISS_KEY, tag)
  } catch {
    /* ignore */
  }
}

export function useAppUpdate(): AppUpdateState {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [latest, setLatest] = useState<LatestReleaseInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dismissedTag, setDismissedTag] = useState<string | null>(() => readDismissedTag())
  const abortRef = useRef<AbortController | null>(null)

  const checkNow = useCallback(async () => {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setStatus('checking')
    setError(null)
    try {
      const release = await fetchLatestRelease(ac.signal)
      if (ac.signal.aborted) return
      setLatest(release)
      const newer = compareSemver(release.version, APP_VERSION) > 0
      setStatus(newer ? 'available' : 'upToDate')
    } catch (err) {
      if (ac.signal.aborted) return
      const message = err instanceof Error ? err.message : 'Update check failed'
      setError(message)
      setStatus('error')
    }
  }, [])

  const dismiss = useCallback(() => {
    if (!latest) return
    writeDismissedTag(latest.tag)
    setDismissedTag(latest.tag)
  }, [latest])

  useEffect(() => {
    void checkNow()
    return () => {
      abortRef.current?.abort()
    }
  }, [checkNow])

  const showBanner =
    status === 'available' &&
    latest != null &&
    compareSemver(latest.version, APP_VERSION) > 0 &&
    dismissedTag !== latest.tag

  return {
    status,
    latest,
    error,
    showBanner,
    checkNow,
    dismiss,
  }
}
