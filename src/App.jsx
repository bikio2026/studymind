import { useState, useEffect, useCallback } from 'react'
import { usePDFParser } from './hooks/usePDFParser'
import { useDocumentAnalysis } from './hooks/useDocumentAnalysis'
import { useStudyGuide } from './hooks/useStudyGuide'
import { useLLMStream } from './hooks/useLLMStream'
import { useDocumentStore } from './stores/documentStore'
import { useStudyStore } from './stores/studyStore'
import { useProgressStore } from './stores/progressStore'
import { db } from './lib/db'
import { getModelName } from './lib/models'
import { detectTOCPages, extractTOCTextFromRegions } from './lib/textUtils'
import ProcessingStatus from './components/ProcessingStatus'
import StudyGuide from './components/StudyGuide'
import Library from './components/Library'
import DuplicateDialog from './components/DuplicateDialog'
import PageRangeDialog from './components/PageRangeDialog'
import StopDialog from './components/StopDialog'
import CancelConfirmDialog from './components/CancelConfirmDialog'
import { BookOpen, RotateCcw, FileText, AlertCircle, ArrowLeft, Cpu } from 'lucide-react'

async function computeContentHash(fullText, totalPages) {
  const input = fullText.slice(0, 10000) + String(totalPages)
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function App() {
  const { document: parsedDoc, parsing, progress: parseProgress, error: parseError, parseFile, reset: resetParser } = usePDFParser()
  const { analyzing, error: structureError, analyzeStructure } = useDocumentAnalysis()
  const {
    phase, setPhase, topics, generatingTopic, progress: genProgress,
    error: guideError, generateGuides, cancelGeneration, reset: resetGuide
  } = useStudyGuide()
  const { status, checkHealth } = useLLMStream()

  // Dialog states
  const [duplicateInfo, setDuplicateInfo] = useState(null)
  const [pageRangeInfo, setPageRangeInfo] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [resuming, setResuming] = useState(false)

  // Zustand stores
  const activeDocumentId = useDocumentStore(s => s.activeDocumentId)
  const setActiveDocument = useDocumentStore(s => s.setActiveDocument)
  const clearActiveDocument = useDocumentStore(s => s.clearActiveDocument)
  const saveDocument = useDocumentStore(s => s.saveDocument)
  const loadDocuments = useDocumentStore(s => s.loadDocuments)

  const structure = useStudyStore(s => s.structure)
  const loadFromDB = useStudyStore(s => s.loadFromDB)
  const saveStructure = useStudyStore(s => s.saveStructure)

  const loadProgress = useProgressStore(s => s.loadProgress)

  // Load library, check health, and fix stale processing docs on mount
  useEffect(() => {
    const init = async () => {
      await loadDocuments()
      checkHealth()

      // Auto-detect stale 'processing' documents → mark as 'incomplete'
      const { documents, updateDocumentStatus } = useDocumentStore.getState()
      for (const doc of documents) {
        if (doc.status === 'processing') {
          console.log(`[StudyMind] Stale doc detected: "${doc.displayName || doc.fileName}" → marking as incomplete`)
          await updateDocumentStatus(doc.id, 'incomplete')
        }
      }
    }
    init()
  }, [loadDocuments, checkHealth])

  // When a document is activated, try to load from IDB cache
  useEffect(() => {
    if (!activeDocumentId) return

    const loadCached = async () => {
      const cached = await loadFromDB(activeDocumentId)
      if (cached) {
        await loadProgress(activeDocumentId)
      }
    }
    loadCached()
  }, [activeDocumentId, loadFromDB, loadProgress])

  // Process a parsed PDF document (called after page range selection)
  const processDocument = useCallback(async (doc, contentHash, config) => {
    const documentId = crypto.randomUUID()
    const docRecord = {
      id: documentId,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      totalPages: doc.totalPages,
      fullText: doc.fullText,
      processedAt: Date.now(),
      status: 'processing',
      contentHash,
      provider: config.provider,
      model: config.model,
      // Page range metadata (if partial processing)
      ...(doc.pageRange && {
        pageRange: doc.pageRange,
        originalTotalPages: doc.originalTotalPages,
      }),
    }
    await saveDocument(docRecord)
    setActiveDocument(documentId)

    // Save page data for resume capability
    await db.savePageData(documentId, {
      pages: doc.pages,
      tocText: doc.tocText || null,
      pageRange: doc.pageRange || null,
      provider: config.provider,
      model: config.model,
    })

    setPhase('analyzing')
    const struct = await analyzeStructure(doc, config)
    if (!struct) {
      setPhase('idle')
      return
    }

    await saveStructure(documentId, struct)

    // Auto-suggest IA title as displayName
    if (struct.title) {
      const { renameDocument } = useDocumentStore.getState()
      await renameDocument(documentId, struct.title)
    }

    const result = await generateGuides(documentId, doc, struct, config)

    // Only mark as 'ready' if generation completed (not cancelled)
    if (result?.completed) {
      const { updateDocumentStatus } = useDocumentStore.getState()
      await updateDocumentStatus(documentId, 'ready')
    }
    // If cancelled, phase is 'stopped' — StopDialog handles the rest
  }, [analyzeStructure, generateGuides, setPhase, saveDocument, setActiveDocument, saveStructure])

  // Show page range dialog for a parsed doc
  const showPageRangeDialog = useCallback((doc, contentHash) => {
    setPhase('idle')
    setPageRangeInfo({ parsedDoc: doc, contentHash })
  }, [setPhase])

  // Full processing pipeline for new PDF — with deduplication check
  const handleFileSelect = useCallback(async (file) => {
    setPhase('parsing')

    const doc = await parseFile(file)
    if (!doc) {
      setPhase('idle')
      return
    }

    // Compute content hash for deduplication
    const contentHash = await computeContentHash(doc.fullText, doc.totalPages)
    const existingDocs = await db.findByContentHash(contentHash)

    if (existingDocs.length > 0) {
      // Show duplicate dialog — pause processing
      setPhase('idle')
      setDuplicateInfo({ existingDocs, parsedDoc: doc, contentHash })
      return
    }

    // No duplicates — show page range dialog
    showPageRangeDialog(doc, contentHash)
  }, [parseFile, setPhase, showPageRangeDialog])

  // Duplicate dialog handlers
  const handleDuplicateProceed = useCallback(() => {
    if (!duplicateInfo) return
    const { parsedDoc: doc, contentHash } = duplicateInfo
    setDuplicateInfo(null)
    showPageRangeDialog(doc, contentHash)
  }, [duplicateInfo, showPageRangeDialog])

  const handleDuplicateOpen = useCallback((docId) => {
    setDuplicateInfo(null)
    setActiveDocument(docId)
  }, [setActiveDocument])

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateInfo(null)
    resetParser()
  }, [resetParser])

  // Page range dialog handlers
  const handlePageRangeConfirm = useCallback(async (startPage, endPage, config, tocConfig = { mode: 'auto' }) => {
    if (!pageRangeInfo) return
    const { parsedDoc: doc, contentHash } = pageRangeInfo
    setPageRangeInfo(null)

    const isFullRange = startPage === 1 && endPage === doc.totalPages

    // For partial ranges, extend start backward to capture chapter beginnings
    const CONTEXT_BUFFER = 10
    const effectiveStart = isFullRange ? startPage : Math.max(1, startPage - CONTEXT_BUFFER)

    if (!isFullRange && effectiveStart < startPage) {
      console.log(`[StudyMind] Context buffer: extending start from page ${startPage} to ${effectiveStart} (+${startPage - effectiveStart} pages)`)
    }

    // Filter pages to extended range and re-index page numbers
    const filteredPages = doc.pages.slice(effectiveStart - 1, endPage).map((page, i) => ({
      ...page,
      pageNumber: i + 1,
      originalPageNumber: page.pageNumber,
    }))
    const filteredDoc = {
      ...doc,
      pages: filteredPages,
      fullText: filteredPages.map(p => p.text).join('\n\n'),
      totalPages: filteredPages.length,
      ...(isFullRange ? {} : {
        originalTotalPages: doc.totalPages,
        pageRange: { start: startPage, end: endPage, originalTotal: doc.totalPages },
      }),
    }

    // TOC detection for partial ranges
    if (!isFullRange && tocConfig.mode !== 'none') {
      if (tocConfig.mode === 'manual' && tocConfig.start && tocConfig.end) {
        const manualPages = doc.pages.slice(tocConfig.start - 1, tocConfig.end)
        filteredDoc.tocText = manualPages.map(p => p.text).join('\n\n')
        console.log(`[StudyMind] TOC manual: pages ${tocConfig.start}-${tocConfig.end} (${manualPages.length} pages)`)
      } else {
        const tocResult = detectTOCPages(doc.pages)
        if (tocResult.hasTOC) {
          filteredDoc.tocText = extractTOCTextFromRegions(tocResult)
        }
      }
    }

    setPhase('parsing')
    await processDocument(filteredDoc, contentHash, config)
  }, [pageRangeInfo, processDocument, setPhase])

  const handlePageRangeCancel = useCallback(() => {
    setPageRangeInfo(null)
    resetParser()
  }, [resetParser])

  // Stop processing
  const handleStopProcessing = useCallback(() => {
    cancelGeneration()
    // The generateGuides promise will resolve with completed=false,
    // setting phase to 'stopped', which triggers StopDialog
  }, [cancelGeneration])

  // Stop dialog: keep partial results
  const handleStopKeep = useCallback(async () => {
    if (!activeDocumentId) return
    const { updateDocumentStatus } = useDocumentStore.getState()
    await updateDocumentStatus(activeDocumentId, 'incomplete')
    setPhase('ready')
  }, [activeDocumentId, setPhase])

  // Stop dialog: delete everything
  const handleStopDelete = useCallback(async () => {
    if (!activeDocumentId) return
    const { deleteDocument } = useDocumentStore.getState()
    await deleteDocument(activeDocumentId)
    resetParser()
    resetGuide()
    clearActiveDocument()
  }, [activeDocumentId, resetParser, resetGuide, clearActiveDocument])

  // Navigate back (with confirmation if processing)
  const handleBackToLibrary = useCallback(() => {
    const isProcessing = parsing || analyzing || phase === 'generating'
    if (isProcessing) {
      setShowCancelConfirm(true)
      return
    }
    resetParser()
    resetGuide()
    clearActiveDocument()
  }, [parsing, analyzing, phase, resetParser, resetGuide, clearActiveDocument])

  // Cancel confirm: yes
  const handleCancelConfirmed = useCallback(() => {
    setShowCancelConfirm(false)
    handleStopProcessing()
  }, [handleStopProcessing])

  // Resume processing for incomplete documents
  const handleResumeProcessing = useCallback(async () => {
    if (!activeDocumentId || !structure) return

    setResuming(true)
    try {
      // Load page data from IDB
      const pageData = await db.getPageData(activeDocumentId)
      if (!pageData) {
        console.error('[StudyMind] Cannot resume: no page data found')
        setResuming(false)
        return
      }

      // Reconstruct document object for generateGuides
      const docRecord = await db.getDocument(activeDocumentId)
      const doc = {
        pages: pageData.pages,
        fullText: docRecord.fullText,
        totalPages: docRecord.totalPages,
        tocText: pageData.tocText,
        pageRange: pageData.pageRange,
      }

      // Get existing topic IDs to skip
      const existingTopicIds = new Set(topics.map(t => t.id))
      console.log(`[StudyMind] Resume: ${existingTopicIds.size} topics already generated, skipping`)

      const config = {
        provider: pageData.provider || docRecord.provider,
        model: pageData.model || docRecord.model,
      }

      const result = await generateGuides(activeDocumentId, doc, structure, config, existingTopicIds)

      if (result?.completed) {
        const { updateDocumentStatus } = useDocumentStore.getState()
        await updateDocumentStatus(activeDocumentId, 'ready')
      }
    } catch (err) {
      console.error('[StudyMind] Resume error:', err)
    } finally {
      setResuming(false)
    }
  }, [activeDocumentId, structure, topics, generateGuides])

  // Determine current visual phase
  const currentPhase = parsing ? 'parsing'
    : analyzing ? 'analyzing'
    : phase

  const currentError = parseError || structureError || guideError

  // Library view (no active document)
  if (!activeDocumentId) {
    return (
      <div className="min-h-screen bg-surface p-4">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-bold tracking-tight">StudyMind</h1>
          </div>
        </header>

        <Library onNewDocument={handleFileSelect} />

        {/* Duplicate dialog */}
        {duplicateInfo && (
          <DuplicateDialog
            existingDocs={duplicateInfo.existingDocs}
            onProceed={handleDuplicateProceed}
            onOpen={handleDuplicateOpen}
            onCancel={handleDuplicateCancel}
          />
        )}

        {/* Page range dialog */}
        {pageRangeInfo && (
          <PageRangeDialog
            fileName={pageRangeInfo.parsedDoc.fileName}
            totalPages={pageRangeInfo.parsedDoc.totalPages}
            status={status}
            onConfirm={handlePageRangeConfirm}
            onCancel={handlePageRangeCancel}
          />
        )}
      </div>
    )
  }

  // Active document view
  const activeDoc = useDocumentStore.getState().documents.find(d => d.id === activeDocumentId)

  return (
    <div className="min-h-screen bg-surface p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToLibrary}
            className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text"
            title="Volver a biblioteca"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-bold tracking-tight">StudyMind</h1>
          {activeDoc && (
            <span className="text-xs text-text-muted bg-surface-alt px-2.5 py-1 rounded-lg flex items-center gap-1.5 ml-2">
              <FileText className="w-3 h-3" />
              {activeDoc.displayName || activeDoc.fileName}
              <span className="text-text-muted/60">
                ({activeDoc.totalPages} pág.{activeDoc.originalTotalPages ? ` de ${activeDoc.originalTotalPages}` : ''})
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeDoc?.model && (
            <span className="text-xs text-text-muted bg-surface-alt px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-surface-light/30">
              <Cpu className="w-3 h-3" />
              {getModelName(activeDoc.model)}
              {activeDoc.processedAt && (
                <>
                  <span className="text-text-muted/50">·</span>
                  <span className="text-text-muted/70">
                    {new Date(activeDoc.processedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  </span>
                </>
              )}
            </span>
          )}
          {currentPhase !== 'idle' && currentPhase !== 'ready' && currentPhase !== 'stopped' && (
            <button
              onClick={handleBackToLibrary}
              className="text-xs text-text-muted hover:text-text flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-alt transition-colors border border-transparent hover:border-surface-light"
            >
              <RotateCcw className="w-3 h-3" /> Cancelar
            </button>
          )}
        </div>
      </header>

      {/* Error display */}
      {currentError && currentPhase === 'idle' && (
        <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-error font-medium">Error en el procesamiento</p>
            <p className="text-xs text-text-dim mt-1">{currentError}</p>
            <button
              onClick={handleBackToLibrary}
              className="text-xs text-accent mt-2 hover:underline"
            >
              Volver a la biblioteca
            </button>
          </div>
        </div>
      )}

      {/* Processing states */}
      {(currentPhase === 'parsing' || currentPhase === 'analyzing' || currentPhase === 'generating') && (
        <ProcessingStatus
          phase={currentPhase}
          progress={currentPhase === 'parsing' ? parseProgress : genProgress}
          generatingTopic={generatingTopic}
          onStop={currentPhase === 'generating' ? handleStopProcessing : undefined}
        />
      )}

      {/* Stop dialog — shown when generation is cancelled */}
      {currentPhase === 'stopped' && (
        <StopDialog
          generated={topics.length}
          total={genProgress?.total || 0}
          onKeep={handleStopKeep}
          onDelete={handleStopDelete}
        />
      )}

      {/* Study guide */}
      {currentPhase === 'ready' && structure && (
        <StudyGuide
          structure={structure}
          topics={topics}
          documentId={activeDocumentId}
          documentStatus={activeDoc?.status}
          onResume={activeDoc?.status === 'incomplete' ? handleResumeProcessing : undefined}
          resuming={resuming}
        />
      )}

      {/* Cancel confirmation dialog */}
      {showCancelConfirm && (
        <CancelConfirmDialog
          onConfirm={handleCancelConfirmed}
          onDismiss={() => setShowCancelConfirm(false)}
        />
      )}
    </div>
  )
}
