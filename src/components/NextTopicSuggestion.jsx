import { ArrowRight, Route } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { getNextRecommendation } from '../lib/learningPath'
import { useTranslation } from '../lib/useTranslation'

export default function NextTopicSuggestion({ topics, currentTopicId, onNavigate }) {
  const { t } = useTranslation()
  const progress = useProgressStore(s => s.progress)
  const recommendation = getNextRecommendation(topics, progress, currentTopicId)

  if (!recommendation) {
    return (
      <div className="mt-3 p-3 rounded-lg bg-accent/5 border border-accent/20 text-center">
        <p className="text-xs text-accent font-medium">{'🎉 '}{t('nextTopic.completed')}</p>
        <p className="text-[11px] text-text-muted mt-1">{t('nextTopic.completedDesc')}</p>
      </div>
    )
  }

  return (
    <button
      onClick={() => onNavigate(recommendation.topic.id)}
      className="mt-3 w-full text-left p-3 rounded-lg bg-accent/5 border border-accent/20
        hover:bg-accent/10 transition-colors group flex items-center gap-3"
    >
      <Route className="w-4 h-4 text-accent shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-accent">{t('nextTopic.recommended')}</p>
        <p className="text-xs text-text-dim truncate">{recommendation.topic.sectionTitle}</p>
        <p className="text-[10px] text-text-muted">{t(recommendation.reason, recommendation.reasonParams ? { ...recommendation.reasonParams, phase: t(recommendation.reasonParams.phase) } : undefined)}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-accent/50 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </button>
  )
}
