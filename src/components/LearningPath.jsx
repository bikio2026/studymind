import { Route, ChevronRight, Star, BookOpen, Layers } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { buildLearningPath, getPhaseStats, getNextRecommendation } from '../lib/learningPath'
import { MASTERY_LEVELS } from '../lib/proficiency'

const PHASE_CONFIG = {
  core: { color: 'text-core', bg: 'bg-core-bg', border: 'border-core/30', icon: Star },
  supporting: { color: 'text-support', bg: 'bg-support-bg', border: 'border-support/30', icon: BookOpen },
  detail: { color: 'text-detail', bg: 'bg-detail-bg', border: 'border-detail/30', icon: Layers },
}

function PathNode({ item, isActive, onClick }) {
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
      {/* Mastery dot */}
      <div className={`w-3 h-3 rounded-full shrink-0 ${
        item.mastery === 'sin-empezar' ? 'bg-text-muted/20' :
        item.mastery === 'visto' ? 'bg-blue-400' :
        item.mastery === 'aprendiendo' ? 'bg-amber-400' :
        item.mastery === 'dominado' ? 'bg-emerald-400' :
        'bg-accent'
      }`} />

      {/* Title */}
      <span className={`text-xs truncate flex-1 ${
        isActive ? 'text-accent font-medium' : 'text-text-dim'
      }`}>
        {item.topic.sectionTitle}
      </span>

      {/* Mastery label */}
      <span className={`text-[10px] ${masteryInfo.color} shrink-0`}>
        {item.mastery !== 'sin-empezar' ? masteryInfo.label : ''}
      </span>
    </button>
  )
}

export default function LearningPath({ topics, activeTopic, onSelectTopic }) {
  const progress = useProgressStore(s => s.progress)
  const path = buildLearningPath(topics, progress)
  const phases = getPhaseStats(topics, progress)
  const recommendation = getNextRecommendation(topics, progress, activeTopic)

  if (path.length === 0) return null

  // Group by phase
  const grouped = {}
  for (const item of path) {
    if (!grouped[item.phase]) grouped[item.phase] = []
    grouped[item.phase].push(item)
  }

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
            <span className="text-[11px] font-medium text-accent">Próximo recomendado</span>
            <ChevronRight className="w-3 h-3 text-accent/50 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </div>
          <p className="text-xs text-text-dim truncate">{recommendation.topic.sectionTitle}</p>
          <p className="text-[10px] text-text-muted mt-0.5">{recommendation.reason}</p>
        </button>
      )}

      {/* Phase progress bars */}
      <div className="space-y-2">
        {phases.map(phase => {
          const conf = PHASE_CONFIG[phase.key]
          const PhaseIcon = conf.icon
          return (
            <div key={phase.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <PhaseIcon className={`w-3 h-3 ${conf.color}`} />
                  <span className={`text-[11px] font-medium ${conf.color}`}>{phase.label}</span>
                </div>
                <span className="text-[10px] text-text-muted">
                  {phase.mastered}/{phase.total}
                </span>
              </div>
              <div className="h-1.5 bg-surface-light/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    phase.key === 'core' ? 'bg-core' :
                    phase.key === 'supporting' ? 'bg-support' :
                    'bg-detail'
                  }`}
                  style={{ width: `${phase.pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Path nodes by phase */}
      {Object.entries(grouped).map(([phase, items]) => {
        const conf = PHASE_CONFIG[phase]
        const PhaseIcon = conf.icon
        return (
          <div key={phase}>
            <div className={`flex items-center gap-1.5 mb-1 px-1`}>
              <PhaseIcon className={`w-3 h-3 ${conf.color}`} />
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${conf.color}`}>
                {items[0].phaseLabel}
              </span>
            </div>
            <div className="space-y-0.5 relative">
              {/* Vertical line connecting nodes */}
              <div className="absolute left-[17px] top-2 bottom-2 w-px bg-surface-light/50" />
              {items.map(item => (
                <PathNode
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
