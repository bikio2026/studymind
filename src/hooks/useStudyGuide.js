import { useState, useCallback, useRef } from 'react'
import { useLLMStream } from './useLLMStream'
import { buildStudyGuidePrompt } from '../lib/promptBuilder'
import { extractSectionText, chunkText } from '../lib/chunkProcessor'

export function useStudyGuide() {
  const [phase, setPhase] = useState('idle')
  const [topics, setTopics] = useState([])
  const [generatingTopic, setGeneratingTopic] = useState(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState(null)
  const { streamRequest } = useLLMStream()
  const cancelledRef = useRef(false)

  const generateGuides = useCallback(async (document, structure, { provider, model }) => {
    setPhase('generating')
    cancelledRef.current = false

    // Process chapters and top-level sections
    const sections = structure.sections.filter(s => s.level <= 2)
    setProgress({ current: 0, total: sections.length })

    const allTitles = sections.map(s => s.title)
    const newTopics = []

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

        if (!sectionText || sectionText.length < 50) continue

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
            studied: false,
            quizScore: null,
          }
          newTopics.push(topic)
          setTopics([...newTopics])
        }
      } catch (err) {
        console.error(`Error generando guía para "${section.title}":`, err)
        // Continue with next section
      }
    }

    setProgress({ current: sections.length, total: sections.length })
    setGeneratingTopic(null)
    setPhase('ready')
    return newTopics
  }, [streamRequest])

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true
  }, [])

  const markStudied = useCallback((topicId) => {
    setTopics(prev => prev.map(t =>
      t.id === topicId ? { ...t, studied: true } : t
    ))
  }, [])

  const setQuizScore = useCallback((topicId, score) => {
    setTopics(prev => prev.map(t =>
      t.id === topicId ? { ...t, quizScore: score } : t
    ))
  }, [])

  const reset = useCallback(() => {
    setPhase('idle')
    setTopics([])
    setGeneratingTopic(null)
    setProgress({ current: 0, total: 0 })
    setError(null)
    cancelledRef.current = true
  }, [])

  return {
    phase, setPhase,
    topics, setTopics,
    generatingTopic,
    progress,
    error, setError,
    generateGuides,
    cancelGeneration,
    markStudied,
    setQuizScore,
    reset,
  }
}
