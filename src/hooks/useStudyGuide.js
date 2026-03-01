import { useCallback, useRef } from 'react'
import { useLLMStream } from './useLLMStream'
import { buildStudyGuidePrompt } from '../lib/promptBuilder'
import { extractSectionTextByPages, extractSectionText, chunkText, precomputeNormalized } from '../lib/chunkProcessor'
import { useStudyStore } from '../stores/studyStore'

// Sections that are structural, not content
const NON_CONTENT_PATTERNS = [
  /^\s*[ií]ndice/i,
  /^tabla de contenidos?/i,
  /^bibliograf[ií]a/i,
  /^referencias?\s*$/i,
  /^ap[eé]ndice/i,
  /^anexo/i,
  /^pr[oó]logo/i,
  /^prefacio/i,
  /^agradecimientos/i,
  /^glosario/i,
  /^contents?\s*$/i,
  /^table of contents/i,
  /^bibliography/i,
  /^appendix/i,
  /^index\s*$/i,
  /^lista de (figuras|tablas|cuadros|gr[aá]ficos)/i,
]

function isNonContentSection(title) {
  return NON_CONTENT_PATTERNS.some(pat => pat.test(title.trim()))
}

// Validate that extracted text is real content (not TOC, page numbers, etc.)
function isValidSectionText(text) {
  if (!text || text.length < 100) return false

  // Detect TOC-like text: lines with dots/ellipsis followed by page numbers
  // e.g., "Capítulo 1 .............. 15" or "Sección 2.3 … 42"
  const tocLinePattern = /[.…·]{3,}\s*\d{1,3}\s*$/gm
  const tocLines = text.match(tocLinePattern) || []
  const totalLines = text.split('\n').filter(l => l.trim()).length
  if (totalLines > 0 && tocLines.length / totalLines > 0.3) return false

  return true
}

