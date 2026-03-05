import { useState, useEffect, useCallback, useRef } from 'react'
import { usePDFParser } from './hooks/usePDFParser'
import { useDocumentAnalysis } from './hooks/useDocumentAnalysis'
import { useDeepStudyGuide } from './hooks/useDeepStudyGuide'
import { useLLMStream } from './hooks/useLLMStream'
import { useDocumentStore } from './stores/documentStore'
import { useStudyStore } from './stores/studyStore'
import { useProgressStore } from './stores/progressStore'
import { db } from './lib/db'
import { pdfStorage } from './lib/pdfStorage'
import { getModelName } from './lib/models'
import { detectTOCPages, extractTOCTextFromRegions } from './lib/textUtils'
import { detectLanguage } from './lib/languageDetector'
import ProcessingStatus from './components/ProcessingStatus'
import StudyGuide from './components/StudyGuide'
import Library from './components/Library'
import DuplicateDialog from './components/DuplicateDialog'
import PageRangeDialog from './components/PageRangeDialog'
import StopDialog from './components/StopDialog'
import CancelConfirmDialog from './components/CancelConfirmDialog'
import ThemeSelector from './components/ThemeSelector'
import { useThemeStore } from './stores/themeStore'
import { useTranslation } from './lib/useTranslation'
import { useLanguageStore } from './lib/useTranslation'
import { BookOpen, RotateCcw, FileText, AlertCircle, ArrowLeft, Cpu, Loader2, CheckCircle } from 'lucide-react'

// Jaccard similarity: word overlap between two strings (0-1)
// Used as fallback for matching sections with legacy numeric IDs
function jaccardSimilarity(a, b) {
  const wordsA = new Set(a.split(/\s+/).filter(w => w.length > 1))
  const wordsB = new Set(b.split(/\s+/).filter(w => w.length > 1))
  if (wordsA.size === 0 && wordsB.size === 0) return 0
  let intersection = 0
  for (const w of wordsA) if (wordsB.has(w)) intersection++
  return intersection / (wordsA.size + wordsB.size - intersection)
}

