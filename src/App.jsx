import { useState, useEffect, useCallback } from 'react'
import { usePDFParser } from './hooks/usePDFParser'
import { useDocumentAnalysis } from './hooks/useDocumentAnalysis'
import { useStudyGuide } from './hooks/useStudyGuide'
import { useLLMStream } from './hooks/useLLMStream'
import PDFUploader from './components/PDFUploader'
import ProcessingStatus from './components/ProcessingStatus'
import StudyGuide from './components/StudyGuide'
import LLMSelector from './components/LLMSelector'
import { BookOpen, RotateCcw, FileText, AlertCircle } from 'lucide-react'

export default function App() {
  const { document, parsing, progress: parseProgress, error: parseError, parseFile, reset: resetParser } = usePDFParser()
  const { structure, analyzing, error: structureError, analyzeStructure } = useDocumentAnalysis()
  const {
    phase, setPhase, topics, generatingTopic, progress: genProgress,
    error: guideError, generateGuides, markStudied, setQuizScore, reset: resetGuide
  } = useStudyGuide()
  const { status, checkHealth } = useLLMStream()

  const [llmConfig, setLLMConfig] = useState({
    provider: localStorage.getItem('studymind-llm-provider') || 'claude',
    model: localStorage.getItem('studymind-llm-model') || 'claude-haiku-4-5-20251001',
  })

  // Check LLM providers on mount
  useEffect(() => {
    checkHealth()
  }, [checkHealth])

  // Full processing pipeline
  const handleFileSelect = useCallback(async (file) => {
    setPhase('parsing')

    const doc = await parseFile(file)
    if (!doc) {
      setPhase('idle')
      return
    }

    setPhase('analyzing')
    const struct = await analyzeStructure(doc, llmConfig)
    if (!struct) {
      setPhase('idle')
      return
    }

    await generateGuides(doc, struct, llmConfig)
  }, [parseFile, analyzeStructure, generateGuides, llmConfig, setPhase])

  const handleReset = () => {
    resetParser()
    resetGuide()
  }

  // Determine current visual phase
  const currentPhase = parsing ? 'parsing'
    : analyzing ? 'analyzing'
    : phase

  const currentError = parseError || structureError || guideError

  return (
    <div className="min-h-screen bg-surface p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-accent" />
          <h1 className="text-xl font-bold tracking-tight">StudyMind</h1>
          {document && (
            <span className="text-xs text-text-muted bg-surface-alt px-2.5 py-1 rounded-lg flex items-center gap-1.5 ml-2">
              <FileText className="w-3 h-3" />
              {document.fileName}
              <span className="text-text-muted/60">({document.totalPages} pág.)</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LLMSelector status={status} onProviderChange={setLLMConfig} />
          {currentPhase !== 'idle' && (
            <button
              onClick={handleReset}
              className="text-xs text-text-muted hover:text-text flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-alt transition-colors border border-transparent hover:border-surface-light"
            >
              <RotateCcw className="w-3 h-3" /> Nuevo PDF
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
              onClick={handleReset}
              className="text-xs text-accent mt-2 hover:underline"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      {currentPhase === 'idle' && !currentError && (
        <PDFUploader onFileSelect={handleFileSelect} />
      )}

      {(currentPhase === 'parsing' || currentPhase === 'analyzing' || currentPhase === 'generating') && (
        <ProcessingStatus
          phase={currentPhase}
          progress={currentPhase === 'parsing' ? parseProgress : genProgress}
          generatingTopic={generatingTopic}
        />
      )}

      {currentPhase === 'ready' && structure && (
        <StudyGuide
          structure={structure}
          topics={topics}
          onMarkStudied={markStudied}
          onQuizScore={setQuizScore}
        />
      )}
    </div>
  )
}
