import { Pause, Save, Trash2, Play } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'

export default function StopDialog({ generated, total, onKeep, onDelete, onResume }) {
  const { t } = useTranslation()
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
              <h3 className="font-semibold text-text">{t('stop.title')}</h3>
              <p className="text-xs text-text-muted">
                {t('stop.generated', { generated, total })}
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
          {/* Resume — continue processing */}
          {onResume && (
            <button
              onClick={onResume}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-success/10 hover:bg-success/15 border border-success/20 transition-colors text-left"
            >
              <Play className="w-4 h-4 text-success shrink-0" />
              <div>
                <span className="text-sm font-medium text-text">{t('stop.resume')}</span>
                <p className="text-[11px] text-text-muted">{t('stop.resumeDesc')}</p>
              </div>
            </button>
          )}

          <button
            onClick={onKeep}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 hover:bg-accent/15 border border-accent/20 transition-colors text-left"
          >
            <Save className="w-4 h-4 text-accent shrink-0" />
            <div>
              <span className="text-sm font-medium text-text">{t('stop.keep')}</span>
              <p className="text-[11px] text-text-muted">{t('stop.keepDesc', { n: generated })}</p>
            </div>
          </button>

          <button
            onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-error/5 border border-surface-light hover:border-error/20 transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-text-muted shrink-0" />
            <div>
              <span className="text-sm text-text-dim">{t('stop.delete')}</span>
              <p className="text-[11px] text-text-muted">{t('stop.deleteDesc')}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
