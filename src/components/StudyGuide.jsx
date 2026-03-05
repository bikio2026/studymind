import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import TopicCard from './TopicCard'
import BookIntro from './BookIntro'
import RelevanceFilter from './RelevanceFilter'
import DocumentOutline from './DocumentOutline'
import LearningPath from './LearningPath'
import ConnectionGraph from './ConnectionGraph'
import ProgressDashboard from './ProgressDashboard'
import BookCoverageBar from './BookCoverageBar'
import { ArrowLeft, ArrowRight, AlertCircle, Play, Loader2, BarChart3, List, Route, Network, PlusCircle, FileDown, Paperclip, Menu, X, BookOpen, Settings } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'
import FeatureSettings from './FeatureSettings'
import TutorObservations from './TutorObservations'
import { useFeatureStore } from '../stores/featureStore'

export default function StudyGuide({ structure, topics, documentId, documentStatus, onResume, resuming, bookData, onExpandCoverage, onDownloadPDF, pdfAvailable, onLinkPDF, onNavigateToDocument, language, onHeaderVisibilityChange }) {
  const { t } = useTranslation()
  const [activeTopic, setActiveTopic] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showDashboard, setShowDashboard] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('outline') // 'outline' | 'path'
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHint, setSidebarHint] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return !localStorage.getItem('studymind-sidebar-used')
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showTutor, setShowTutor] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const loadFeatures = useFeatureStore(s => s.load)
  const provider = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('studymind-llm-provider') || 'claude')
    : 'claude'

  // Load feature toggles + tutor notes for this document
  useEffect(() => { loadFeatures(documentId) }, [documentId, loadFeatures])

  // Auto-hide header on mobile scroll down
  const scrollRef = useRef(null)
  const lastScrollY = useRef(0)
  useEffect(() => {
    if (!onHeaderVisibilityChange) return
    const handleScroll = () => {
      if (window.innerWidth >= 768) {
        // Desktop: use scrollRef (inner scroll container)
        const el = scrollRef.current
        if (!el) return
        onHeaderVisibilityChange(false)
        lastScrollY.current = el.scrollTop
        return
      }
      // Mobile: use window scroll (single page scroll)
      const y = window.scrollY
      if (y > lastScrollY.current + 15 && y > 60) {
        onHeaderVisibilityChange(true)
      } else if (y < lastScrollY.current - 10) {
        onHeaderVisibilityChange(false)
      }
      lastScrollY.current = y
    }
    // Listen to both to handle rotation between mobile/desktop
    window.addEventListener('scroll', handleScroll, { passive: true })
    const el = scrollRef.current
    if (el) el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (el) el.removeEventListener('scroll', handleScroll)
    }
  }, [onHeaderVisibilityChange])

  // Reset scroll position when active topic changes
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0
    window.scrollTo(0, 0) // mobile uses window scroll
  }, [activeTopic])

  // Sort topics by their position in the book structure
  const sortedTopics = useMemo(() => {
    if (!topics.length || !structure?.sections?.length) return topics
    const sectionOrder = {}
    structure.sections.forEach((s, i) => { sectionOrder[s.id] = i })
    return [...topics].sort((a, b) => {
      return (sectionOrder[a.id] ?? 999) - (sectionOrder[b.id] ?? 999)
    })
  }, [topics, structure])

  const INTRO_ID = '__intro__'
  const isIntro = activeTopic === INTRO_ID

  // Set intro as initial view, or fallback if activeTopic is invalid
  useEffect(() => {
    if (sortedTopics.length === 0) return
    if (!activeTopic) {
      setActiveTopic(INTRO_ID)
    } else if (activeTopic !== INTRO_ID && !sortedTopics.find(t => t.id === activeTopic)) {
      setActiveTopic(INTRO_ID)
    }
  }, [sortedTopics, activeTopic])

  const filteredTopics = filter === 'all'
    ? sortedTopics
    : sortedTopics.filter(t => t.relevance === filter)

  const currentTopic = sortedTopics.find(t => t.id === activeTopic)

  // Navigation: intro is before the first topic
  const currentIdx = isIntro ? -1 : filteredTopics.findIndex(t => t.id === activeTopic)
  const prevTopic = isIntro ? null : (currentIdx <= 0 ? { id: INTRO_ID } : filteredTopics[currentIdx - 1])
  const nextTopic = isIntro ? (filteredTopics[0] || null) : (currentIdx < filteredTopics.length - 1 ? filteredTopics[currentIdx + 1] : null)

  const totalSections = structure.sections.filter(s => s.level <= 2).length
  const isIncomplete = documentStatus === 'incomplete'

  // Close sidebar overlay when a topic is selected (mobile)
  const handleSelectTopic = (topicId) => {
    setActiveTopic(topicId)
    setSidebarOpen(false)
  }

  return (
    <div className="md:flex md:gap-4 flex-1 min-h-0 relative overflow-x-clip md:overflow-x-hidden">
      {/* Sidebar — full screen opaque on mobile, side panel on desktop */}
      <div className={`
        flex flex-col shrink-0
        md:w-60 lg:w-72 md:max-h-full
        ${sidebarOpen
          ? 'fixed inset-0 z-50 bg-surface md:relative md:inset-auto md:z-auto md:bg-transparent'
          : 'max-md:hidden'
        }
      `}>
        {/* Mobile header bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-light md:hidden shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-accent" />
            <span className="text-sm font-semibold text-text">{t('guide.outline')}</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar inner container */}
        <div className="flex-1 overflow-y-auto flex flex-col px-4 pt-3 md:px-0 md:pt-0">
          {/* Sidebar tabs */}
          {sortedTopics.length > 0 && (
            <div className="flex mb-2 bg-surface-alt rounded-lg p-0.5 shrink-0 mx-4 mt-4 md:mx-0 md:mt-0">
              <button
                onClick={() => setSidebarTab('outline')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-md transition-colors ${
                  sidebarTab === 'outline'
                    ? 'bg-surface-light text-text font-medium'
                    : 'text-text-muted hover:text-text-dim'
                }`}
              >
                <List className="w-3 h-3" />
                {t('guide.outline')}
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
                {t('guide.path')}
              </button>
              <button
                onClick={() => setSidebarTab('graph')}
                className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] py-1.5 rounded-md transition-colors ${
                  sidebarTab === 'graph'
                    ? 'bg-surface-light text-text font-medium'
                    : 'text-text-muted hover:text-text-dim'
                }`}
              >
                <Network className="w-3 h-3" />
                {t('guide.graph')}
              </button>
            </div>
          )}

          {/* Sidebar content */}
          <div className="flex-1 overflow-y-auto md:overflow-visible">
            {sidebarTab === 'outline' ? (
              <DocumentOutline
                structure={structure}
                topics={sortedTopics}
                activeTopic={activeTopic}
                onSelectTopic={handleSelectTopic}
                documentId={documentId}
                bookStructure={bookData?.book?.structure}
                processedSectionIds={bookData?.processedSectionIds}
              />
            ) : sidebarTab === 'path' ? (
              <div className="bg-surface-alt rounded-xl p-4 overflow-y-auto flex-1">
                <LearningPath
                  topics={sortedTopics}
                  activeTopic={activeTopic}
                  onSelectTopic={handleSelectTopic}
                />
              </div>
            ) : (
              <div className="bg-surface-alt rounded-xl p-3 flex-1 min-h-[300px]">
                <ConnectionGraph
                  topics={sortedTopics}
                  sections={structure.sections}
                  activeTopic={activeTopic}
                  onSelectTopic={(id) => { handleSelectTopic(id); setSidebarTab('outline') }}
                  allBookTopics={bookData?.bookTopics}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div ref={scrollRef} className="md:flex-1 md:overflow-y-auto overflow-x-clip md:overflow-x-hidden pr-2">
        {/* Incomplete banner */}
        {isIncomplete && (
          <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/15 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-sm text-text-dim flex-1">
              {t('guide.incomplete', { current: sortedTopics.length, total: totalSections })}
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
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    {t('guide.resume')}
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Book coverage bar */}
        {bookData?.book && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-surface-alt border border-surface-light/30">
            <BookCoverageBar
              bookStructure={bookData.book.structure}
              processedSectionIds={bookData.processedSectionIds}
              variant="expanded"
              totalPages={bookData.book.totalPages}
            />
            <div className="flex items-center gap-2 mt-2.5 flex-wrap">
              {onExpandCoverage && (() => {
                const allSections = (bookData.book.structure?.sections || []).filter(s => (s.level || 1) <= 2)
                const parentIds = new Set(allSections.filter(s => s.parentId).map(s => String(s.parentId)))
                const leafCount = allSections.filter(s => !parentIds.has(String(s.id))).length
                return bookData.processedSectionIds?.size < leafCount
              })() && (
                <button
                  onClick={onExpandCoverage}
                  className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent/80
                    px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/15 border border-accent/20
                    transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {t('guide.expandCoverage')}
                </button>
              )}
              {pdfAvailable && onDownloadPDF && (
                <button
                  onClick={onDownloadPDF}
                  className="flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300
                    px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20
                    transition-colors"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  {t('pdf.download')}
                </button>
              )}
              {!pdfAvailable && onLinkPDF && (
                <button
                  onClick={onLinkPDF}
                  className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text
                    px-3 py-1.5 rounded-lg bg-surface-light/30 hover:bg-surface-light/50 border border-surface-light/30
                    transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  {t('pdf.link')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Dashboard (collapsible) */}
        {showDashboard && sortedTopics.length > 0 && (
          <ProgressDashboard topics={sortedTopics} />
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-y-2 mb-4 sticky top-0 bg-surface/95 backdrop-blur-sm py-3 z-10 -mt-1">
          <div className="flex items-center gap-2">
            {/* Mobile sidebar toggle */}
            <button
              onClick={() => {
                setSidebarOpen(true)
                if (sidebarHint) {
                  setSidebarHint(false)
                  localStorage.setItem('studymind-sidebar-used', '1')
                }
              }}
              className={`md:hidden p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text transition-colors ${
                sidebarHint ? 'animate-pulse ring-2 ring-accent/40 text-accent' : ''
              }`}
              title={t('guide.openSidebar')}
            >
              <Menu className="w-4 h-4" />
            </button>
            <RelevanceFilter active={filter} onChange={setFilter} />
            {sortedTopics.length > 0 && (
              <button
                onClick={() => setShowDashboard(v => !v)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showDashboard
                    ? 'bg-accent/15 text-accent'
                    : 'hover:bg-surface-alt text-text-muted hover:text-text'
                }`}
                title={t('guide.progressDashboard')}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setShowMapModal(true)}
              className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
              title={t('guide.connectionMap')}
            >
              <Network className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 rounded-lg hover:bg-surface-alt text-text-muted hover:text-text transition-colors"
              title={t('features.title')}
            >
              <Settings className="w-4 h-4" />
            </button>
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
              {isIntro ? t('guide.intro') : currentIdx >= 0 ? `${currentIdx + 1} / ${filteredTopics.length}` : '—'}
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

        {/* Content: Intro or Topic card */}
        {isIntro ? (
          <BookIntro
            structure={structure}
            topics={sortedTopics}
            documentId={documentId}
            language={language}
            provider={provider}
            onNavigateToTopic={setActiveTopic}
          />
        ) : currentTopic ? (
          <TopicCard
            key={currentTopic.id}
            topic={currentTopic}
            documentId={documentId}
            bookPage={structure.sections.find(s => s.id === currentTopic.id)?.bookPage}
            provider={provider}
            language={language}
            sections={structure.sections}
            topics={sortedTopics}
            onNavigateToTopic={setActiveTopic}
            allBookTopics={bookData?.bookTopics}
            onNavigateToDocument={onNavigateToDocument}
          />
        ) : filteredTopics.length === 0 && filter !== 'all' ? (
          <div className="text-center text-text-muted py-20">
            <p>{t('guide.noTopicsFilter')}</p>
            <button
              onClick={() => setFilter('all')}
              className="text-accent text-sm mt-2 hover:underline"
            >
              {t('guide.viewAll')}
            </button>
          </div>
        ) : (
          <div className="text-center text-text-muted py-20">
            <p>{t('guide.selectTopic')}</p>
          </div>
        )}
      </div>
      {/* Fullscreen Connection Map Modal */}
      {showMapModal && (
        <div className="fixed inset-0 z-50 bg-surface/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-light/20">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-accent" />
              <h2 className="text-base font-semibold text-text">{t('guide.connectionMap')}</h2>
            </div>
            <button
              onClick={() => setShowMapModal(false)}
              className="p-2 rounded-lg hover:bg-surface-light/30 text-text-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 p-4 overflow-hidden">
            <ConnectionGraph
              topics={sortedTopics}
              sections={structure.sections}
              activeTopic={activeTopic}
              onSelectTopic={(id) => { handleSelectTopic(id); setShowMapModal(false) }}
              allBookTopics={bookData?.bookTopics}
              fullscreen
            />
          </div>
        </div>
      )}
      <FeatureSettings open={showSettings} onClose={() => setShowSettings(false)} onOpenTutor={() => setShowTutor(true)} />
      <TutorObservations
        open={showTutor}
        onClose={() => setShowTutor(false)}
        topics={sortedTopics}
        provider={provider}
        language={language}
      />
    </div>
  )
}
