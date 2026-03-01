import { AlertTriangle, FileText, ArrowRight, RotateCcw, X } from 'lucide-react'
import { MODEL_DISPLAY } from '../lib/models'

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DuplicateDialog({ existingDocs, onProceed, onOpen, onCancel }) {

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface border border-surface-light rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text">Documento duplicado</h2>
              <p className="text-xs text-text-muted">Este PDF ya fue procesado antes</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing runs */}
        <div className="px-6 py-3">
          <p className="text-xs text-text-dim mb-2 font-medium">Procesamientos existentes:</p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {existingDocs.map(doc => (
              <button
                key={doc.id}
                onClick={() => onOpen(doc.id)}
                className="w-full flex items-center gap-3 p-3 rounded-lg bg-surface-alt/60 hover:bg-surface-alt border border-surface-light/30 hover:border-accent/30 transition-all text-left group"
              >
                <FileText className="w-4 h-4 text-text-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text truncate">{doc.fileName}</p>
                  <p className="text-[10px] text-text-muted">
                    {MODEL_DISPLAY[doc.model] || doc.model || 'Modelo desconocido'} · {formatDate(doc.processedAt)}
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-text-muted group-hover:text-accent shrink-0 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-5 pt-2 flex flex-col gap-2">
          <button
            onClick={onProceed}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Procesar de nuevo
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 rounded-xl text-sm text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
