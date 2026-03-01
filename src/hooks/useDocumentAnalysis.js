import { useState, useCallback } from 'react'
import { useLLMStream } from './useLLMStream'
import { buildStructurePrompt } from '../lib/promptBuilder'
import { getSampledText, parseTOCEntries, detectPageOffset, tocEntriesToStructure } from '../lib/textUtils'

export function useDocumentAnalysis() {
  const [structure, setStructure] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const { streamRequest } = useLLMStream()

  const analyzeStructure = useCallback(async (document, { provider, model }) => {
    setAnalyzing(true)
    setError(null)

    try {
      // Try local TOC parsing first (no LLM needed)
      const tocText = document.tocText || null
      if (tocText) {
        const tocEntries = parseTOCEntries(tocText)
        if (tocEntries.length >= 5) {
          console.log(`[StudyMind] Using local TOC parser: ${tocEntries.length} entries detected`)
          const pageOffset = detectPageOffset(document.pages, tocEntries)
          const sections = tocEntriesToStructure(tocEntries, pageOffset)

          // Infer title from first page or TOC header
          const titleMatch = tocText.match(/^(.{5,80}?)[\n\r]/) || document.pages?.[0]?.text?.match(/^(.{5,80}?)[\n\r]/)
          const title = titleMatch?.[1]?.trim() || document.fileName || 'Documento'

          const parsed = { title, author: null, sections }
          setStructure(parsed)
          return parsed
        }
        console.log(`[StudyMind] Local TOC parse insufficient (${tocEntries.length} entries), falling back to LLM`)
      }

      // Fallback: LLM-based structure detection
      // Use more text budget for Claude to get better structure detection
      const maxTokens = provider === 'groq' ? 2500 : 12000
      const sampledText = getSampledText(document.pages, maxTokens, tocText)
      const prompt = buildStructurePrompt(sampledText, document.totalPages, document.pageRange || null)

      let fullText = ''
      await streamRequest(prompt, {
        provider,
        model,
        promptVersion: 'structure',
        maxTokens: 4096,
        onToken: (text) => { fullText = text },
        onDone: (text) => { fullText = text },
        onError: (err) => { throw new Error(err) },
      })

      // Strip markdown code blocks (some models wrap JSON in ```json ... ```)
      let cleaned = fullText.replace(/```(?:json)?\s*/gi, '').replace(/```\s*/g, '')

      // Parse JSON from response
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('[StudyMind] Raw LLM response (first 500 chars):', fullText.slice(0, 500))
        throw new Error('No se detectó estructura válida. Intentá con otro modelo.')
      }

      let parsed
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch (parseErr) {
        console.error('[StudyMind] JSON parse error:', parseErr.message)
        console.error('[StudyMind] Extracted JSON (first 300 chars):', jsonMatch[0].slice(0, 300))
        throw new Error('La respuesta del modelo no es JSON válido. Intentá de nuevo.')
      }

      // Ensure sections have sequential ids
      if (parsed.sections) {
        parsed.sections = parsed.sections.map((s, i) => ({
          ...s,
          id: s.id || i + 1,
        }))
      }

      setStructure(parsed)
      return parsed
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setAnalyzing(false)
    }
  }, [streamRequest])

  return { structure, analyzing, error, analyzeStructure, setStructure }
}
