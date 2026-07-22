import {
  DIST_ASSET_NAME,
  GITHUB_RELEASES_API,
  GITHUB_REPO_URL,
} from '../config/github'

export type LatestReleaseInfo = {
  tag: string
  version: string
  notes: string
  htmlUrl: string
  downloadUrl: string | null
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

/** Strip leading `v` and trim. */
export function normalizeVersion(raw: string): string {
  return raw.trim().replace(/^v/i, '')
}

/**
 * Compare two semver-ish versions (major.minor.patch[+prerelease ignored for parts].
 * Returns >0 if a > b, <0 if a < b, 0 if equal.
 */
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

/** Start download of dist zip, or open release page if asset missing. */
export function startUpdateDownload(latest: LatestReleaseInfo): void {
  if (latest.downloadUrl) {
    window.location.assign(latest.downloadUrl)
    return
  }
  window.open(latest.htmlUrl, '_blank', 'noopener,noreferrer')
}
