import { BookOpen, CheckCircle, Circle, ChevronRight, HelpCircle } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'

export default function DocumentOutline({ structure, topics, activeTopic, onSelectTopic, documentId }) {
  if (!structure) return null

  const progress = useProgressStore(s => s.progress)

  const getTopicData = (sectionId) => topics.find(t => t.id === sectionId)

  const relevanceColor = (rel) => {
    if (rel === 'core') return 'text-core'
    if (rel === 'supporting') return 'text-support'
    return 'text-detail'
  }

  // Calculate stats from progressStore (not from topic objects)
  const studied = topics.filter(t => progress[t.id]?.studied).length
  const quizzedScores = topics
    .map(t => progress[t.id]?.quizScores)
    .filter(scores => scores && scores.length > 0)
    .map(scores => scores[scores.length - 1].score)
  const avgScore = quizzedScores.length > 0
    ? Math.round(quizzedScores.reduce((sum, s) => sum + s, 0) / quizzedScores.length)
    : null

  return (
    <div className="w-72 shrink-0 bg-surface-alt rounded-xl p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
      {/* Document title */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-light">
        <BookOpen className="w-4 h-4 text-accent shrink-0" />
        <h2 className="text-sm font-semibold truncate" title={structure.title}>
          {structure.title}
        </h2>
      </div>

      {/* Sections */}
      <nav className="space-y-0.5">
        {structure.sections.filter(s => s.level <= 2).map((section) => {
          const topic = getTopicData(section.id)
          const isActive = activeTopic === section.id
          const isGenerated = !!topic

          return (
            <button
              key={section.id}
              onClick={() => isGenerated && onSelectTopic(section.id)}
              className={`
                w-full text-left px-3 py-2 rounded-lg text-sm transition-all
                ${section.level === 2 ? 'pl-7 text-xs' : ''}
                ${isActive
                  ? 'bg-accent/15 text-accent'
                  : isGenerated
                    ? 'hover:bg-surface-light/50 text-text-dim hover:text-text'
                    : 'text-text-muted/40 cursor-default'}
              `}
            >
              <div className="flex items-center gap-2">
                {progress[section.id]?.studied ? (
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                ) : isGenerated ? (
                  <Circle className={`w-3.5 h-3.5 shrink-0 ${relevanceColor(topic?.relevance)}`} />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-text-muted/20 shrink-0" />
                )}
                <span className="truncate">{section.title}</span>
                {section.bookPage && (
                  <span className="text-[10px] text-text-muted/50 shrink-0 font-mono" title={`Página ${section.bookPage} del libro`}>
                    p.{section.bookPage}
                  </span>
                )}
                {!isGenerated && (
                  <span className="ml-auto shrink-0 relative group/tip">
                    <HelpCircle className="w-3 h-3 text-text-muted/40 cursor-help" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1
                      text-[10px] leading-tight bg-surface border border-surface-light rounded-md shadow-lg
                      whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity
                      pointer-events-none z-30 text-text-muted">
                      Sin texto suficiente para generar guía
                    </span>
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 ml-auto shrink-0 text-accent" />}
              </div>
            </button>
          )
        })}
      </nav>

      {/* Stats */}
      {topics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-light space-y-1.5 text-xs text-text-muted">
          <div className="flex justify-between">
            <span>Temas</span>
            <span className="text-text-dim">{topics.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Estudiados</span>
            <span className="text-text-dim">{studied} / {topics.length}</span>
          </div>
          {avgScore !== null && (
            <div className="flex justify-between">
              <span>Promedio quiz</span>
              <span className="text-text-dim">{avgScore}%</span>
            </div>
          )}
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-surface-light rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${topics.length > 0 ? (studied / topics.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
