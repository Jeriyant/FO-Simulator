import {
  DIST_ASSET_NAME,
  GITHUB_RELEASES_API,
  GITHUB_REPO_URL,
  getUpdateApiUrl,
} from '../config/github'

export type LatestReleaseInfo = {
  tag: string
  version: string
  notes: string
  htmlUrl: string
  downloadUrl: string | null
}

export type ApplyUpdateResult = {
  ok: boolean
  version?: string
  tag?: string
  skipped?: boolean
  error?: string
}

type GhAsset = {
  name?: string
  browser_download_url?: string
}

type GhRelease = {
  tag_name?: string
  body?: string | null
  html_url?: string
  assets?: GhAsset[]
}

export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '')
}

export function compareSemver(a: string, b: string): number {
  const pa = normalizeVersion(a)
    .split(/[.+-]/)
    .map((p) => Number.parseInt(p, 10))
  const pb = normalizeVersion(b)
    .split(/[.+-]/)
    .map((p) => Number.parseInt(p, 10))
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = Number.isFinite(pa[i]) ? pa[i]! : 0
    const nb = Number.isFinite(pb[i]) ? pb[i]! : 0
    if (na !== nb) return na - nb
  }
  return 0
}

export function findDistAsset(assets: GhAsset[] | undefined): string | null {
  if (!assets?.length) return null
  const exact = assets.find((a) => a.name === DIST_ASSET_NAME)
  const url = exact?.browser_download_url
  if (url) return url
  const zip = assets.find((a) => a.name?.toLowerCase().endsWith('.zip'))
  return zip?.browser_download_url ?? null
}

export async function fetchLatestRelease(
  signal?: AbortSignal,
): Promise<LatestReleaseInfo> {
  const res = await fetch(GITHUB_RELEASES_API, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal,
  })
  if (!res.ok) {
    throw new Error(`GitHub release check failed (${res.status})`)
  }
  const data = (await res.json()) as GhRelease
  const tag = data.tag_name?.trim()
  if (!tag) throw new Error('Release tag missing')
  return {
    tag,
    version: normalizeVersion(tag),
    notes: (data.body ?? '').trim(),
    htmlUrl: data.html_url?.trim() || `${GITHUB_REPO_URL}/releases`,
    downloadUrl: findDistAsset(data.assets),
  }
}

/** Jalankan update.sh lewat update.php (PHP). */
export async function applyServerUpdate(
  signal?: AbortSignal,
): Promise<ApplyUpdateResult> {
  let res: Response
  try {
    res = await fetch(getUpdateApiUrl(), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch {
    return {
      ok: false,
      error:
        'update.php tidak terjangkau. Pastikan PHP aktif dan file update.php ada sejajar index.html.',
    }
  }

  let data: ApplyUpdateResult = { ok: false }
  try {
    data = (await res.json()) as ApplyUpdateResult
  } catch {
    return {
      ok: false,
      error: `Respons bukan JSON (HTTP ${res.status}). Cek apakah PHP berjalan untuk update.php.`,
    }
  }

  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || `Update gagal (HTTP ${res.status})`,
    }
  }

  return {
    ok: true,
    version: data.version,
    tag: data.tag,
    skipped: data.skipped,
  }
}
