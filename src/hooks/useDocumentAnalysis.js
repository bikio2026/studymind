import { useState, useCallback } from 'react'
import { useLLMStream } from './useLLMStream'
import { buildStructurePrompt } from '../lib/promptBuilder'
import { getSampledText } from '../lib/textUtils'

export function useDocumentAnalysis() {
  const [structure, setStructure] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const { streamRequest } = useLLMStream()

  const analyzeStructure = useCallback(async (document, { provider, model }) => {
    setAnalyzing(true)
    setError(null)

    try {
      const sampledText = getSampledText(document.pages)
      const prompt = buildStructurePrompt(sampledText, document.totalPages)

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

      // Parse JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No se detectó estructura válida en la respuesta')

      const parsed = JSON.parse(jsonMatch[0])

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