async function computeContentHash(fullText, totalPages) {
  const input = fullText.slice(0, 10000) + String(totalPages)
  const data = new TextEncoder().encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

function LoadingWithTimeout({ onBack, timeoutMs = 8000 }) {
  const { t } = useTranslation()
  const [showFallback, setShowFallback] = useState(false)
  useEffect(() => {
    const timer = setTimeout(() => setShowFallback(true), timeoutMs)
    return () => clearTimeout(timer)
  }, [timeoutMs])

  return (
    <div className="flex flex-col items-center justify-center mt-20 gap-4">
      <Loader2 className="w-6 h-6 text-accent animate-spin" />
      {showFallback && (
        <div className="text-center animate-fadeIn">
          <p className="text-sm text-text-muted mb-2">{t('loading.timeout')}</p>
          <button
            onClick={onBack}
            className="text-xs text-accent hover:underline"
          >
            {t('loading.backToLibrary')}
          </button>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const uiLanguage = useLanguageStore(s => s.uiLanguage)
  const setUILanguage = useLanguageStore(s => s.setUILanguage)
  const { document: parsedDoc, parsing, progress: parseProgress, error: parseError, parseFile, reset: resetParser } = usePDFParser()
  const { analyzing, error: structureError, analyzeStructure } = useDocumentAnalysis()
  const {
    phase, setPhase, topics, generatingTopic, progress: genProgress,
    error: guideError, generateGuides, cancelGeneration, reset: resetGuide
  } = useDeepStudyGuide()
  const { status, checkHealth } = useLLMStream()

  // Dialog states
  const [duplicateInfo, setDuplicateInfo] = useState(null)
  const [pageRangeInfo, setPageRangeInfo] = useState(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [bookData, setBookData] = useState(null) // { book, processedSectionIds }
  const [expandingBookData, setExpandingBookData] = useState(null) // book data for "Ampliar cobertura"
  const [expandError, setExpandError] = useState(null)
  const expandFileRef = useRef(null)
  const originalFileRef = useRef(null) // holds the raw File for PDF storage

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

  const initTheme = useThemeStore(s => s.initTheme)

  // Load library, check health, init theme, and fix stale processing docs on mount
  useEffect(() => {
    const init = async () => {
      initTheme()
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
  // Skip if already processing (parsing/analyzing/generating) — processDocument handles its own phases
  useEffect(() => {
    if (!activeDocumentId) return

    const currentPhase = useStudyStore.getState().phase
    if (currentPhase !== 'idle') return

    const { setPhase, setError } = useStudyStore.getState()
    setError(null)
    setPhase('loading')

    const loadCached = async () => {
      try {
        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout: la carga tardó más de 10s.')), 10000)
        )
        const cached = await Promise.race([loadFromDB(activeDocumentId), timeout])
        if (cached) {
          await Promise.race([loadProgress(activeDocumentId), timeout])
        }
      } catch (err) {
        console.error('[StudyMind] loadCached error:', err.message)
        useStudyStore.getState().setPhase('idle')
        useStudyStore.getState().setError(err.message)
      }
    }
    loadCached()
  }, [activeDocumentId, loadFromDB, loadProgress])

  // Load book data when active document has a bookId
  useEffect(() => {
    if (!activeDocumentId) {
      setBookData(null)
      return
    }
    const loadBook = async () => {
      try {
        const doc = await db.getDocument(activeDocumentId)

        // Auto-create Book for legacy documents without bookId
        if (doc && !doc.bookId) {
          try {
            let book = doc.contentHash ? await db.getBookByHash(doc.contentHash) : null
            if (!book) {
              const docStructure = await db.getStructure(activeDocumentId)
              if (docStructure) {
                book = {
                  id: crypto.randomUUID(),
                  contentHash: doc.contentHash || `legacy-${doc.id}`,
                  fileName: doc.fileName,
                  totalPages: doc.totalPages,
                  structure: docStructure,
                  createdAt: Date.now(),
                }
                await db.saveBook(book)
                console.log(`[StudyMind] Auto-created Book for legacy document "${doc.fileName}"`)
              }
            }
            if (book) {
              doc.bookId = book.id
              if (!doc.contentHash) doc.contentHash = book.contentHash
              await db.saveDocument(doc)
            }
          } catch (err) {
            console.warn('[StudyMind] Auto-create book failed:', err.message)
          }
        }

        if (!doc?.bookId) {
          setBookData(null)
          return
        }
        const book = await db.getBook(doc.bookId)
        if (!book) {
          setBookData(null)
          return
        }
        // Get all topics from all documents of this book to determine processed sections
        const bookTopics = await db.getBookTopics(doc.bookId)

        // Match book structure sections to processed topics
        // Use sectionId for same-import match + title similarity for cross-import
        const processedSectionIds = new Set()
        const bookSections = book.structure?.sections || []
        for (const bs of bookSections) {
          for (const bt of bookTopics) {
            // Primary: exact stable ID match (works for new imports with stable IDs)
            if (String(bt.sectionId) === String(bs.id)) {
              processedSectionIds.add(bs.id)
              break
            }
            // Fallback: Jaccard similarity ≥0.6 for legacy numeric IDs or cross-import matching
            const bsTitle = (bs.title || '').toLowerCase()
            const btTitle = (bt.sectionTitle || '').toLowerCase()
            if (bsTitle && btTitle && jaccardSimilarity(bsTitle, btTitle) >= 0.6) {
              processedSectionIds.add(bs.id)
              break
            }
          }
        }
        setBookData({ book, processedSectionIds, bookTopics })
      } catch (err) {
        console.warn('[StudyMind] Failed to load book data:', err.message)
        setBookData(null)
      }
    }
    loadBook()
  }, [activeDocumentId, topics]) // Re-run when topics change (after generation completes)

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
      language: config.language || 'es',
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
      language: config.language || 'es',
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

    // --- Book entity: create or link (skip if contentHash is null = independent mode) ---
    if (contentHash) try {
      let book = await db.getBookByHash(contentHash)
      if (!book) {
        // Create new Book with structure (uses full structure from analysis)
        book = {
          id: crypto.randomUUID(),
          contentHash,
          fileName: doc.fileName,
          totalPages: doc.originalTotalPages || doc.totalPages,
          structure: struct,
          createdAt: Date.now(),
        }
        await db.saveBook(book)
        console.log(`[StudyMind] Book created: "${struct.title || doc.fileName}" (${book.id})`)
      } else {
        console.log(`[StudyMind] Book found: "${book.fileName}" (${book.id}), linking document`)
        // Merge new sections into book structure (union by stable ID, sorted by page)
        const existingIds = new Set((book.structure?.sections || []).map(s => s.id))
        const newSections = (struct.sections || []).filter(s => !existingIds.has(s.id))
        if (newSections.length > 0) {
          book.structure = {
            ...book.structure,
            sections: [...(book.structure.sections || []), ...newSections]
              .sort((a, b) => (a.pageStart || 0) - (b.pageStart || 0)),
          }
          await db.updateBookStructure(book.id, book.structure)
          console.log(`[StudyMind] Book structure merged: +${newSections.length} new sections (total: ${book.structure.sections.length})`)
        }
      }

      // Link document to book
      const updatedDoc = await db.getDocument(documentId)
      if (updatedDoc) {
        updatedDoc.bookId = book.id
        await db.saveDocument(updatedDoc)
        // Also update in-memory store
        useDocumentStore.setState(state => ({
          documents: state.documents.map(d => d.id === documentId ? { ...d, bookId: book.id } : d),
        }))
      }
    } catch (bookErr) {
      // Non-critical: if book creation fails, document still works standalone
      console.warn('[StudyMind] Book creation/linking failed:', bookErr.message)
    }

    const result = await generateGuides(documentId, doc, struct, config)

    const { updateDocumentStatus } = useDocumentStore.getState()
    if (result?.completed) {
      await updateDocumentStatus(documentId, 'ready')
    } else if (!result?.cancelled && result?.generated > 0) {
      // API errors caused partial generation — mark incomplete so user can resume
      await updateDocumentStatus(documentId, 'incomplete')
    }
    // If cancelled, phase is 'stopped' — StopDialog handles the rest
  }, [analyzeStructure, generateGuides, setPhase, saveDocument, setActiveDocument, saveStructure])

  // Show page range dialog for a parsed doc
  const showPageRangeDialog = useCallback((doc, contentHash) => {
    setPhase('idle')
    // Auto-detect document language from full text
    const detectedLang = detectLanguage(doc.fullText)
    console.log(`[StudyMind] Language detected: ${detectedLang}`)
    setPageRangeInfo({ parsedDoc: doc, contentHash, detectedLanguage: detectedLang })
  }, [setPhase])

  // Full processing pipeline for new PDF — with deduplication check
  const handleFileSelect = useCallback(async (file) => {
    setPhase('parsing')
    originalFileRef.current = file // keep reference for PDF storage

    const doc = await parseFile(file)
    if (!doc) {
      setPhase('idle')
      return
    }

    // Compute content hash for deduplication
    const contentHash = await computeContentHash(doc.fullText, doc.totalPages)
    const existingDocs = await db.findByContentHash(contentHash)

    // Save PDF to IndexedDB (always, fast and free)
    try {
      const buffer = await file.arrayBuffer()
      await pdfStorage.save(contentHash, buffer)
      console.log(`[StudyMind] PDF cached in IndexedDB (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB)`)
    } catch (e) {
      console.warn('[StudyMind] IndexedDB save failed:', e.message)
    }

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

  const handleDuplicateProceedIndependent = useCallback(() => {
    if (!duplicateInfo) return
    const { parsedDoc: doc } = duplicateInfo
    setDuplicateInfo(null)
    // Pass null contentHash to skip book linking entirely
    showPageRangeDialog(doc, null)
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

    // Filter pages to extended range — keep original PDF page numbers
    const filteredPages = doc.pages.slice(effectiveStart - 1, endPage)
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

    // Upload PDF to Vercel Blob in background (non-blocking)
    if (config.saveToServer && contentHash && originalFileRef.current) {
      const fileToUpload = originalFileRef.current
      ;(async () => {
        try {
          const { upload } = await import('@vercel/blob/client')
          const blob = await upload(`pdfs/${contentHash}.pdf`, fileToUpload, {
            access: 'public',
            handleUploadUrl: '/api/pdf-upload',
          })
          console.log(`[StudyMind] PDF uploaded to server: ${blob.url}`)
          await db.updateBookBlobUrl(contentHash, blob.url)
        } catch (e) {
          console.warn('[StudyMind] Server PDF upload failed (IndexedDB backup exists):', e.message)
        }
      })()
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
        language: pageData.language || docRecord.language || 'es',
      }

      const result = await generateGuides(activeDocumentId, doc, structure, config, existingTopicIds)

      const { updateDocumentStatus } = useDocumentStore.getState()
      if (result?.completed) {
        await updateDocumentStatus(activeDocumentId, 'ready')
      } else if (!result?.cancelled && result?.generated > 0) {
        // Partial resume — keep as incomplete
        await updateDocumentStatus(activeDocumentId, 'incomplete')
      }
    } catch (err) {
      console.error('[StudyMind] Resume error:', err)
    } finally {
      setResuming(false)
    }
  }, [activeDocumentId, structure, topics, generateGuides])

  // Stop dialog: resume (cancel the stop, continue processing)
  const handleStopResume = useCallback(async () => {
    if (!activeDocumentId) return
    const { updateDocumentStatus } = useDocumentStore.getState()
    await updateDocumentStatus(activeDocumentId, 'incomplete')
    setPhase('ready')
    setTimeout(() => handleResumeProcessing(), 100)
  }, [activeDocumentId, setPhase, handleResumeProcessing])

  // Cross-import navigation: switch to another document from the same book
  const handleNavigateToDocument = useCallback((documentId) => {
    if (!documentId) return
    // Reset current view and load target document
    resetParser()
    resetGuide()
    setActiveDocument(documentId)
  }, [resetParser, resetGuide, setActiveDocument])

  // Expand coverage: try stored PDF first, then file picker
  const handleExpandCoverage = useCallback(async () => {
    if (!bookData?.book) return
    setExpandError(null)

    const hash = bookData.book.contentHash
    const isLegacyHash = hash?.startsWith('legacy-')

    // 1. Try IndexedDB (fast local cache)
    try {
      const buffer = await pdfStorage.get(hash)
      if (buffer) {
        console.log(`[StudyMind] PDF found in IndexedDB (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB)`)
        const file = new File([buffer], bookData.book.fileName || 'book.pdf', { type: 'application/pdf' })
        // Navigate away, parse and show dialog directly
        clearActiveDocument()
        resetParser()
        resetGuide()
        setPhase('parsing')

        const doc = await parseFile(file)
        if (!doc) { setPhase('idle'); return }

        const contentHash = await computeContentHash(doc.fullText, doc.totalPages)
        if (contentHash !== hash) {
          if (isLegacyHash) {
            // Legacy book: update hash to real computed hash
            console.log(`[StudyMind] Legacy book hash upgraded: ${hash} → ${contentHash}`)
            await db.updateBookContentHash(bookData.book.id, contentHash)
            bookData.book.contentHash = contentHash
            // Re-save PDF under the correct hash
            try { await pdfStorage.save(contentHash, buffer) } catch { /* ok */ }
          } else {
            console.warn('[StudyMind] IndexedDB PDF hash mismatch — falling back to file picker')
            setExpandingBookData(bookData)
            setPhase('idle')
            setTimeout(() => expandFileRef.current?.click(), 0)
            return
          }
        }

        setPhase('idle')
        setPageRangeInfo({ parsedDoc: doc, contentHash, bookData })
        return
      }
    } catch (e) {
      console.warn('[StudyMind] IndexedDB read failed:', e.message)
    }

    // 2. Try Vercel Blob (server, cross-device)
    if (bookData.book.pdfBlobUrl) {
      try {
        console.log('[StudyMind] Downloading PDF from server...')
        clearActiveDocument()
        resetParser()
        resetGuide()
        setPhase('parsing')

        const res = await fetch(`/api/pdf-download?hash=${hash}`)
        if (res.ok) {
          const blob = await res.blob()
          const file = new File([blob], bookData.book.fileName || 'book.pdf', { type: 'application/pdf' })
          // Cache in IndexedDB for next time
          try { await pdfStorage.save(hash, await blob.arrayBuffer()) } catch { /* ok */ }

          const doc = await parseFile(file)
          if (!doc) { setPhase('idle'); return }

          const contentHash = await computeContentHash(doc.fullText, doc.totalPages)
          if (contentHash !== hash) {
            if (isLegacyHash) {
              console.log(`[StudyMind] Legacy book hash upgraded: ${hash} → ${contentHash}`)
              await db.updateBookContentHash(bookData.book.id, contentHash)
              bookData.book.contentHash = contentHash
            } else {
              console.warn('[StudyMind] Server PDF hash mismatch')
              setPhase('idle')
              setExpandingBookData(bookData)
              setTimeout(() => expandFileRef.current?.click(), 0)
              return
            }
          }

          setPhase('idle')
          setPageRangeInfo({ parsedDoc: doc, contentHash, bookData })
          return
        }
      } catch (e) {
        console.warn('[StudyMind] Server PDF download failed:', e.message)
      }
    }

    // 3. Fallback: file picker
    setExpandingBookData(bookData)
    setPhase('idle')
    setTimeout(() => expandFileRef.current?.click(), 0)
  }, [bookData, parseFile, setPhase, clearActiveDocument, resetParser, resetGuide])

  // Expand coverage: file selected
  const handleExpandFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (expandFileRef.current) expandFileRef.current.value = '' // reset input
    if (!file || !expandingBookData) {
      setExpandingBookData(null)
      return
    }

    if (file.type !== 'application/pdf') {
      setExpandError(t('upload.pdfOnly'))
      setExpandingBookData(null)
      return
    }

    // Navigate away from current document, start parsing
    clearActiveDocument()
    resetParser()
    resetGuide()
    setPhase('parsing')

    const doc = await parseFile(file)
    if (!doc) {
      setPhase('idle')
      setExpandingBookData(null)
      return
    }

    const contentHash = await computeContentHash(doc.fullText, doc.totalPages)

    // Cache PDF in IndexedDB for next time
    try {
      const buffer = await file.arrayBuffer()
      await pdfStorage.save(contentHash, buffer)
    } catch { /* ok */ }

    // Validate hash matches the book (skip for legacy auto-created books)
    const isLegacyHash = expandingBookData.book.contentHash?.startsWith('legacy-')
    if (contentHash !== expandingBookData.book.contentHash) {
      if (isLegacyHash) {
        // Legacy book: update hash to real computed hash
        console.log(`[StudyMind] Legacy book hash upgraded: ${expandingBookData.book.contentHash} → ${contentHash}`)
        await db.updateBookContentHash(expandingBookData.book.id, contentHash)
        expandingBookData.book.contentHash = contentHash
      } else {
        setPhase('idle')
        setExpandError(t('upload.mismatch'))
        setExpandingBookData(null)
        return
      }
    }

    // Show page range dialog with book data (skip duplicate dialog)
    setPhase('idle')
    setPageRangeInfo({
      parsedDoc: doc,
      contentHash,
      bookData: expandingBookData, // pass to PageRangeDialog
    })
    setExpandingBookData(null)
  }, [expandingBookData, parseFile, setPhase, clearActiveDocument, resetParser, resetGuide])

  // PDF availability state for download button
  const [pdfAvailable, setPdfAvailable] = useState(false)
  const [headerHidden, setHeaderHidden] = useState(false)

  useEffect(() => {
    if (!bookData?.book?.contentHash) {
      setPdfAvailable(false)
      return
    }
    // Check IndexedDB or blob URL
    const hash = bookData.book.contentHash
    pdfStorage.has(hash).then(has => {
      setPdfAvailable(has || !!bookData.book.pdfBlobUrl)
    }).catch(() => {
      setPdfAvailable(!!bookData.book.pdfBlobUrl)
    })
  }, [bookData])

  // Download PDF from IndexedDB or server
  const handleDownloadPDF = useCallback(async () => {
    if (!bookData?.book) return
    const hash = bookData.book.contentHash
    const fileName = bookData.book.fileName || 'document.pdf'

    // Try IndexedDB first
    try {
      const buffer = await pdfStorage.get(hash)
      if (buffer) {
        const blob = new Blob([buffer], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)
        return
      }
    } catch { /* try server */ }

    // Fallback: server download
    if (bookData.book.pdfBlobUrl) {
      const a = document.createElement('a')
      a.href = `/api/pdf-download?hash=${hash}`
      a.download = fileName
      a.click()
    }
  }, [bookData])

  // Link PDF retroactively to a book that was imported before upload existed
  const linkPdfRef = useRef(null)
  const [linkPdfMessage, setLinkPdfMessage] = useState(null)

  const handleLinkPDF = useCallback(() => {
    if (linkPdfRef.current) linkPdfRef.current.click()
  }, [])

  const handleLinkPDFChange = useCallback(async (e) => {
    const file = e.target.files?.[0]
    if (linkPdfRef.current) linkPdfRef.current.value = ''
    if (!file || !bookData?.book) return

    try {
      const buffer = await file.arrayBuffer()
      const hash = bookData.book.contentHash
      await pdfStorage.save(hash, buffer)
      setPdfAvailable(true)
      setLinkPdfMessage('success')
      console.log(`[StudyMind] PDF linked to book "${bookData.book.fileName}" (${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB)`)
      setTimeout(() => setLinkPdfMessage(null), 3000)
    } catch (err) {
      console.error('[StudyMind] Link PDF error:', err)
      setLinkPdfMessage('error')
      setTimeout(() => setLinkPdfMessage(null), 3000)
    }
  }, [bookData])

  // Determine current visual phase
  const currentPhase = parsing ? 'parsing'
    : analyzing ? 'analyzing'
    : phase

  const storeError = useStudyStore(s => s.error)
  const currentError = parseError || structureError || guideError || storeError

  // Force-reset if loading hangs for more than 10s
  useEffect(() => {
    if (currentPhase !== 'loading') return
    const timer = setTimeout(() => {
      console.error('[StudyMind] Loading timeout — forcing reset after 10s')
      useStudyStore.getState().setPhase('idle')
      useStudyStore.getState().setError('La carga tardó más de 10s. Puede haber un problema con este documento.')
    }, 10000)
    return () => clearTimeout(timer)
  }, [currentPhase])

  // Library view (no active document)
  if (!activeDocumentId) {
    return (
      <div className="min-h-screen bg-surface p-4">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-bold tracking-tight">StudyMind</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-alt rounded-lg border border-surface-light/30 overflow-hidden">
              <button
                onClick={() => setUILanguage('es')}
                className={`px-2 py-1 transition-colors ${uiLanguage === 'es' ? 'bg-accent text-white font-medium' : 'hover:text-text'}`}
              >
                ES
              </button>
              <button
                onClick={() => setUILanguage('en')}
                className={`px-2 py-1 transition-colors ${uiLanguage === 'en' ? 'bg-accent text-white font-medium' : 'hover:text-text'}`}
              >
                EN
              </button>
            </div>
            <ThemeSelector />
          </div>
        </header>

        <Library onNewDocument={handleFileSelect} />

        {/* Duplicate dialog */}
        {duplicateInfo && (
          <DuplicateDialog
            existingDocs={duplicateInfo.existingDocs}
            onProceed={handleDuplicateProceed}
            onProceedIndependent={handleDuplicateProceedIndependent}
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
            bookStructure={pageRangeInfo.bookData?.book?.structure}
            processedSectionIds={pageRangeInfo.bookData?.processedSectionIds}
            detectedLanguage={pageRangeInfo.detectedLanguage}
          />
        )}
      </div>
    )
  }

  // Active document view
  const activeDoc = useDocumentStore.getState().documents.find(d => d.id === activeDocumentId)

  return (
    <div className="min-h-screen md:h-screen md:flex md:flex-col bg-surface p-4 pb-2">
      {/* Header — auto-hides on mobile scroll down */}
      <header className={`shrink-0 flex items-center justify-between transition-all duration-300 overflow-hidden ${
        headerHidden ? 'max-h-0 opacity-0 mb-0' : 'max-h-24 mb-4 md:mb-6'
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={handleBackToLibrary}
            className="p-1.5 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text shrink-0"
            title={t('guide.backToLibrary')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <BookOpen className="w-6 h-6 text-accent shrink-0 hidden sm:block" />
          <h1 className="text-xl font-bold tracking-tight hidden sm:block">StudyMind</h1>
          {activeDoc && (
            <span className="text-xs text-text-muted bg-surface-alt px-2.5 py-1.5 rounded-lg flex items-start gap-1.5 sm:ml-2 max-w-[120px] sm:max-w-[200px] md:max-w-xs lg:max-w-md">
              <FileText className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="flex flex-col min-w-0">
                <span className="line-clamp-2 text-text-dim leading-tight">
                  {activeDoc.displayName || activeDoc.fileName}
                </span>
                <span className="text-text-muted/60 text-[10px]">
                  {activeDoc.totalPages} pág.{activeDoc.originalTotalPages ? ` de ${activeDoc.originalTotalPages}` : ''}
                </span>
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-text-muted bg-surface-alt rounded-lg border border-surface-light/30 overflow-hidden">
            <button
              onClick={() => setUILanguage('es')}
              className={`px-2 py-1 transition-colors ${uiLanguage === 'es' ? 'bg-accent text-white font-medium' : 'hover:text-text'}`}
            >
              ES
            </button>
            <button
              onClick={() => setUILanguage('en')}
              className={`px-2 py-1 transition-colors ${uiLanguage === 'en' ? 'bg-accent text-white font-medium' : 'hover:text-text'}`}
            >
              EN
            </button>
          </div>
          <ThemeSelector />
          {activeDoc?.model && (
            <span className="text-xs text-text-muted bg-surface-alt px-2.5 py-1 rounded-lg hidden md:flex items-center gap-1.5 border border-surface-light/30">
              <Cpu className="w-3 h-3" />
              {getModelName(activeDoc.model)}
              {activeDoc.processedAt && (
                <>
                  <span className="text-text-muted/50">·</span>
                  <span className="text-text-muted/70">
                    {new Date(activeDoc.processedAt).toLocaleDateString(uiLanguage === 'en' ? 'en-US' : 'es-AR', { day: 'numeric', month: 'short' })}
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
              <RotateCcw className="w-3 h-3" /> {t('common.cancel')}
            </button>
          )}
        </div>
      </header>

      {/* Error display */}
      {currentError && currentPhase === 'idle' && (
        <div className="max-w-lg mx-auto mb-6 p-4 rounded-xl bg-error/10 border border-error/20 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-error font-medium">{t('app.processingError')}</p>
            <p className="text-xs text-text-dim mt-1">{currentError}</p>
            <button
              onClick={handleBackToLibrary}
              className="text-xs text-accent mt-2 hover:underline"
            >
              {t('guide.backToLibrary')}
            </button>
          </div>
        </div>
      )}

      {/* Loading state (document activated, loading from cache) */}
      {currentPhase === 'loading' && (
        <LoadingWithTimeout onBack={handleBackToLibrary} />
      )}

      {/* Processing states */}
      {(currentPhase === 'parsing' || currentPhase === 'analyzing' || currentPhase === 'generating') && (
        <ProcessingStatus
          phase={currentPhase}
          progress={currentPhase === 'parsing' ? parseProgress : genProgress}
          generatingTopic={generatingTopic}
          onStop={currentPhase === 'generating' ? handleStopProcessing : undefined}
          pageRange={activeDoc?.pageRange}
        />
      )}

      {/* Stop dialog — shown when generation is cancelled */}
      {currentPhase === 'stopped' && (
        <StopDialog
          generated={topics.length}
          total={genProgress?.total || 0}
          onResume={handleStopResume}
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
          bookData={bookData}
          onExpandCoverage={handleExpandCoverage}
          onDownloadPDF={handleDownloadPDF}
          pdfAvailable={pdfAvailable}
          onLinkPDF={bookData?.book ? handleLinkPDF : undefined}
          onNavigateToDocument={handleNavigateToDocument}
          language={activeDoc?.language || 'es'}
          onHeaderVisibilityChange={setHeaderHidden}
        />
      )}

      {/* Empty state: document exists but no data (interrupted processing) */}
      {currentPhase === 'idle' && !currentError && (
        <div className="max-w-md mx-auto mt-20 text-center animate-fadeIn">
          <AlertCircle className="w-10 h-10 text-text-muted/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-text-dim mb-2">{t('app.noStudyData')}</h3>
          <p className="text-sm text-text-muted mb-6">
            {t('app.noStudyDataDesc')}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={async () => {
                if (!activeDocumentId) return
                const { deleteDocument } = useDocumentStore.getState()
                await deleteDocument(activeDocumentId)
                resetParser()
                resetGuide()
                clearActiveDocument()
              }}
              className="px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              {t('app.deleteDocument')}
            </button>
            <button
              onClick={handleBackToLibrary}
              className="px-4 py-2 text-sm text-accent hover:text-accent-hover bg-accent/10 hover:bg-accent/20 rounded-lg transition-colors"
            >
              {t('guide.backToLibrary')}
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input for expand coverage */}
      <input
        ref={expandFileRef}
        type="file"
        accept=".pdf"
        onChange={handleExpandFileChange}
        className="hidden"
      />

      {/* Hidden file input for link PDF */}
      <input
        ref={linkPdfRef}
        type="file"
        accept=".pdf"
        onChange={handleLinkPDFChange}
        className="hidden"
      />

      {/* Expand coverage error toast */}
      {expandError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-error/10 border border-error/20 shadow-lg backdrop-blur-sm">
            <AlertCircle className="w-4 h-4 text-error shrink-0" />
            <span className="text-sm text-error">{expandError}</span>
            <button
              onClick={() => setExpandError(null)}
              className="text-error/60 hover:text-error ml-2 text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Link PDF toast */}
      {linkPdfMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <div className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm ${
            linkPdfMessage === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-error/10 border border-error/20'
          }`}>
            {linkPdfMessage === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
            )}
            <span className={`text-sm ${linkPdfMessage === 'success' ? 'text-emerald-500' : 'text-error'}`}>
              {t(linkPdfMessage === 'success' ? 'pdf.linkSuccess' : 'pdf.linkMismatch')}
            </span>
          </div>
        </div>
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
