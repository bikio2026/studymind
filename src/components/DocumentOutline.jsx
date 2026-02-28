import { BookOpen, CheckCircle, Circle, ChevronRight } from 'lucide-react'

export default function DocumentOutline({ structure, topics, activeTopic, onSelectTopic }) {
  if (!structure) return null

  const getTopicData = (sectionId) => topics.find(t => t.id === sectionId)

  const relevanceColor = (rel) => {
    if (rel === 'core') return 'text-core'
    if (rel === 'supporting') return 'text-support'
    return 'text-detail'
  }

  const studied = topics.filter(t => t.studied).length
  const quizzed = topics.filter(t => t.quizScore !== null)
  const avgScore = quizzed.length > 0
    ? Math.round(quizzed.reduce((sum, t) => sum + t.quizScore, 0) / quizzed.length)
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
                {topic?.studied ? (
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                ) : isGenerated ? (
                  <Circle className={`w-3.5 h-3.5 shrink-0 ${relevanceColor(topic?.relevance)}`} />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-text-muted/20 shrink-0" />
                )}
                <span className="truncate">{section.title}</span>
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
