import { useState, useRef, useEffect } from 'react'
import { Palette } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { THEMES, THEME_IDS } from '../lib/themes'
import { useTranslation } from '../lib/useTranslation'

export default function ThemeSelector() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const currentTheme = useThemeStore(s => s.theme)
  const setTheme = useThemeStore(s => s.setTheme)
  const dropdownRef = useRef(null)
  const buttonRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  // Close on click outside
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          buttonRef.current && !buttonRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 6,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(!open)
  }

  const current = THEMES[currentTheme]

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text px-2.5 py-1.5 rounded-lg
          hover:bg-surface-alt transition-colors border border-transparent hover:border-surface-light"
        title={t('theme.changeTheme')}
      >
        <Palette className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{current.name}</span>
        {/* Color preview dots */}
        <div className="flex gap-0.5 ml-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current.preview.accent }} />
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current.preview.bg }} />
        </div>
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-surface-alt border border-surface-light rounded-xl shadow-xl py-1.5 w-56 max-h-[70vh] overflow-y-auto animate-fadeIn"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {THEME_IDS.map(id => {
            const theme = THEMES[id]
            const isActive = id === currentTheme

            return (
              <button
                key={id}
                onClick={() => { setTheme(id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'hover:bg-surface-light/50 text-text-dim hover:text-text'
                }`}
              >
                {/* Color swatches */}
                <div className="flex gap-1 shrink-0">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.preview.bg, border: '1px solid rgba(128,128,128,0.3)' }} />
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.preview.accent }} />
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: theme.preview.text, border: '1px solid rgba(128,128,128,0.3)' }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{theme.name}</div>
                  <div className="text-[10px] text-text-muted truncate">{theme.description}</div>
                </div>

                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
