import { useState, useMemo } from 'react'
import { BookOpen, ChevronDown, ChevronRight } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { getMasteryLevel, MASTERY_LEVELS, getDocumentStats } from '../lib/proficiency'
import { useTranslation } from '../lib/useTranslation'

// Relevance badge styles
const RELEVANCE = {
  core: { labelKey: 'filter.core', cls: 'text-accent bg-accent/10 border-accent/20' },
  supporting: { labelKey: 'filter.supporting', cls: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  detail: { labelKey: 'filter.detail', cls: 'text-text-muted bg-surface-light border-surface-light/80' },
}

// Mastery dot styles
const MASTERY_DOT = {
  'sin-empezar': 'border-2 border-text-muted/30',
  visto: 'bg-blue-400',
  aprendiendo: 'bg-amber-400',
  dominado: 'bg-emerald-400',
  experto: 'bg-accent',
}

// Single topic item — always visible, always clickable
function TopicItem({ topic, section, isActive, mastery, onClick }) {
  const { t } = useTranslation()
  const rel = RELEVANCE[topic.relevance] || RELEVANCE.detail
  const dotCls = MASTERY_DOT[mastery] || MASTERY_DOT['sin-empezar']

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all
        ${isActive
          ? 'bg-accent/15 text-accent'
          : 'hover:bg-surface-light/50 text-text-dim hover:text-text'
        }`}
    >
      <div className="flex items-start gap-2.5">
        {/* Mastery dot */}
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 ${dotCls}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1.5">
            <span className="text-[13px] leading-snug line-clamp-2">
              {section?.title || topic.sectionTitle}
            </span>
            {isActive && <ChevronRight className="w-3 h-3 shrink-0 mt-0.5 text-accent" />}
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* Relevance badge */}
            <span className={`text-[9px] font-medium uppercase tracking-wide px-1.5 py-px rounded border ${rel.cls}`}>
              {t(rel.labelKey)}
            </span>

            {/* Book page */}
            {section?.bookPage && (
              <span className="text-[10px] text-text-muted/50 font-mono">
                p.{section.bookPage}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}

// Unprocessed section item — disabled, grayed out
function UnprocessedItem({ section }) {
  const { t } = useTranslation()
  return (
    <div
      className="w-full text-left px-3 py-2.5 rounded-lg opacity-40 cursor-default"
      title={t('outline.expandToProcess')}
    >
      <div className="flex items-start gap-2.5">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 border border-text-muted/20 border-dashed" />
        <div className="flex-1 min-w-0">
          <span className="text-[13px] leading-snug line-clamp-2 text-text-muted">
            {section.title}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-medium uppercase tracking-wide px-1.5 py-px rounded border text-text-muted/50 bg-surface-light/30 border-surface-light/40">
              {t('outline.unprocessed')}
            </span>
            {section.bookPage && (
              <span className="text-[10px] text-text-muted/30 font-mono">
                p.{section.bookPage}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Collapsible chapter group (for multi-chapter mode)
function ChapterGroup({ title, children, defaultExpanded = true, topicCount, masteredCount }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-3 py-2 flex items-center gap-2
          hover:bg-surface-light/30 rounded-lg transition-colors"
      >
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200
          ${expanded ? '' : '-rotate-90'}`}
        />
        <span className="text-xs font-semibold text-text-dim truncate flex-1">
          {title}
        </span>
        <span className="text-[10px] text-text-muted/50 shrink-0">
          {masteredCount}/{topicCount}
        </span>
      </button>
      {expanded && (
        <div className="ml-1 animate-fadeIn">
          {children}
        </div>
      )}
    </div>
  )
}

