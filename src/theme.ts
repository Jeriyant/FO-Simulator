export type ThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'fo-theme'

export function loadTheme(): ThemeMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* ignore */
  }
  return 'light'
}

export function saveTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* ignore */
  }
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
}
