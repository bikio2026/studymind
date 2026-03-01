import { useState, useEffect } from 'react'
import TopicCard from './TopicCard'
import RelevanceFilter from './RelevanceFilter'
import DocumentOutline from './DocumentOutline'
import LearningPath from './LearningPath'
import ProgressDashboard from './ProgressDashboard'
import { ArrowLeft, ArrowRight, AlertCircle, Play, Loader2, BarChart3, List, Route } from 'lucide-react'

export default function StudyGuide({ structure, topics, documentId, documentStatus, onResume, resuming }) {
  const [activeTopic, setActiveTopic] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showDashboard, setShowDashboard] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('outline') // 'outline' | 'path'
  const provider = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('studymind-llm-provider') || 'claude')
    : 'claude'

  // Set first topic as active when topics load
  useEffect(() => {
    if (topics.length > 0 && !activeTopic) {
      setActiveTopic(topics[0].id)
    }
  }, [topics, activeTopic])

  const filteredTopics = filter === 'all'
    ? topics
    : topics.filter(t => t.relevance === filter)

  const currentTopic = topics.find(t => t.id === activeTopic)

  const currentIdx = filteredTopics.findIndex(t => t.id === activeTopic)
  const prevTopic = currentIdx > 0 ? filteredTopics[currentIdx - 1] : null
  const nextTopic = currentIdx < filteredTopics.length - 1 ? filteredTopics[currentIdx + 1] : null

  const totalSections = structure.sections.filter(s => s.level <= 2).length
  const isIncomplete = documentStatus === 'incomplete'

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <div className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-120px)]">
        {/* Sidebar tabs */}
        {topics.length > 0 && (
          <div className="flex mb-2 bg-surface-alt rounded-lg p-0.5">
            <button
              onClick={() => setSidebarTab('outline')}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-md transition-colors ${
                sidebarTab === 'outline'
                  ? 'bg-surface-light text-text font-medium'
                  : 'text-text-muted hover:text-text-dim'
              }`}
            >
              <List className="w-3 h-3" />
              Índice
            </button>
            <button
              onClick={() => setSidebarTab('path')}
              className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-md transition-colors ${
                sidebarTab === 'path'
                  ? 'bg-surface-light text-text font-medium'
                  : 'text-text-muted hover:text-text-dim'
              }`}
            >
              <Route className="w-3 h-3" />
              Ruta
            </button>
          </div>
        )}

        {/* Sidebar content */}
        {sidebarTab === 'outline' ? (
          <DocumentOutline
            structure={structure}
            topics={topics}
            activeTopic={activeTopic}
            onSelectTopic={setActiveTopic}
            documentId={documentId}
          />
        ) : (
          <div className="bg-surface-alt rounded-xl p-4 overflow-y-auto flex-1">
            <LearningPath
              topics={topics}
              activeTopic={activeTopic}
              onSelectTopic={setActiveTopic}
            />
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pr-2">
        {/* Incomplete banner */}
        {isIncomplete && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-text-dim flex-1">
              Documento incompleto: {topics.length} de {totalSections} temas generados
            </span>
            {onResume && (
              <button
                onClick={onResume}
                disabled={resuming}
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80
                  px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/15 border border-accent/20
                  transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {resuming ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Continuar procesando
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Progress Dashboard (collapsible) */}
        {showDashboard && topics.length > 0 && (
          <ProgressDashboard topics={topics} />
        )}

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-surface/95 backdrop-blur-sm py-3 z-10 -mt-1">
          <div className="flex items-center gap-2">
            <RelevanceFilter active={filter} onChange={setFilter} />
            {topics.length > 0 && (
              <button
                onClick={() => setShowDashboard(v => !v)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showDashboard
                    ? 'bg-accent/15 text-accent'
                    : 'hover:bg-surface-alt text-text-muted hover:text-text'
                }`}
                title="Dashboard de progreso"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => prevTopic && setActiveTopic(prevTopic.id)}
              disabled={!prevTopic}
              className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-30 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-text-muted min-w-[60px] text-center">
              {currentIdx >= 0 ? currentIdx + 1 : '—'} / {filteredTopics.length}
            </span>
            <button
              onClick={() => nextTopic && setActiveTopic(nextTopic.id)}
              disabled={!nextTopic}
              className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-30 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Topic card */}
        {currentTopic ? (
          <TopicCard
            key={currentTopic.id}
            topic={currentTopic}
            documentId={documentId}
            bookPage={structure.sections.find(s => s.id === currentTopic.id)?.bookPage}
            provider={provider}
            sections={structure.sections}
            topics={topics}
            onNavigateToTopic={setActiveTopic}
          />
        ) : filteredTopics.length === 0 && filter !== 'all' ? (
          <div className="text-center text-text-muted py-20">
            <p>No hay temas con este nivel de relevancia</p>
            <button
              onClick={() => setFilter('all')}
              className="text-accent text-sm mt-2 hover:underline"
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="text-center text-text-muted py-20">
            <p>Seleccioná un tema del panel lateral</p>
          </div>
        )}
      </div>
    </div>
  )
}
