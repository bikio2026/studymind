import { Pause, Save, Trash2 } from 'lucide-react'

export default function StopDialog({ generated, total, onKeep, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fadeIn">
      <div className="bg-surface rounded-2xl border border-surface-light shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Pause className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold text-text">Procesamiento detenido</h3>
              <p className="text-xs text-text-muted">
                Se generaron {generated} de {total} temas
              </p>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="w-full h-1.5 bg-surface-light rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-warning rounded-full transition-all"
              style={{ width: `${total > 0 ? (generated / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 space-y-2">
          <button
            onClick={onKeep}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 hover:bg-accent/15 border border-accent/20 transition-colors text-left"
          >
            <Save className="w-4 h-4 text-accent shrink-0" />
            <div>
              <span className="text-sm font-medium text-text">Guardar parcial</span>
              <p className="text-[11px] text-text-muted">Ver los {generated} temas ya generados</p>
            </div>
          </button>

          <button
            onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/5 border border-surface-light hover:border-error/20 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-text-muted shrink-0" />
            <div>
              <span className="text-sm text-text-dim">Borrar todo</span>
              <p className="text-[11px] text-text-muted">Eliminar el documento y empezar de nuevo</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
