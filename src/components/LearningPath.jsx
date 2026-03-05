import { useState } from 'react'
import { Route, ChevronRight, ChevronDown, ChevronUp, Star, BookOpen, Layers, Eye, Brain, Trophy, CheckCircle, Info } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { useFeatureStore } from '../stores/featureStore'
import { buildLearningPath, getPhaseStats, getNextRecommendation } from '../lib/learningPath'
import { MASTERY_LEVELS } from '../lib/proficiency'
import { useTranslation } from '../lib/useTranslation'

const STUDY_PHASES = [
  {
    key: 'panorama',
    icon: Eye,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    barColor: 'bg-blue-400',
  },
  {
    key: 'deep',
    icon: Brain,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    barColor: 'bg-amber-400',
  },
  {
    key: 'consolidation',
    icon: Trophy,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    barColor: 'bg-emerald-400',
  },
]

function StudyPhaseNode({ topic, mastery, isActive, onClick, phase }) {
  const { t } = useTranslation()
  const masteryInfo = MASTERY_LEVELS[mastery]

  // Phase-specific completion check
  const isDone = phase === 'panorama'
    ? mastery !== 'sin-empezar'
    : phase === 'deep'
    ? ['aprendiendo', 'dominado', 'experto'].includes(mastery)
    : ['dominado', 'experto'].includes(mastery)

  return (
    <button
      onClick={() => onClick(topic.id)}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
        isActive
          ? 'bg-accent/15 border border-accent/30'
          : 'hover:bg-surface-light/50 border border-transparent'
      }`}
    >
      {/* Completion indicator */}
      {isDone ? (
        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      ) : (
        <div className="w-3 h-3 rounded-full shrink-0 bg-text-muted/20" />
      )}

      {/* Title */}
      <span className={`text-xs truncate flex-1 ${
        isActive ? 'text-accent font-medium' : 'text-text-dim'
      }`}>
        {topic.sectionTitle}
      </span>

      {/* Mastery label */}
      <span className={`text-[10px] ${masteryInfo.color} shrink-0`}>
        {mastery !== 'sin-empezar' ? t('mastery.' + mastery) : ''}
      </span>
    </button>
  )
}

// Legacy view: grouped by relevance (core/supporting/detail)
const PHASE_CONFIG = {
  core: { color: 'text-core', bg: 'bg-core-bg', border: 'border-core/30', icon: Star },
  supporting: { color: 'text-support', bg: 'bg-support-bg', border: 'border-support/30', icon: BookOpen },
  detail: { color: 'text-detail', bg: 'bg-detail-bg', border: 'border-detail/30', icon: Layers },
}

const phaseTransKey = {
  core: 'path.fundamentals',
  supporting: 'path.reinforcement',
  detail: 'path.deepening',
}

function LegacyPathNode({ item, isActive, onClick }) {
  const { t } = useTranslation()
  const masteryInfo = MASTERY_LEVELS[item.mastery]
  const phaseConf = PHASE_CONFIG[item.phase]

  return (
    <button
      onClick={() => onClick(item.topic.id)}
      className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
        isActive
          ? 'bg-accent/15 border border-accent/30'
          : 'hover:bg-surface-light/50 border border-transparent'
      }`}
    >
      <div className={`w-3 h-3 rounded-full shrink-0 ${
        item.mastery === 'sin-empezar' ? 'bg-text-muted/20' :
        item.mastery === 'visto' ? 'bg-blue-400' :
        item.mastery === 'aprendiendo' ? 'bg-amber-400' :
        item.mastery === 'dominado' ? 'bg-emerald-400' :
        'bg-accent'
      }`} />
      <span className={`text-xs truncate flex-1 ${
        isActive ? 'text-accent font-medium' : 'text-text-dim'
      }`}>
        {item.topic.sectionTitle}
      </span>
      <span className={`text-[10px] ${masteryInfo.color} shrink-0`}>
        {item.mastery !== 'sin-empezar' ? t('mastery.' + item.mastery) : ''}
      </span>
    </button>
  )
}

