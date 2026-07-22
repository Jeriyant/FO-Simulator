/** GitHub repo used for release update checks. */
export const GITHUB_OWNER = 'Jeriyant'
export const GITHUB_REPO = 'FO-Simulator'
export const DIST_ASSET_NAME = 'fo-simulator-dist.zip'

export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`
export const GITHUB_RELEASES_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

/**
 * Relative ke folder app (index.html), cocok untuk
 * https://domain/FO-Simulator/ tanpa ubah VirtualHost.
 */
export function getUpdateApiUrl(): string {
  if (typeof window === 'undefined') return './update.php'
  return new URL('update.php', window.location.href).href
}
