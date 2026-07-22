import { createContext, useContext } from 'react'
import { t, tf, type Locale, type TranslationKey } from './translations'

export type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
  tf: (key: TranslationKey, vars: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}

export function createI18nValue(
  locale: Locale,
  setLocale: (locale: Locale) => void,
): I18nContextValue {
  return {
    locale,
    setLocale,
    t: (key) => t(locale, key),
    tf: (key, vars) => tf(locale, key, vars),
  }
}
