import { BookOpen, ChevronRight, HelpCircle } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { getMasteryLevel, MASTERY_LEVELS, getDocumentStats } from '../lib/proficiency'

// Mini SVG ring to show mastery level
function MasteryRing({ mastery, size = 14 }) {
  const info = MASTERY_LEVELS[mastery]
  const r = (size - 2) / 2
  const circumference = 2 * Math.PI * r
  // Fill percentage based on mastery order
  const fillPct = info.order / 4

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={2}
        className={info.ring}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={2}
        className={info.fill}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fillPct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

export default function DocumentOutline({ structure, topics, activeTopic, onSelectTopic, documentId }) {
  if (!structure) return null

  const progress = useProgressStore(s => s.progress)

  const getTopicData = (sectionId) => topics.find(t => t.id === sectionId)

  const stats = getDocumentStats(topics, progress)

  // Mastery-based progress: count dominado + experto
  const masteredCount = stats.byMastery.dominado + stats.byMastery.experto
  const masteryPct = stats.total > 0 ? Math.round((masteredCount / stats.total) * 100) : 0

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
          const mastery = isGenerated ? getMasteryLevel(progress[section.id]) : 'sin-empezar'

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
                {isGenerated ? (
                  <MasteryRing mastery={mastery} />
                ) : (
                  <svg width={14} height={14} className="shrink-0">
                    <circle cx={7} cy={7} r={6} fill="none" strokeWidth={2} className="stroke-text-muted/20" />
                  </svg>
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
            <span>Dominados</span>
            <span className="text-text-dim">{masteredCount} / {topics.length}</span>
          </div>
          {stats.avgProficiency > 0 && (
            <div className="flex justify-between">
              <span>Proficiencia</span>
              <span className="text-text-dim">{stats.avgProficiency}%</span>
            </div>
          )}
          {stats.quizzesTaken > 0 && (
            <div className="flex justify-between">
              <span>Quizzes</span>
              <span className="text-text-dim">{stats.quizzesTaken} intentos</span>
            </div>
          )}
          {/* Mastery stacked bar */}
          <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden mt-2 flex">
            {['experto', 'dominado', 'aprendiendo', 'visto'].map(key => {
              const pct = stats.total > 0 ? (stats.byMastery[key] / stats.total) * 100 : 0
              if (pct === 0) return null
              const bgMap = {
                experto: 'bg-accent',
                dominado: 'bg-emerald-400',
                aprendiendo: 'bg-amber-400',
                visto: 'bg-blue-400',
              }
              return (
                <div
                  key={key}
                  className={`h-full ${bgMap[key]} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${MASTERY_LEVELS[key].label}: ${stats.byMastery[key]}`}
                />
              )
            })}
          </div>
          <div className="text-[10px] text-text-muted/60 text-center mt-1">
            {masteryPct}% dominado
          </div>
        </div>
      )}
    </div>
  )
}
