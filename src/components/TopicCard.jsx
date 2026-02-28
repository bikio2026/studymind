import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, BookOpen, Link2, Lightbulb } from 'lucide-react'
import QuizSection from './QuizSection'

const RELEVANCE = {
  core: { label: 'Concepto Central', color: 'text-core', bg: 'bg-core-bg', border: 'border-core/30' },
  supporting: { label: 'Concepto de Soporte', color: 'text-support', bg: 'bg-support-bg', border: 'border-support/30' },
  detail: { label: 'Detalle', color: 'text-detail', bg: 'bg-detail-bg', border: 'border-detail/30' },
}

function CollapsibleSection({ title, icon: Icon, expanded, onToggle, children }) {
  return (
    <div className="border-t border-surface-light/50 mt-4 pt-4">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-text-dim hover:text-text transition-colors"
      >
        <Icon className="w-4 h-4" />
        <span>{title}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 ml-auto" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-auto" />
        )}
      </button>
      {expanded && (
        <div className="mt-3 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  )
}

export default function TopicCard({ topic, onMarkStudied, onQuizScore }) {
  const [expandedSections, setExpandedSections] = useState({
    explanation: false,
    connections: false,
    quiz: false,
  })

  const rel = RELEVANCE[topic.relevance] || RELEVANCE.supporting

  const toggle = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  return (
    <div className={`rounded-xl border ${rel.border} ${rel.bg} p-6 animate-fadeIn`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${rel.color} ${rel.bg} border ${rel.border}`}>
              {rel.label}
            </span>
            {topic.studied && (
              <span className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Estudiado
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold">{topic.sectionTitle}</h2>
        </div>
        {!topic.studied && (
          <button
            onClick={() => onMarkStudied(topic.id)}
            className="text-xs text-text-muted hover:text-success transition-colors px-3 py-1.5 rounded-lg hover:bg-success-bg border border-transparent hover:border-success/20"
          >
            Marcar estudiado
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="mb-4">
        <p className="text-text leading-relaxed text-[15px]">{topic.summary}</p>
      </div>

      {/* Key Concepts */}
      {topic.keyConcepts?.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-text-dim mb-2 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Conceptos Clave
          </h3>
          <div className="flex flex-wrap gap-2">
            {topic.keyConcepts.map((concept, i) => (
              <span
                key={i}
                className="text-xs bg-surface-light/80 px-3 py-1.5 rounded-full text-text-dim"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable: Explanation */}
      <CollapsibleSection
        title="Explicación Expandida"
        icon={BookOpen}
        expanded={expandedSections.explanation}
        onToggle={() => toggle('explanation')}
      >
        <div className="text-text-dim leading-relaxed whitespace-pre-line text-sm">
          {topic.expandedExplanation}
        </div>
      </CollapsibleSection>

      {/* Expandable: Connections */}
      {topic.connections?.length > 0 && (
        <CollapsibleSection
          title="Conexiones con otros temas"
          icon={Link2}
          expanded={expandedSections.connections}
          onToggle={() => toggle('connections')}
        >
          <ul className="space-y-2">
            {topic.connections.map((conn, i) => (
              <li key={i} className="text-text-dim text-sm flex items-start gap-2">
                <span className="text-accent mt-0.5 shrink-0">&bull;</span>
                <span>{conn}</span>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      )}

      {/* Expandable: Quiz */}
      {topic.quiz?.length > 0 && (
        <CollapsibleSection
          title={`Autoevaluación (${topic.quiz.length} preguntas)`}
          icon={CheckCircle}
          expanded={expandedSections.quiz}
          onToggle={() => toggle('quiz')}
        >
          <QuizSection
            questions={topic.quiz}
            onComplete={(score) => onQuizScore(topic.id, score)}
          />
        </CollapsibleSection>
      )}
    </div>
  )
}
