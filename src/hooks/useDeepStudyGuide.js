import { useCallback, useRef } from 'react'
import { useLLMStream } from './useLLMStream'
import {
  buildStudyGuidePrompt,
  buildChunkExtractionPrompt,
  buildDeepSynthesisPrompt,
  buildQuizFromSynthesisPrompt,
} from '../lib/promptBuilder'
import { extractSectionTextByPages, chunkText, precomputeNormalized } from '../lib/chunkProcessor'
import { useStudyStore } from '../stores/studyStore'

// Delay between API requests (ms)
const INTER_REQUEST_DELAY = {
  claude: 500,
  groq: 4000,
}

// Threshold: sections with more than this many chars use multi-pass
const DEEP_MODE_THRESHOLD = 12000

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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

function isValidSectionText(text) {
  if (!text || text.length < 100) return false
  const tocLinePattern = /[.…·]{3,}\s*\d{1,3}\s*$/gm
  const tocLines = text.match(tocLinePattern) || []
  const totalLines = text.split('\n').filter(l => l.trim()).length
  if (totalLines > 0 && tocLines.length / totalLines > 0.3) return false
  return true
}

export function useDeepStudyGuide() {
  const { streamRequest, cancel: cancelStream } = useLLMStream()
  const cancelledRef = useRef(false)

  const phase = useStudyStore(s => s.phase)
  const topics = useStudyStore(s => s.topics)
  const generatingTopic = useStudyStore(s => s.generatingTopic)
  const progress = useStudyStore(s => s.progress)
  const error = useStudyStore(s => s.error)

  const setPhase = useStudyStore(s => s.setPhase)
  const setError = useStudyStore(s => s.setError)
  const setGeneratingTopic = useStudyStore(s => s.setGeneratingTopic)
  const setProgress = useStudyStore(s => s.setProgress)
  const addTopic = useStudyStore(s => s.addTopic)
  const reset = useStudyStore(s => s.reset)

  // Stream an LLM call and return the parsed JSON
  const callLLM = async (prompt, { provider, model, promptVersion, maxTokens = 4096 }) => {
    let fullText = ''
    await streamRequest(prompt, {
      provider,
      model,
      promptVersion,
      maxTokens,
      onToken: (text) => { fullText = text },
      onDone: (text) => { fullText = text },
      onError: (err) => { throw new Error(err) },
    })

    // Strip markdown code blocks
    let cleaned = fullText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '')
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[StudyMind] No JSON in response:', fullText.slice(0, 300))
      return null
    }
    return JSON.parse(jsonMatch[0])
  }

  // Standard mode: 1 call per section (current behavior, for short sections)
  const generateStandard = async (section, sectionText, structure, { provider, model }) => {
    const allTitles = structure.sections.filter(s => s.level <= 2).map(s => s.title)
    const chunks = chunkText(sectionText, 6000)

    const prompt = buildStudyGuidePrompt(
      section.title,
      chunks[0],
      structure.title,
      allTitles,
      chunks.length > 1
    )

    const guide = await callLLM(prompt, {
      provider,
      model,
      promptVersion: 'studyGuide',
      maxTokens: 4096,
    })

    if (!guide || guide.insufficientText || !guide.summary?.trim()) return null

    return {
      id: section.id,
      sectionId: section.id,
      sectionTitle: section.title,
      level: section.level,
      relevance: guide.relevance || 'supporting',
      summary: guide.summary || '',
      keyConcepts: guide.keyConcepts || [],
      expandedExplanation: guide.expandedExplanation || guide.expandedExplantion || '',
      deepExplanation: null,
      definitions: [],
      connections: guide.connections || [],
      quiz: guide.quiz || [],
      chunkCount: 1,
      mode: 'standard',
    }
  }

  // Deep mode: multi-pass for long sections
  const generateDeep = async (section, sectionText, structure, { provider, model }, onPassUpdate) => {
    const allTitles = structure.sections.filter(s => s.level <= 2).map(s => s.title)
    const chunks = chunkText(sectionText, 8000)
    const delay = INTER_REQUEST_DELAY[provider] || 1000

    // Determine models: Haiku for pass 1 & 3, Sonnet for pass 2
    const haikuModel = 'claude-haiku-4-5-20251001'
    const sonnetModel = 'claude-sonnet-4-20250514'
    // For Groq: use the same model for all passes (can't mix providers)
    const extractModel = provider === 'claude' ? haikuModel : model
    const synthesisModel = provider === 'claude' ? sonnetModel : model
    const quizModel = provider === 'claude' ? haikuModel : model

    console.log(`[StudyMind] DEEP mode for "${section.title}": ${sectionText.length} chars, ${chunks.length} chunks`)
    console.log(`[StudyMind]   Models: extract=${extractModel}, synthesis=${synthesisModel}, quiz=${quizModel}`)
    console.log(`[StudyMind]   Estimated calls: ${chunks.length} + 1 + 1 = ${chunks.length + 2}`)

    // --- PASS 1: Extract key points from each chunk ---
    const chunkExtracts = []
    for (let i = 0; i < chunks.length; i++) {
      if (cancelledRef.current) return null

      onPassUpdate?.(`Extrayendo puntos clave (${i + 1}/${chunks.length})...`)

      const prompt = buildChunkExtractionPrompt(chunks[i], i, chunks.length, section.title)
      const extract = await callLLM(prompt, {
        provider,
        model: extractModel,
        promptVersion: 'chunkExtraction',
        maxTokens: 2048,
      })

      if (extract) {
        chunkExtracts.push(extract)
      } else {
        console.warn(`[StudyMind] Pass 1 failed for chunk ${i + 1}, using rawNotes fallback`)
        chunkExtracts.push({ rawNotes: chunks[i].slice(0, 2000), concepts: [], arguments: [], definitions: [], examples: [], formulas: [] })
      }

      if (i < chunks.length - 1) await sleep(delay)
    }

    if (cancelledRef.current) return null

    // --- PASS 2: Deep synthesis ---
    onPassUpdate?.('Sintetizando explicación profunda...')

    const synthesisPrompt = buildDeepSynthesisPrompt(
      section.title,
      chunkExtracts,
      structure.title,
      allTitles
    )

    const synthesis = await callLLM(synthesisPrompt, {
      provider,
      model: synthesisModel,
      promptVersion: 'deepSynthesis',
      maxTokens: 16384,
    })

    if (!synthesis || !synthesis.deepExplanation) {
      console.error(`[StudyMind] Pass 2 failed for "${section.title}"`)
      return null
    }

    await sleep(delay)
    if (cancelledRef.current) return null

    // --- PASS 3: Quiz + connections ---
    onPassUpdate?.('Generando quiz y conexiones...')

    const quizPrompt = buildQuizFromSynthesisPrompt(
      section.title,
      synthesis.deepExplanation,
      allTitles
    )

    const quizData = await callLLM(quizPrompt, {
      provider,
      model: quizModel,
      promptVersion: 'studyGuide', // reuse studyGuide system prompt for quiz
      maxTokens: 4096,
    })

    // Merge everything
    return {
      id: section.id,
      sectionId: section.id,
      sectionTitle: section.title,
      level: section.level,
      relevance: synthesis.relevance || 'supporting',
      summary: synthesis.summary || '',
      keyConcepts: synthesis.keyConcepts || [],
      expandedExplanation: '', // legacy field, empty for deep mode
      deepExplanation: synthesis.deepExplanation || '',
      definitions: synthesis.definitions || [],
      connections: quizData?.connections || synthesis.connections || [],
      quiz: quizData?.quiz || [],
      chunkCount: chunks.length,
      mode: 'deep',
    }
  }

  const generateGuides = useCallback(async (documentId, document, structure, { provider, model }, skipIds = new Set()) => {
    setPhase('generating')
    cancelledRef.current = false

    // Filter sections: level <= 3, non-content removed
    const allSections = structure.sections.filter(s => s.level <= 3)
    const sections = allSections.filter(s => !isNonContentSection(s.title))

    // Skip container sections (level 1 with children)
    const contentSections = sections.filter(section => {
      if (section.level === 1) {
        const hasChildren = sections.some(s => s.parentId === section.id)
        if (hasChildren) {
          console.log(`[StudyMind] SKIP container: "${section.title}" (has children)`)
          return false
        }
      }
      return true
    })

    setProgress({ current: 0, total: contentSections.length })

    const skippedCount = contentSections.filter(s => skipIds.has(s.id)).length
    const toGenerate = contentSections.length - skippedCount
    console.log('[StudyMind] generateGuides (deep) start:', {
      provider, model,
      totalSections: contentSections.length,
      skipping: skippedCount,
      toGenerate,
    })

    const normFullCached = precomputeNormalized(document.fullText)

    for (let i = 0; i < contentSections.length; i++) {
      if (cancelledRef.current) break

      const section = contentSections[i]

      if (skipIds.has(section.id)) {
        setProgress({ current: i + 1, total: contentSections.length })
        continue
      }

      // Build display label with page info
      const pageInfo = section.bookPage
        ? ` (p.${section.bookPage})`
        : section.pageStart
          ? ` (pág.${section.pageStart}${section.pageEnd ? `-${section.pageEnd}` : ''})`
          : ''
      const sectionLabel = `${section.title}${pageInfo}`

      setGeneratingTopic(sectionLabel)
      setProgress({ current: i, total: contentSections.length })

      try {
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

        console.log(`[StudyMind] Processing "${section.title}"${pageInfo} — ${sectionText.length} chars, confidence: ${confidence}`)

        let topic

        if (sectionText.length >= DEEP_MODE_THRESHOLD) {
          // Deep mode: multi-pass
          topic = await generateDeep(
            section, sectionText, structure,
            { provider, model },
            (passMsg) => setGeneratingTopic(`${sectionLabel} — ${passMsg}`)
          )
        } else {
          // Standard mode: single call
          topic = await generateStandard(section, sectionText, structure, { provider, model })
        }

        if (topic) {
          topic.confidence = confidence
          await addTopic(documentId, topic)
          console.log(`[StudyMind] ✓ "${section.title}" — mode: ${topic.mode}, deepExplanation: ${topic.deepExplanation?.length || 0} chars`)
        }

        // Delay between sections
        if (i < contentSections.length - 1 && !cancelledRef.current) {
          await sleep(INTER_REQUEST_DELAY[provider] || 1000)
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
      setProgress({ current: contentSections.length, total: contentSections.length })
      setPhase('ready')
    } else {
      setPhase('stopped')
    }

    return { completed, total: contentSections.length }
  }, [streamRequest, setPhase, setGeneratingTopic, setProgress, addTopic])

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true
    cancelStream()
  }, [cancelStream])

  // Regenerate a single section (always deep for long sections)
  const regenerateSection = useCallback(async (documentId, document, structure, sectionId, { provider, model }) => {
    const section = structure.sections.find(s => s.id === sectionId)
    if (!section) return

    setGeneratingTopic(section.title)

    try {
      const { text: sectionText, confidence } = extractSectionTextByPages(
        document,
        structure.sections,
        section.id
      )

      if (!isValidSectionText(sectionText)) {
        throw new Error(`Texto insuficiente para "${section.title}"`)
      }

      let topic

      if (sectionText.length >= DEEP_MODE_THRESHOLD) {
        topic = await generateDeep(
          section, sectionText, structure,
          { provider, model },
          (passMsg) => setGeneratingTopic(`${section.title} — ${passMsg}`)
        )
      } else {
        topic = await generateStandard(section, sectionText, structure, { provider, model })
      }

      if (topic) {
        topic.confidence = confidence
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
