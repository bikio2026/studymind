import { Loader, CheckCircle, BookOpen, Brain, Sparkles, Square } from 'lucide-react'

const PHASES = [
  { key: 'parsing', label: 'Extrayendo texto del PDF', icon: BookOpen },
  { key: 'analyzing', label: 'Detectando estructura del documento', icon: Brain },
  { key: 'generating', label: 'Generando guías de estudio', icon: Sparkles },
]

export default function ProcessingStatus({ phase, progress, generatingTopic, onStop }) {
  const currentIdx = PHASES.findIndex(p => p.key === phase)
  if (currentIdx === -1) return null

  const pct = progress?.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fadeIn">
      <div className="w-full max-w-md">
        {/* Current phase */}
        <div className="flex items-center gap-3 mb-8">
          <div className="animate-spin-slow">
            <Loader className="w-6 h-6 text-accent" />
          </div>
          <span className="text-lg font-semibold">
            {PHASES[currentIdx].label}...
          </span>
        </div>

        {/* Progress bar (only for parsing and generating) */}
        {progress?.total > 0 && (
          <div className="mb-6">
            <div className="flex justify-between text-sm text-text-dim mb-2">
              <span>{progress.current} de {progress.total}</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2.5 bg-surface-light rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Current topic name */}
        {generatingTopic && (
          <p className="text-text-dim text-sm animate-pulse-soft mb-4">
            Procesando: <span className="text-text">{generatingTopic}</span>
          </p>
        )}

        {/* Stop button — only during generating phase */}
        {phase === 'generating' && onStop && (
          <button
            onClick={onStop}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-error px-3 py-2 rounded-lg
              border border-surface-light hover:border-error/30 hover:bg-error/5 transition-all mb-4"
          >
            <Square className="w-3 h-3" />
            Detener procesamiento
          </button>
        )}

        {/* Pipeline steps */}
        <div className="space-y-4 mt-8">
          {PHASES.map((step, i) => {
            const isPast = i < currentIdx
            const isCurrent = i === currentIdx
            const Icon = step.icon

            return (
              <div
                key={step.key}
                className={`flex items-center gap-3 text-sm transition-colors ${
                  isPast ? 'text-success' : isCurrent ? 'text-accent' : 'text-text-muted/50'
                }`}
              >
                {isPast ? (
                  <CheckCircle className="w-5 h-5" />
                ) : isCurrent ? (
                  <div className="w-5 h-5 rounded-full border-2 border-accent flex items-center justify-center">
                    <div className="w-2 h-2 bg-accent rounded-full" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-text-muted/30" />
                )}
                <span className={isCurrent ? 'font-medium' : ''}>{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