export default function DocumentOutline({ structure, topics, activeTopic, onSelectTopic, bookStructure, processedSectionIds }) {
  if (!structure) return null

  const { t } = useTranslation()
  const progress = useProgressStore(s => s.progress)
  const stats = getDocumentStats(topics, progress)

  const hasBookView = bookStructure?.sections?.length > 0

  // Book-wide sections: show all book sections, mark processed vs unprocessed
  const bookSections = useMemo(() => {
    if (!hasBookView) return []
    const topicIdSet = new Set(topics.map(t => String(t.id)))
    return (bookStructure.sections || [])
      .filter(s => (s.level || 1) <= 2)
      .map(s => ({
        section: s,
        isProcessed: processedSectionIds?.has(s.id),
        // Find matching topic in current document
        topic: topics.find(t => String(t.id) === String(s.id)),
        isInCurrentDoc: topicIdSet.has(String(s.id)),
      }))
  }, [hasBookView, bookStructure, processedSectionIds, topics])

  // Only show book sections panel when there are sections from OTHER imports
  const hasOtherImportSections = bookSections.some(s => s.isProcessed && !s.isInCurrentDoc)

  // Group topics by their root chapter ancestor
  const { groups, isSingleGroup } = useMemo(() => {
    // Use string keys for safe matching (IDB may store string IDs)
    const sectionMap = new Map(structure.sections.map(s => [String(s.id), s]))

    function getRootAncestor(sectionId) {
      let s = sectionMap.get(String(sectionId))
      const visited = new Set()
      while (s?.parentId && sectionMap.has(String(s.parentId))) {
        if (visited.has(String(s.parentId))) break // cycle detection
        visited.add(String(s.parentId))
        s = sectionMap.get(String(s.parentId))
      }
      return s
    }

    const groupMap = new Map()
    for (const topic of topics) {
      const section = sectionMap.get(String(topic.id))
      const root = getRootAncestor(topic.id)
      const key = root?.id ?? '_root'

      if (!groupMap.has(key)) {
        groupMap.set(key, { chapter: root, items: [] })
      }
      groupMap.get(key).items.push({ topic, section })
    }

    const groups = [...groupMap.values()]
      .sort((a, b) => (a.chapter?.pageStart || 0) - (b.chapter?.pageStart || 0))
    // Sort items within each group by page
    for (const g of groups) {
      g.items.sort((a, b) => (a.section?.pageStart || 0) - (b.section?.pageStart || 0))
    }
    return { groups, isSingleGroup: groups.length <= 1 }
  }, [structure.sections, topics])

  const masteredCount = stats.byMastery.dominado + stats.byMastery.experto
  const masteryPct = stats.total > 0 ? Math.round((masteredCount / stats.total) * 100) : 0

  return (
    <div className="w-full bg-surface-alt rounded-xl p-4 overflow-y-auto flex-1">
      {/* Document title + book badge */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-light">
        <BookOpen className="w-4 h-4 text-accent shrink-0" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold line-clamp-2" title={hasBookView ? bookStructure.title : structure.title}>
            {hasBookView ? bookStructure.title : structure.title}
          </h2>
          {hasOtherImportSections && (
            <p className="text-[10px] text-text-muted mt-0.5">
              {t('outline.sectionsCount', { n: bookSections.filter(s => s.isProcessed || s.isInCurrentDoc).length, total: bookSections.filter(s => s.section.level >= 2).length })}
            </p>
          )}
        </div>
      </div>

      {/* Introduction item */}
      <button
        onClick={() => onSelectTopic('__intro__')}
        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all mb-2 ${
          activeTopic === '__intro__'
            ? 'bg-accent/15 text-accent'
            : 'hover:bg-surface-light/50 text-text-dim hover:text-text'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[13px] font-medium">{t('guide.intro')}</span>
          {activeTopic === '__intro__' && <ChevronRight className="w-3 h-3 shrink-0 ml-auto text-accent" />}
        </div>
      </button>

      {/* Book-wide section view (only when there are sections from other imports) */}
      {hasOtherImportSections && (
        <div className="mb-3 pb-3 border-b border-surface-light/50">
          <p className="text-[10px] text-text-dim uppercase tracking-wider font-medium mb-2 px-2">
            {t('outline.bookSections')}
          </p>
          <div className="space-y-0.5">
            {bookSections.map(({ section, isProcessed, topic, isInCurrentDoc }) => {
              if (isInCurrentDoc && topic) {
                // This section is in the current document — render as normal topic
                return (
                  <TopicItem
                    key={`book-${section.id}`}
                    topic={topic}
                    section={section}
                    isActive={activeTopic === topic.id}
                    mastery={getMasteryLevel(progress[topic.id])}
                    onClick={() => onSelectTopic(topic.id)}
                  />
                )
              }
              if (isProcessed) {
                // Processed in another import — show with indicator
                return (
                  <div
                    key={`book-${section.id}`}
                    className="w-full text-left px-3 py-2 rounded-lg opacity-60"
                    title={t('outline.processedOtherImport')}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1 bg-amber-400/60" />
                      <div className="flex-1 min-w-0">
                        <span className="text-[12px] leading-snug line-clamp-1 text-text-muted">
                          {section.title}
                        </span>
                        <span className="text-[9px] text-amber-500/60 mt-0.5 block">{t('outline.otherImport')}</span>
                      </div>
                    </div>
                  </div>
                )
              }
              // Not processed — disabled
              return <UnprocessedItem key={`book-${section.id}`} section={section} />
            })}
          </div>
        </div>
      )}

      {/* Topic navigation (current document topics) */}
      <nav className="space-y-0.5">
        {hasOtherImportSections && topics.length > 0 && (
          <p className="text-[10px] text-text-dim uppercase tracking-wider font-medium mb-2 px-2">
            {t('outline.thisImport')}
          </p>
        )}
        {topics.length === 0 ? (
          <p className="text-xs text-text-muted/60 text-center py-4">
            {t('outline.processingTopics')}
          </p>
        ) : isSingleGroup ? (
          // Single chapter: flat list of topics
          (groups[0]?.items || []).map(({ topic, section }) => (
            <TopicItem
              key={topic.id}
              topic={topic}
              section={section}
              isActive={activeTopic === topic.id}
              mastery={getMasteryLevel(progress[topic.id])}
              onClick={() => onSelectTopic(topic.id)}
            />
          ))
        ) : (
          // Multi-chapter: collapsible groups
          groups.map(group => {
            const groupMastered = group.items.filter(({ topic }) => {
              const m = getMasteryLevel(progress[topic.id])
              return m === 'dominado' || m === 'experto'
            }).length

            return (
              <ChapterGroup
                key={group.chapter?.id || '_root'}
                title={group.chapter?.title || t('outline.general')}
                topicCount={group.items.length}
                masteredCount={groupMastered}
              >
                {group.items.map(({ topic, section }) => (
                  <TopicItem
                    key={topic.id}
                    topic={topic}
                    section={section}
                    isActive={activeTopic === topic.id}
                    mastery={getMasteryLevel(progress[topic.id])}
                    onClick={() => onSelectTopic(topic.id)}
                  />
                ))}
              </ChapterGroup>
            )
          })
        )}
      </nav>

      {/* Stats footer */}
      {topics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-light space-y-1.5 text-xs text-text-muted">
          <div className="flex justify-between">
            <span>{t('outline.mastered')}</span>
            <span className="text-text-dim">{masteredCount} / {topics.length}</span>
          </div>

          {/* Mastery stacked bar */}
          <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden flex">
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
                  title={`${t('mastery.' + key)}: ${stats.byMastery[key]}`}
                />
              )
            })}
          </div>
          <div className="text-[10px] text-text-muted/60 text-center">
            {masteryPct}{t('outline.masteredPct')}
          </div>
        </div>
      )}
    </div>
  )
}
