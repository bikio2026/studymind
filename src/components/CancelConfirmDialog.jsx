import { AlertTriangle, X } from 'lucide-react'

export default function CancelConfirmDialog({ onConfirm, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn">
      <div className="bg-surface rounded-2xl border border-surface-light shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
        <div className="px-6 pt-5 pb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-warning" />
              </div>
              <h3 className="font-semibold text-text text-sm">¿Cancelar procesamiento?</h3>
            </div>
            <button onClick={onDismiss} className="p-1 rounded-lg hover:bg-surface-light transition-colors">
              <X className="w-4 h-4 text-text-muted" />
            </button>
          </div>
          <p className="text-xs text-text-muted mb-1">
            El documento se está procesando. Si cancelás, podrás guardar lo generado hasta el momento o borrar todo.
          </p>
        </div>

        <div className="px-6 pb-5 pt-3 flex gap-2">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2 text-sm text-text-muted hover:text-text transition-colors rounded-lg"
          >
            Seguir
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg bg-warning/15 text-warning hover:bg-warning/25 transition-colors"
          >
            Sí, cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
