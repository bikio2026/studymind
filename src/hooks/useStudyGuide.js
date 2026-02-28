import { useCallback, useRef } from 'react'
import { useLLMStream } from './useLLMStream'
import { buildStudyGuidePrompt } from '../lib/promptBuilder'
import { extractSectionText, chunkText } from '../lib/chunkProcessor'
import { useStudyStore } from '../stores/studyStore'

export function useStudyGuide() {
  const { streamRequest } = useLLMStream()
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

  const generateGuides = useCallback(async (documentId, document, structure, { provider, model }) => {
    setPhase('generating')
    cancelledRef.current = false

    // Process chapters and top-level sections
    const sections = structure.sections.filter(s => s.level <= 2)
    setProgress({ current: 0, total: sections.length })

    const allTitles = sections.map(s => s.title)

    for (let i = 0; i < sections.length; i++) {
      if (cancelledRef.current) break

      const section = sections[i]
      setGeneratingTopic(section.title)
      setProgress({ current: i, total: sections.length })

      try {
        const sectionText = extractSectionText(
          document.fullText,
          structure.sections,
          section.id
        )

        if (!sectionText || sectionText.length < 50) {
          console.warn(`[StudyMind] SKIP "${section.title}" — text length: ${sectionText?.length || 0}`)
          continue
        }
        console.log(`[StudyMind] OK "${section.title}" — text length: ${sectionText.length}`)

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
          const topic = {
            id: section.id,
            sectionTitle: section.title,
            level: section.level,
            relevance: guide.relevance || 'supporting',
            summary: guide.summary || '',
            keyConcepts: guide.keyConcepts || [],
            expandedExplanation: guide.expandedExplanation || guide.expandedExplantion || '',
            connections: guide.connections || [],
            quiz: guide.quiz || [],
          }
          // Persist to IDB + update store
          await addTopic(documentId, topic)
        }
      } catch (err) {
        console.error(`Error generando guía para "${section.title}":`, err)
      }
    }

    setProgress({ current: sections.length, total: sections.length })
    setGeneratingTopic(null)
    setPhase('ready')
  }, [streamRequest, setPhase, setGeneratingTopic, setProgress, addTopic])

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true
  }, [])

  // Generate a single section (for regeneration)
  const regenerateSection = useCallback(async (documentId, document, structure, sectionId, { provider, model }) => {
    const section = structure.sections.find(s => s.id === sectionId)
    if (!section) return

    setGeneratingTopic(section.title)

    try {
      const sectionText = extractSectionText(
        document.fullText,
        structure.sections,
        section.id
      )

      if (!sectionText || sectionText.length < 50) {
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
        const topic = {
          id: section.id,
          sectionTitle: section.title,
          level: section.level,
          relevance: guide.relevance || 'supporting',
          summary: guide.summary || '',
          keyConcepts: guide.keyConcepts || [],
          expandedExplanation: guide.expandedExplanation || guide.expandedExplantion || '',
          connections: guide.connections || [],
          quiz: guide.quiz || [],
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
