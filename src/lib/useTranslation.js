// StudyMind i18n — Language store + useTranslation hook

import { create } from 'zustand'
import { translations } from './translations'

// Zustand store for global UI language
export const useLanguageStore = create((set) => ({
  uiLanguage: (typeof localStorage !== 'undefined' && localStorage.getItem('studymind-ui-language')) || 'es',
  setUILanguage: (lang) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('studymind-ui-language', lang)
    }
    set({ uiLanguage: lang })
  },
}))

/**
 * useTranslation hook — returns `t` function and current language.
 *
 * Usage:
 *   const { t, language } = useTranslation()
 *   t('library.title')            → "Tu biblioteca" / "Your library"
 *   t('time.minutesAgo', { n: 5 }) → "Hace 5 min" / "5 min ago"
 */
export function useTranslation() {
  const uiLanguage = useLanguageStore(s => s.uiLanguage)

  const t = (key, params) => {
    let str = translations[uiLanguage]?.[key] || translations.es[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(`{${k}}`, v)
      }
    }
    return str
  }

  return { t, language: uiLanguage }
}
