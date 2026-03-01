import { create } from 'zustand'
import { THEMES, DEFAULT_THEME } from '../lib/themes'

function applyTheme(themeId) {
  const theme = THEMES[themeId]
  if (!theme) return

  const root = document.documentElement
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value)
  }
}

export const useThemeStore = create((set) => ({
  theme: (() => {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem('studymind-theme')
      : null
    return saved && THEMES[saved] ? saved : DEFAULT_THEME
  })(),

  setTheme: (themeId) => {
    if (!THEMES[themeId]) return
    applyTheme(themeId)
    localStorage.setItem('studymind-theme', themeId)
    set({ theme: themeId })
  },

  // Apply saved theme on init
  initTheme: () => {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem('studymind-theme')
      : null
    const themeId = saved && THEMES[saved] ? saved : DEFAULT_THEME
    if (themeId !== DEFAULT_THEME) {
      applyTheme(themeId)
    }
  },
}))
