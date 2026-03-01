import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, CheckCircle, BookOpen, Link2, Lightbulb, AlertTriangle, MessageCircle, FileText } from 'lucide-react'
import QuizSection from './QuizSection'
import ChatSection from './ChatSection'
import ConnectionLink from './ConnectionLink'
import SourceTextViewer from './SourceTextViewer'
import { enrichConnections } from '../lib/connectionParser'
import { useProgressStore } from '../stores/progressStore'

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

export default function TopicCard({ topic, documentId, bookPage, provider, sections, topics, onNavigateToTopic }) {
  const [expandedSections, setExpandedSections] = useState({
    sourceText: false,
    explanation: false,
    connections: false,
    quiz: false,
    chat: false,
  })

  const topicProgress = useProgressStore(s => s.progress[topic.id])
  const markStudied = useProgressStore(s => s.markStudied)
  const saveQuizScore = useProgressStore(s => s.saveQuizScore)

  const isStudied = topicProgress?.studied || false
  const rel = RELEVANCE[topic.relevance] || RELEVANCE.supporting

  // Enrich connections with navigation data
  const enrichedConnections = useMemo(
    () => enrichConnections(topic.connections, sections, topics),
    [topic.connections, sections, topics]
  )

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
            {isStudied && (
              <span className="text-xs text-success flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Estudiado
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold">
            {topic.sectionTitle}
            {bookPage && (
              <span className="text-sm font-normal text-text-muted/50 font-mono ml-2" title={`Página ${bookPage} del libro`}>
                p.{bookPage}
              </span>
            )}
          </h2>
        </div>
        {!isStudied && (
          <button
            onClick={() => markStudied(documentId, topic.id)}
            className="text-xs text-text-muted hover:text-success transition-colors px-3 py-1.5 rounded-lg hover:bg-success-bg border border-transparent hover:border-success/20"
          >
            Marcar estudiado
          </button>
        )}
      </div>

      {/* Low confidence warning */}
      {topic.confidence === 'low' && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-500/80 bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>El texto de esta sección se extrajo por coincidencia aproximada. El contenido podría no ser completamente preciso.</span>
        </div>
      )}

      {/* Summary */}
      <div className="mb-4">
        <p className="text-text leading-relaxed text-[15px]">{topic.summary}</p>
      </div>

      {/* Source Text Viewer */}
      {sections?.length > 0 && (
        <CollapsibleSection
          title="Texto Original del PDF"
          icon={FileText}
          expanded={expandedSections.sourceText}
          onToggle={() => toggle('sourceText')}
        >
          <SourceTextViewer
            documentId={documentId}
            topicId={topic.id}
            sections={sections}
          />
        </CollapsibleSection>
      )}

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
      {enrichedConnections.length > 0 && (
        <CollapsibleSection
          title="Conexiones con otros temas"
          icon={Link2}
          expanded={expandedSections.connections}
          onToggle={() => toggle('connections')}
        >
          <ul className="space-y-2">
            {enrichedConnections.map((conn, i) => (
              <ConnectionLink
                key={i}
                connection={conn}
                onNavigate={onNavigateToTopic}
              />
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
            onComplete={(score) => saveQuizScore(documentId, topic.id, score)}
          />
        </CollapsibleSection>
      )}

      {/* Expandable: Chat (Socratic Tutor) */}
      <CollapsibleSection
        title="Tutor Socrático"
        icon={MessageCircle}
        expanded={expandedSections.chat}
        onToggle={() => toggle('chat')}
      >
        <ChatSection
          topic={topic}
          documentId={documentId}
          provider={provider}
        />
      </CollapsibleSection>
    </div>
  )
}
