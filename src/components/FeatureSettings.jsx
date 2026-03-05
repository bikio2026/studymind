import { useRef } from 'react'
import { X, Settings, GraduationCap, ToggleLeft, ToggleRight } from 'lucide-react'
import { useFeatureStore } from '../stores/featureStore'
import { useTranslation } from '../lib/useTranslation'

const TOGGLES = [
  { key: 'helpButton', icon: '🆘' },
  { key: 'preReadingQuestions', icon: '❓' },
  { key: 'bloomBadges', icon: '🧠' },
  { key: 'learningPath', icon: '🗺️' },
]

const QUIZ_MODES = [
  { value: 'self', labelKey: 'features.quizSelf' },
  { value: 'freetext', labelKey: 'features.quizFreetext' },
  { value: 'hybrid', labelKey: 'features.quizHybrid' },
]

const DEPTH_OPTIONS = [
  { value: 'resumen', labelKey: 'depth.resumen' },
  { value: 'intermedio', labelKey: 'depth.intermedio' },
  { value: 'completo', labelKey: 'depth.completo' },
]

export default function FeatureSettings({ open, onClose, onOpenTutor }) {
  const { t } = useTranslation()
  const features = useFeatureStore(s => s.features)
  const toggle = useFeatureStore(s => s.toggle)
  const setFeature = useFeatureStore(s => s.setFeature)
  const observationsCount = useFeatureStore(s => s.tutorObservations?.length || 0)
  const backdropRef = useRef(null)

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      onClick={(e) => e.target === backdropRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-surface rounded-2xl border border-surface-light/30 w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-light/20">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-text">{t('features.title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-light/30 text-text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Feature Toggles */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('features.pedagogical')}
            </h3>
            <div className="space-y-2">
              {TOGGLES.map(({ key, icon }) => (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg
                    hover:bg-surface-light/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{icon}</span>
                    <div className="text-left">
                      <p className="text-sm text-text">{t(`features.${key}`)}</p>
                      <p className="text-[10px] text-text-muted">{t(`features.${key}Desc`)}</p>
                    </div>
                  </div>
                  {features[key] ? (
                    <ToggleRight className="w-6 h-6 text-accent shrink-0" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-text-muted shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Defaults */}
          <div>
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
              {t('features.defaults')}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text">{t('features.defaultQuizMode')}</span>
                <select
                  value={features.defaultQuizMode}
                  onChange={(e) => setFeature('defaultQuizMode', e.target.value)}
                  className="text-xs bg-surface-light/30 border border-surface-light/30 rounded-lg px-2 py-1.5 text-text"
                >
                  {QUIZ_MODES.map(m => (
                    <option key={m.value} value={m.value}>{t(m.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text">{t('features.defaultDepth')}</span>
                <select
                  value={features.defaultDepth}
                  onChange={(e) => setFeature('defaultDepth', e.target.value)}
                  className="text-xs bg-surface-light/30 border border-surface-light/30 rounded-lg px-2 py-1.5 text-text"
                >
                  {DEPTH_OPTIONS.map(d => (
                    <option key={d.value} value={d.value}>{t(d.labelKey)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tutor Observations link */}
          <div>
            <button
              onClick={() => { onClose(); onOpenTutor?.() }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl
                bg-accent/5 border border-accent/15 hover:bg-accent/10 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <GraduationCap className="w-5 h-5 text-accent" />
                <div className="text-left">
                  <p className="text-sm font-medium text-accent">{t('tutor.title')}</p>
                  <p className="text-[10px] text-text-muted">{t('tutor.settingsDesc')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {observationsCount > 0 && (
                  <span className="text-[10px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full">
                    {observationsCount}
                  </span>
                )}
                <span className="text-accent/50 group-hover:text-accent transition-colors">→</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
