import { useState, useEffect } from 'react'
import TopicCard from './TopicCard'
import RelevanceFilter from './RelevanceFilter'
import DocumentOutline from './DocumentOutline'
import { ArrowLeft, ArrowRight } from 'lucide-react'

export default function StudyGuide({ structure, topics, onMarkStudied, onQuizScore }) {
  const [activeTopic, setActiveTopic] = useState(null)
  const [filter, setFilter] = useState('all')

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

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">
      {/* Sidebar */}
      <DocumentOutline
        structure={structure}
        topics={topics}
        activeTopic={activeTopic}
        onSelectTopic={setActiveTopic}
      />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto pr-2">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-surface/95 backdrop-blur-sm py-3 z-10 -mt-1">
          <RelevanceFilter active={filter} onChange={setFilter} />
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
            onMarkStudied={onMarkStudied}
            onQuizScore={onQuizScore}
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
