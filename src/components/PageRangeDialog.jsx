import { useState } from 'react'
import { FileText, Scissors, X, Cpu, Zap, ChevronRight, BookOpen, Info } from 'lucide-react'

const PROVIDERS = {
  claude: {
    name: 'Claude',
    models: [
      { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', desc: 'Rápido y económico' },
      { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4', desc: 'Mayor calidad' },
    ],
  },
  groq: {
    name: 'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', desc: 'Rápido, tier gratuito' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', desc: 'Ultra rápido' },
    ],
  },
}

const STORAGE_KEYS = {
  provider: 'studymind-llm-provider',
  model: 'studymind-llm-model',
}

export default function PageRangeDialog({ fileName, totalPages, status, onConfirm, onCancel }) {
  // Raw string state — allows clearing fields and typing freely
  const [startRaw, setStartRaw] = useState('1')
  const [endRaw, setEndRaw] = useState(String(totalPages))

  // LLM selection — read last used from localStorage
  const [provider, setProvider] = useState(
    () => localStorage.getItem(STORAGE_KEYS.provider) || 'claude'
  )
  const [model, setModel] = useState(
    () => localStorage.getItem(STORAGE_KEYS.model) || 'claude-haiku-4-5-20251001'
  )

  // TOC configuration
  const [tocOpen, setTocOpen] = useState(false)
  const [tocMode, setTocMode] = useState('auto') // 'auto' | 'manual' | 'none'
  const [tocStartRaw, setTocStartRaw] = useState('')
  const [tocEndRaw, setTocEndRaw] = useState('')

  // Derived numeric values (used for validation and display)
  const startPage = parseInt(startRaw) || 0
  const endPage = parseInt(endRaw) || 0

  const pageCount = Math.max(0, endPage - startPage + 1)
  const isFullRange = startPage === 1 && endPage === totalPages
  const isValid = startPage >= 1 && endPage <= totalPages && startPage <= endPage && startRaw !== '' && endRaw !== ''

  const handleConfirm = () => {
    if (isValid) {
      // Persist LLM selection for next time
      localStorage.setItem(STORAGE_KEYS.provider, provider)
      localStorage.setItem(STORAGE_KEYS.model, model)

      // Build TOC config
      let tocConfig = { mode: tocMode }
      if (tocMode === 'manual') {
        const ts = parseInt(tocStartRaw) || 0
        const te = parseInt(tocEndRaw) || 0
        if (ts >= 1 && te >= ts && te <= totalPages) {
          tocConfig = { mode: 'manual', start: ts, end: te }
        } else {
          tocConfig = { mode: 'auto' } // fallback to auto if invalid manual range
        }
      }

      onConfirm(startPage, endPage, { provider, model }, tocConfig)
    }
  }

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    // Switch to first available model of new provider
    setModel(PROVIDERS[newProvider].models[0].id)
  }

  // Clamp values on blur (not on every keystroke)
  const handleStartBlur = () => {
    const n = Math.max(1, Math.min(parseInt(startRaw) || 1, totalPages))
    setStartRaw(String(n))
    if (n > (parseInt(endRaw) || totalPages)) setEndRaw(String(n))
  }

  const handleEndBlur = () => {
    const n = Math.max(1, Math.min(parseInt(endRaw) || totalPages, totalPages))
    setEndRaw(String(n))
    if (n < (parseInt(startRaw) || 1)) setStartRaw(String(n))
  }

  const providerAvailable = (key) => !status || status[key]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn">
      <div className="bg-surface rounded-2xl border border-surface-light shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Scissors className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold text-text">Configuración</h3>
              <p className="text-xs text-text-muted">Páginas y modelo de IA</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-surface-light transition-colors">
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        {/* File info */}
        <div className="mx-6 mt-2 px-4 py-3 rounded-lg bg-surface-alt border border-surface-light/50 flex items-center gap-3">
          <FileText className="w-5 h-5 text-text-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-text truncate">{fileName}</p>
            <p className="text-xs text-text-muted">{totalPages} páginas totales</p>
          </div>
        </div>

        {/* Page range inputs */}
        <div className="px-6 mt-5">
          <label className="text-xs font-medium text-text-dim mb-2 block">Rango de páginas</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Desde</label>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={startRaw}
                onChange={(e) => setStartRaw(e.target.value)}
                onBlur={handleStartBlur}
                className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-surface-light
                  text-text text-center text-lg font-mono focus:outline-none focus:border-accent
                  transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            <span className="text-text-muted mt-5">—</span>
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Hasta</label>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={endRaw}
                onChange={(e) => setEndRaw(e.target.value)}
                onBlur={handleEndBlur}
                className="w-full px-3 py-2 rounded-lg bg-surface-alt border border-surface-light
                  text-text text-center text-lg font-mono focus:outline-none focus:border-accent
                  transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* Quick presets */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => { setStartRaw('1'); setEndRaw(String(totalPages)) }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                ${isFullRange ? 'bg-accent/15 border-accent/30 text-accent' : 'border-surface-light text-text-muted hover:text-text hover:border-surface-light/80'}`}
            >
              Todo
            </button>
            <button
              onClick={() => { setStartRaw('1'); setEndRaw(String(Math.min(50, totalPages))) }}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                ${startPage === 1 && endPage === Math.min(50, totalPages) ? 'bg-accent/15 border-accent/30 text-accent' : 'border-surface-light text-text-muted hover:text-text hover:border-surface-light/80'}`}
            >
              Primeras 50
            </button>
            {totalPages > 100 && (
              <button
                onClick={() => { setStartRaw('1'); setEndRaw(String(Math.min(100, totalPages))) }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${startPage === 1 && endPage === Math.min(100, totalPages) ? 'bg-accent/15 border-accent/30 text-accent' : 'border-surface-light text-text-muted hover:text-text hover:border-surface-light/80'}`}
              >
                Primeras 100
              </button>
            )}
            {totalPages > 200 && (
              <button
                onClick={() => { setStartRaw('1'); setEndRaw(String(Math.min(150, totalPages))) }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors
                  ${startPage === 1 && endPage === Math.min(150, totalPages) ? 'bg-accent/15 border-accent/30 text-accent' : 'border-surface-light text-text-muted hover:text-text hover:border-surface-light/80'}`}
              >
                Primeras 150
              </button>
            )}
          </div>
        </div>

        {/* Model selector */}
        <div className="px-6 mt-5">
          <label className="text-xs font-medium text-text-dim mb-2 block flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Modelo de IA
          </label>
          <div className="flex items-center gap-2">
            {/* Provider selector */}
            <div className="flex rounded-lg border border-surface-light overflow-hidden">
              {Object.entries(PROVIDERS).map(([key, { name }]) => (
                <button
                  key={key}
                  onClick={() => providerAvailable(key) && handleProviderChange(key)}
                  disabled={!providerAvailable(key)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors
                    ${provider === key
                      ? 'bg-accent text-white'
                      : providerAvailable(key)
                        ? 'bg-surface-alt text-text-muted hover:text-text'
                        : 'bg-surface-alt text-text-muted/40 cursor-not-allowed'
                    }`}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Model selector */}
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 bg-surface-alt text-text px-3 py-1.5 rounded-lg border border-surface-light text-xs cursor-pointer focus:outline-none focus:border-accent transition-colors"
            >
              {PROVIDERS[provider].models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.desc}
                </option>
              ))}
            </select>
          </div>

          {/* Groq warning */}
          {provider === 'groq' && pageCount > 30 && (
            <p className="text-[10px] text-warning mt-1.5 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Groq tiene un límite de 12K tokens/min (tier gratuito). Con muchas páginas puede fallar.
            </p>
          )}
        </div>

        {/* TOC configuration — collapsible */}
        <div className="px-6 mt-4">
          <button
            onClick={() => setTocOpen(!tocOpen)}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors w-full"
          >
            <ChevronRight className={`w-3.5 h-3.5 transition-transform ${tocOpen ? 'rotate-90' : ''}`} />
            <BookOpen className="w-3.5 h-3.5" />
            <span className="font-medium">Configuración del índice</span>
          </button>

          {tocOpen && (
            <div className="mt-3 pl-5 space-y-2 animate-fadeIn">
              {/* Auto */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio" name="tocMode" value="auto"
                  checked={tocMode === 'auto'} onChange={() => setTocMode('auto')}
                  className="accent-accent"
                />
                <span className="text-xs text-text-muted group-hover:text-text transition-colors">
                  Detección automática
                </span>
              </label>

              {/* Manual */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio" name="tocMode" value="manual"
                  checked={tocMode === 'manual'} onChange={() => setTocMode('manual')}
                  className="accent-accent"
                />
                <span className="text-xs text-text-muted group-hover:text-text transition-colors">
                  Indicar manualmente
                </span>
              </label>

              {tocMode === 'manual' && (
                <div className="flex items-center gap-2 pl-5">
                  <span className="text-xs text-text-dim">Págs.</span>
                  <input
                    type="number" min={1} max={totalPages}
                    value={tocStartRaw}
                    onChange={(e) => setTocStartRaw(e.target.value)}
                    placeholder="Desde"
                    className="w-16 px-2 py-1 rounded bg-surface-alt border border-surface-light text-text text-xs text-center font-mono
                      focus:outline-none focus:border-accent transition-colors
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-text-muted text-xs">a</span>
                  <input
                    type="number" min={1} max={totalPages}
                    value={tocEndRaw}
                    onChange={(e) => setTocEndRaw(e.target.value)}
                    placeholder="Hasta"
                    className="w-16 px-2 py-1 rounded bg-surface-alt border border-surface-light text-text text-xs text-center font-mono
                      focus:outline-none focus:border-accent transition-colors
                      [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}

              {/* None */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio" name="tocMode" value="none"
                  checked={tocMode === 'none'} onChange={() => setTocMode('none')}
                  className="accent-accent"
                />
                <span className="text-xs text-text-muted group-hover:text-text transition-colors">
                  Sin índice
                </span>
              </label>

              <p className="text-[10px] text-text-dim flex items-start gap-1 mt-1">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                <span>Si tu libro tiene un índice al inicio o al final, indicá las páginas para mejorar la detección de capítulos.</span>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pt-5 pb-5 mt-3 flex items-center justify-between">
          <span className="text-sm text-text-dim">
            {isFullRange
              ? `${totalPages} páginas`
              : `${pageCount} de ${totalPages} páginas`}
          </span>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-text-muted hover:text-text transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isValid}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-accent text-white hover:bg-accent/90
                transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Procesar {pageCount} pág{pageCount !== 1 ? 's' : ''}.
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