export default function LearningPath({ topics, activeTopic, onSelectTopic }) {
  const { t } = useTranslation()
  const progress = useProgressStore(s => s.progress)
  const learningPathEnabled = useFeatureStore(s => s.features.learningPath)
  const path = buildLearningPath(topics, progress)
  const recommendation = getNextRecommendation(topics, progress, activeTopic)

  // Expandable phases state — panorama open by default
  const [expandedPhases, setExpandedPhases] = useState({ panorama: true, deep: false, consolidation: false })

  const togglePhase = (key) => {
    setExpandedPhases(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (path.length === 0) return null

  // If learning path feature is disabled, show legacy view
  if (!learningPathEnabled) {
    const phases = getPhaseStats(topics, progress)
    const grouped = {}
    for (const item of path) {
      if (!grouped[item.phase]) grouped[item.phase] = []
      grouped[item.phase].push(item)
    }

    return (
      <div className="space-y-4">
        {recommendation && (
          <button
            onClick={() => onSelectTopic(recommendation.topic.id)}
            className="w-full text-left p-3 rounded-lg bg-accent/5 border border-accent/20
              hover:bg-accent/10 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1">
              <Route className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-medium text-accent">{t('path.nextRecommended')}</span>
              <ChevronRight className="w-3 h-3 text-accent/50 ml-auto group-hover:translate-x-0.5 transition-transform" />
            </div>
            <p className="text-xs text-text-dim truncate">{recommendation.topic.sectionTitle}</p>
          </button>
        )}
        <div className="space-y-2">
          {phases.map(phase => {
            const conf = PHASE_CONFIG[phase.key]
            const PhaseIcon = conf.icon
            return (
              <div key={phase.key}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <PhaseIcon className={`w-3 h-3 ${conf.color}`} />
                    <span className={`text-[11px] font-medium ${conf.color}`}>{t(phase.labelKey || phaseTransKey[phase.key])}</span>
                  </div>
                  <span className="text-[10px] text-text-muted">{phase.mastered}/{phase.total}</span>
                </div>
                <div className="h-1.5 bg-surface-light/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      phase.key === 'core' ? 'bg-core' : phase.key === 'supporting' ? 'bg-support' : 'bg-detail'
                    }`}
                    style={{ width: `${phase.pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {Object.entries(grouped).map(([phase, items]) => {
          const conf = PHASE_CONFIG[phase]
          const PhaseIcon = conf.icon
          return (
            <div key={phase}>
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <PhaseIcon className={`w-3 h-3 ${conf.color}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${conf.color}`}>
                  {t(phaseTransKey[phase])}
                </span>
              </div>
              <div className="space-y-0.5 relative">
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-surface-light/50" />
                {items.map(item => (
                  <LegacyPathNode
                    key={item.topic.id}
                    item={item}
                    isActive={activeTopic === item.topic.id}
                    onClick={onSelectTopic}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // 3-phase study path: Panorama → Profundización → Consolidación
  const allTopics = path.map(p => ({
    topic: p.topic,
    mastery: p.mastery,
    relevance: p.phase,
  }))

  // Phase stats
  const phaseStats = STUDY_PHASES.map((phase) => {
    let done = 0
    for (const item of allTopics) {
      if (phase.key === 'panorama' && item.mastery !== 'sin-empezar') done++
      else if (phase.key === 'deep' && ['aprendiendo', 'dominado', 'experto'].includes(item.mastery)) done++
      else if (phase.key === 'consolidation' && ['dominado', 'experto'].includes(item.mastery)) done++
    }
    const pct = allTopics.length > 0 ? Math.round((done / allTopics.length) * 100) : 0

    return {
      ...phase,
      done,
      total: allTopics.length,
      pct,
    }
  })

  // Find current phase (the first incomplete one)
  const currentPhaseIdx = phaseStats.findIndex(p => p.pct < 100)

  return (
    <div className="space-y-4">
      {/* Next recommendation */}
      {recommendation && (
        <button
          onClick={() => onSelectTopic(recommendation.topic.id)}
          className="w-full text-left p-3 rounded-lg bg-accent/5 border border-accent/20
            hover:bg-accent/10 transition-colors group"
        >
          <div className="flex items-center gap-2 mb-1">
            <Route className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] font-medium text-accent">{t('path.nextRecommended')}</span>
            <ChevronRight className="w-3 h-3 text-accent/50 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-text-dim truncate">{recommendation.topic.sectionTitle}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{t(recommendation.reason, recommendation.reasonParams ? { ...recommendation.reasonParams, phase: t(recommendation.reasonParams.phase) } : undefined)}</p>
        </button>
      )}

      {/* Study phases — expandable, all accessible */}
      <div className="space-y-2">
        {phaseStats.map((phase, phaseIdx) => {
          const PhaseIcon = phase.icon
          const isCurrent = phaseIdx === (currentPhaseIdx >= 0 ? currentPhaseIdx : 0)
          const isExpanded = expandedPhases[phase.key]
          const isPreviousIncomplete = phaseIdx > 0 && phaseStats[phaseIdx - 1].pct < 30

          return (
            <div key={phase.key}>
              {/* Phase header — clickable to expand/collapse */}
              <button
                onClick={() => togglePhase(phase.key)}
                className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors ${
                  isCurrent ? `${phase.bg} border ${phase.border}` : 'hover:bg-surface-light/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <PhaseIcon className={`w-3.5 h-3.5 ${phase.color}`} />
                    <span className={`text-[11px] font-medium ${phase.color}`}>
                      {t(`studyPhase.${phase.key}`)}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                        {t('studyPhase.current')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted">
                      {phase.done}/{phase.total}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3 text-text-muted" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-text-muted" />
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-surface-light/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${phase.barColor}`}
                    style={{ width: `${phase.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  {t(`studyPhase.${phase.key}.desc`)}
                </p>
              </button>

              {/* Expanded topics list */}
              {isExpanded && (
                <div className="mt-1 ml-2 space-y-0.5 relative animate-fadeIn">
                  {/* Soft recommendation hint */}
                  {isPreviousIncomplete && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-text-muted bg-surface-light/20 rounded-lg mb-1">
                      <Info className="w-3 h-3 shrink-0" />
                      {t('studyPhase.recommendPrevious', { phase: t(`studyPhase.${STUDY_PHASES[phaseIdx - 1].key}`) })}
                    </div>
                  )}
                  <div className="absolute left-[17px] top-2 bottom-2 w-px bg-surface-light/50" />
                  {allTopics.map(item => (
                    <StudyPhaseNode
                      key={item.topic.id}
                      topic={item.topic}
                      mastery={item.mastery}
                      isActive={activeTopic === item.topic.id}
                      onClick={onSelectTopic}
                      phase={phase.key}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
