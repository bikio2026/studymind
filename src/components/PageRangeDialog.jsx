import { useState } from 'react'
import { FileText, Scissors, X } from 'lucide-react'

export default function PageRangeDialog({ fileName, totalPages, onConfirm, onCancel }) {
  // Raw string state — allows clearing fields and typing freely
  const [startRaw, setStartRaw] = useState('1')
  const [endRaw, setEndRaw] = useState(String(totalPages))

  // Derived numeric values (used for validation and display)
  const startPage = parseInt(startRaw) || 0
  const endPage = parseInt(endRaw) || 0

  const pageCount = Math.max(0, endPage - startPage + 1)
  const isFullRange = startPage === 1 && endPage === totalPages
  const isValid = startPage >= 1 && endPage <= totalPages && startPage <= endPage && startRaw !== '' && endRaw !== ''

  const handleConfirm = () => {
    if (isValid) onConfirm(startPage, endPage)
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
              <h3 className="font-semibold text-text">Rango de páginas</h3>
              <p className="text-xs text-text-muted">Elegí qué parte del PDF procesar</p>
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
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-text-muted mb-1 block">Desde página</label>
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
              <label className="text-xs text-text-muted mb-1 block">Hasta página</label>
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
