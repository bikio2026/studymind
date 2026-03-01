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
import PDFUploader from './components/PDFUploader'
import ProcessingStatus from './components/ProcessingStatus'
import StudyGuide from './components/StudyGuide'
import Library from './components/Library'
import LLMSelector from './components/LLMSelector'
import DuplicateDialog from './components/DuplicateDialog'
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
    error: guideError, generateGuides, reset: resetGuide
  } = useStudyGuide()
  const { status, checkHealth } = useLLMStream()

  // Duplicate dialog state
  const [duplicateInfo, setDuplicateInfo] = useState(null) // { existingDocs, parsedDoc, contentHash }

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

  // LLM config persisted in localStorage
  const llmConfig = {
    provider: localStorage.getItem('studymind-llm-provider') || 'claude',
    model: localStorage.getItem('studymind-llm-model') || 'claude-haiku-4-5-20251001',
  }

  const setLLMConfig = useCallback(({ provider, model }) => {
    localStorage.setItem('studymind-llm-provider', provider)
    localStorage.setItem('studymind-llm-model', model)
  }, [])

  // Load library and check health on mount
  useEffect(() => {
    loadDocuments()
    checkHealth()
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

  // Process a parsed PDF document (called directly or after dedup dialog)
  const processDocument = useCallback(async (doc, contentHash) => {
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
      provider: llmConfig.provider,
      model: llmConfig.model,
    }
    await saveDocument(docRecord)
    setActiveDocument(documentId)

    setPhase('analyzing')
    const struct = await analyzeStructure(doc, llmConfig)
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

    await generateGuides(documentId, doc, struct, llmConfig)

    const { updateDocumentStatus } = useDocumentStore.getState()
    await updateDocumentStatus(documentId, 'ready')
  }, [analyzeStructure, generateGuides, llmConfig, setPhase, saveDocument, setActiveDocument, saveStructure])

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

    // No duplicates — proceed
    await processDocument(doc, contentHash)
  }, [parseFile, setPhase, processDocument])

  // Duplicate dialog handlers
  const handleDuplicateProceed = useCallback(async () => {
    if (!duplicateInfo) return
    const { parsedDoc: doc, contentHash } = duplicateInfo
    setDuplicateInfo(null)
    setPhase('parsing') // visual feedback while starting
    await processDocument(doc, contentHash)
  }, [duplicateInfo, processDocument, setPhase])

  const handleDuplicateOpen = useCallback((docId) => {
    setDuplicateInfo(null)
    setActiveDocument(docId)
  }, [setActiveDocument])

  const handleDuplicateCancel = useCallback(() => {
    setDuplicateInfo(null)
    resetParser()
  }, [resetParser])

  const handleBackToLibrary = () => {
    resetParser()
    resetGuide()
    clearActiveDocument()
  }

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
          <LLMSelector status={status} onProviderChange={setLLMConfig} />
        </header>

        <Library onNewDocument={handleFileSelect} />

        {/* Duplicate dialog */}
        {duplicateInfo && (
          <DuplicateDialog
            existingDocs={duplicateInfo.existingDocs}
            currentModel={llmConfig.model}
            onProceed={handleDuplicateProceed}
            onOpen={handleDuplicateOpen}
            onCancel={handleDuplicateCancel}
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
              <span className="text-text-muted/60">({activeDoc.totalPages} pág.)</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {currentPhase === 'ready' && activeDoc?.model ? (
            <span className="text-xs text-text-muted bg-surface-alt px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-surface-light/30">
              <Cpu className="w-3 h-3" />
              {getModelName(activeDoc.model)}
              <span className="text-text-muted/50">·</span>
              <span className="text-text-muted/70">
                {new Date(activeDoc.processedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </span>
            </span>
          ) : (
            <LLMSelector status={status} onProviderChange={setLLMConfig} />
          )}
          {currentPhase !== 'idle' && currentPhase !== 'ready' && (
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
        />
      )}

      {/* Study guide */}
      {currentPhase === 'ready' && structure && (
        <StudyGuide
          structure={structure}
          topics={topics}
          documentId={activeDocumentId}
        />
      )}
    </div>
  )
}