export function useStudyGuide() {
  const { streamRequest, cancel: cancelStream } = useLLMStream()
  const cancelledRef = useRef(false)

  // Pull state from Zustand store
  const phase = useStudyStore(s => s.phase)
  const topics = useStudyStore(s => s.topics)
  const generatingTopic = useStudyStore(s => s.generatingTopic)
  const progress = useStudyStore(s => s.progress)
  const error = useStudyStore(s => s.error)

  // Store actions
  const setPhase = useStudyStore(s => s.setPhase)
  const setError = useStudyStore(s => s.setError)
  const setGeneratingTopic = useStudyStore(s => s.setGeneratingTopic)
  const setProgress = useStudyStore(s => s.setProgress)
  const addTopic = useStudyStore(s => s.addTopic)
  const reset = useStudyStore(s => s.reset)

  const generateGuides = useCallback(async (documentId, document, structure, { provider, model }, skipIds = new Set()) => {
    setPhase('generating')
    cancelledRef.current = false

    // Filter: level <= 2 + non-content sections removed
    const allSections = structure.sections.filter(s => s.level <= 2)
    const sections = allSections.filter(s => !isNonContentSection(s.title))
    setProgress({ current: 0, total: sections.length })

    // Diagnostic logging
    console.log('[StudyMind] generateGuides start:', {
      provider, model,
      docPages: document.pages?.length || 0,
      hasPages: !!document.pages,
      fullTextLen: document.fullText?.length || 0,
      allSections: structure.sections.length,
      filteredSections: sections.length,
      withPageStart: structure.sections.filter(s => s.pageStart).length,
      sectionSample: sections.slice(0, 5).map(s => ({
        id: s.id, title: s.title.slice(0, 40),
        pageStart: s.pageStart, pageEnd: s.pageEnd,
      })),
    })

    const allTitles = sections.map(s => s.title)

    // Pre-compute normalized fullText once for all sections (avoids O(n²))
    const normFullCached = precomputeNormalized(document.fullText)

    for (let i = 0; i < sections.length; i++) {
      if (cancelledRef.current) break

      const section = sections[i]

      // Skip already-generated topics (for resume)
      if (skipIds.has(section.id)) {
        setProgress({ current: i + 1, total: sections.length })
        continue
      }

      setGeneratingTopic(section.title)
      setProgress({ current: i, total: sections.length })

      try {
        // Use page-based extraction (preferred) or strict title matching (fallback)
        const { text: sectionText, confidence } = extractSectionTextByPages(
          document,
          structure.sections,
          section.id,
          normFullCached
        )

        if (!isValidSectionText(sectionText)) {
          console.warn(`[StudyMind] SKIP "${section.title}" — text length: ${sectionText?.length || 0}, confidence: ${confidence}`)
          continue
        }
        console.log(`[StudyMind] OK "${section.title}" — text length: ${sectionText.length}, confidence: ${confidence}`)

        const chunks = chunkText(sectionText, 6000)
        const textToSend = chunks[0]
        const truncated = chunks.length > 1

        const prompt = buildStudyGuidePrompt(
          section.title,
          textToSend,
          structure.title,
          allTitles,
          truncated
        )

        let fullText = ''
        await streamRequest(prompt, {
          provider,
          model,
          promptVersion: 'studyGuide',
          maxTokens: 4096,
          onToken: (text) => { fullText = text },
          onDone: (text) => { fullText = text },
          onError: (err) => { throw new Error(err) },
        })

        // Parse JSON from response
        const jsonMatch = fullText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const guide = JSON.parse(jsonMatch[0])

          // Skip if LLM reported insufficient text
          if (guide.insufficientText) {
            console.warn(`[StudyMind] LLM flagged insufficient text for "${section.title}"`)
            continue
          }

          // Skip if summary is empty (LLM couldn't generate meaningful content)
          if (!guide.summary || guide.summary.trim().length === 0) {
            console.warn(`[StudyMind] Empty summary for "${section.title}", skipping`)
            continue
          }

          const topic = {
            id: section.id,
            sectionId: section.id,
            sectionTitle: section.title,
            level: section.level,
            relevance: guide.relevance || 'supporting',
            summary: guide.summary || '',
            keyConcepts: guide.keyConcepts || [],
            expandedExplanation: guide.expandedExplanation || guide.expandedExplantion || '',
            connections: guide.connections || [],
            quiz: guide.quiz || [],
            confidence,
          }
          // Persist to IDB + update store
          await addTopic(documentId, topic)
        }
      } catch (err) {
        if (err.name === 'AbortError' || cancelledRef.current) {
          console.log(`[StudyMind] Generation cancelled at "${section.title}"`)
          break
        }
        console.error(`Error generando guía para "${section.title}":`, err)
      }
    }

    const completed = !cancelledRef.current
    setGeneratingTopic(null)

    if (completed) {
      setProgress({ current: sections.length, total: sections.length })
      setPhase('ready')
    } else {
      setPhase('stopped')
    }

    return { completed, total: sections.length }
  }, [streamRequest, setPhase, setGeneratingTopic, setProgress, addTopic])

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true
    cancelStream() // Abort in-flight HTTP request immediately
  }, [cancelStream])

  // Generate a single section (for regeneration)
  const regenerateSection = useCallback(async (documentId, document, structure, sectionId, { provider, model }) => {
    const section = structure.sections.find(s => s.id === sectionId)
    if (!section) return

    setGeneratingTopic(section.title)

    try {
      // Try page-based extraction first, fallback to title matching
      const { text: sectionText, confidence } = extractSectionTextByPages(
        document,
        structure.sections,
        section.id
      )

      if (!isValidSectionText(sectionText)) {
        throw new Error(`Texto insuficiente para "${section.title}"`)
      }

      const allTitles = structure.sections.filter(s => s.level <= 2).map(s => s.title)
      const chunks = chunkText(sectionText, 6000)

      const prompt = buildStudyGuidePrompt(
        section.title,
        chunks[0],
        structure.title,
        allTitles,
        chunks.length > 1
      )

      let fullText = ''
      await streamRequest(prompt, {
        provider,
        model,
        promptVersion: 'studyGuide',
        maxTokens: 4096,
        onToken: (text) => { fullText = text },
        onDone: (text) => { fullText = text },
        onError: (err) => { throw new Error(err) },
      })

      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const guide = JSON.parse(jsonMatch[0])

        if (guide.insufficientText || !guide.summary?.trim()) {
          throw new Error(`El modelo no pudo generar contenido para "${section.title}"`)
        }

        const topic = {
          id: section.id,
          sectionId: section.id,
          sectionTitle: section.title,
          level: section.level,
          relevance: guide.relevance || 'supporting',
          summary: guide.summary || '',
          keyConcepts: guide.keyConcepts || [],
          expandedExplanation: guide.expandedExplanation || guide.expandedExplantion || '',
          connections: guide.connections || [],
          quiz: guide.quiz || [],
          confidence,
        }
        await addTopic(documentId, topic)
      }
    } catch (err) {
      console.error(`Error regenerando "${section.title}":`, err)
      setError(err.message)
    } finally {
      setGeneratingTopic(null)
    }
  }, [streamRequest, setGeneratingTopic, setError, addTopic])

  return {
    phase, setPhase,
    topics,
    generatingTopic,
    progress,
    error, setError,
    generateGuides,
    regenerateSection,
    cancelGeneration,
    reset,
  }
}
