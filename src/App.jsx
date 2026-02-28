import { useEffect, useCallback } from 'react'
import { usePDFParser } from './hooks/usePDFParser'
import { useDocumentAnalysis } from './hooks/useDocumentAnalysis'
import { useStudyGuide } from './hooks/useStudyGuide'
import { useLLMStream } from './hooks/useLLMStream'
import { useDocumentStore } from './stores/documentStore'
import { useStudyStore } from './stores/studyStore'
import { useProgressStore } from './stores/progressStore'
import PDFUploader from './components/PDFUploader'
import ProcessingStatus from './components/ProcessingStatus'
import StudyGuide from './components/StudyGuide'
import Library from './components/Library'
import LLMSelector from './components/LLMSelector'
import { BookOpen, RotateCcw, FileText, AlertCircle, ArrowLeft } from 'lucide-react'

export default function App() {
  const { document: parsedDoc, parsing, progress: parseProgress, error: parseError, parseFile, reset: resetParser } = usePDFParser()
  const { analyzing, error: structureError, analyzeStructure } = useDocumentAnalysis()
  const {
    phase, setPhase, topics, generatingTopic, progress: genProgress,
    error: guideError, generateGuides, reset: resetGuide
  } = useStudyGuide()
  const { status, checkHealth } = useLLMStream()

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

  // Full processing pipeline for new PDF
  const handleFileSelect = useCallback(async (file) => {
    setPhase('parsing')

    const doc = await parseFile(file)
    if (!doc) {
      setPhase('idle')
      return
    }

    // Generate document ID and persist
    const documentId = crypto.randomUUID()
    const docRecord = {
      id: documentId,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      totalPages: doc.totalPages,
      fullText: doc.fullText,
      processedAt: Date.now(),
      status: 'processing',
    }
    await saveDocument(docRecord)
    setActiveDocument(documentId)

    setPhase('analyzing')
    const struct = await analyzeStructure(doc, llmConfig)
    if (!struct) {
      setPhase('idle')
      return
    }

    // Persist structure
    await saveStructure(documentId, struct)

    // Generate guides (now with documentId for IDB persistence)
    await generateGuides(documentId, doc, struct, llmConfig)

    // Mark document as ready
    const { updateDocumentStatus } = useDocumentStore.getState()
    await updateDocumentStatus(documentId, 'ready')
  }, [parseFile, analyzeStructure, generateGuides, llmConfig, setPhase, saveDocument, setActiveDocument, saveStructure])

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
              {activeDoc.fileName}
              <span className="text-text-muted/60">({activeDoc.totalPages} pág.)</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LLMSelector status={status} onProviderChange={setLLMConfig} />
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
