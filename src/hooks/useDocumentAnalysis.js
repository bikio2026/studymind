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

    // Page range for filtering sections (original PDF page numbers)
    const pageRange = document.pageRange || null

    try {
      // Try local TOC parsing first (no LLM needed)
      const tocText = document.tocText || null
      if (tocText) {
        let tocEntries = parseTOCEntries(tocText)
        const pageOffset = detectPageOffset(document.pages, tocEntries)

        // Filter TOC entries to selected page range (overlap-based)
        if (pageRange && tocEntries.length > 0) {
          const beforeFilter = tocEntries.length
          // Build end-page map for overlap detection
          const sortedEntries = [...tocEntries].sort((a, b) => a.pageNumber - b.pageNumber)
          const entryEndMap = new Map()
          for (let i = 0; i < sortedEntries.length; i++) {
            const nextPage = i < sortedEntries.length - 1 ? sortedEntries[i + 1].pageNumber + pageOffset : Infinity
            entryEndMap.set(sortedEntries[i], nextPage)
          }
          tocEntries = tocEntries.filter(entry => {
            const pdfPage = entry.pageNumber + pageOffset
            const entryEnd = entryEndMap.get(entry) || Infinity
            return pdfPage <= pageRange.end && entryEnd > pageRange.start
          })
          console.log(`[StudyMind] TOC filtered by page range ${pageRange.start}-${pageRange.end}: ${beforeFilter} → ${tocEntries.length} entries`)
        }

        if (tocEntries.length >= 5) {
          console.log(`[StudyMind] Using local TOC parser: ${tocEntries.length} entries detected`)
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

        // Compute pageStart from bookPage + offset (LLM only returns bookPage)
        if (parsed.sections.some(s => s.bookPage) && document.pages?.length) {
          const fakeEntries = parsed.sections
            .filter(s => s.bookPage)
            .map(s => ({ title: s.title, pageNumber: s.bookPage }))
          const pageOffset = detectPageOffset(document.pages, fakeEntries)
          console.log(`[StudyMind] LLM sections: computing pageStart from bookPage + offset (${pageOffset})`)

          parsed.sections = parsed.sections.map(s => ({
            ...s,
            pageStart: s.bookPage ? s.bookPage + pageOffset : s.pageStart || null,
          }))
        }

        // Filter LLM sections by page range (overlap-based, not strict containment)
        // A section is kept if its content overlaps with the selected range
        if (pageRange && parsed.sections.some(s => s.pageStart)) {
          const before = parsed.sections.length

          // Build end-page map: each section "ends" where the next one begins
          const withPages = parsed.sections.filter(s => s.pageStart).sort((a, b) => a.pageStart - b.pageStart)
          const sectionEndMap = new Map()
          for (let i = 0; i < withPages.length; i++) {
            sectionEndMap.set(withPages[i], i < withPages.length - 1 ? withPages[i + 1].pageStart : Infinity)
          }

          parsed.sections = parsed.sections.filter(s => {
            if (!s.pageStart) return true
            const sectionEnd = sectionEndMap.get(s) || Infinity
            // Overlap: [pageStart, sectionEnd) ∩ [rangeStart, rangeEnd] ≠ ∅
            return s.pageStart <= pageRange.end && sectionEnd > pageRange.start
          })
          // Re-index ids after filtering
          parsed.sections = parsed.sections.map((s, i) => ({ ...s, id: i + 1 }))
          // Re-assign parentIds (clear broken refs)
          const validIds = new Set(parsed.sections.map(s => s.id))
          parsed.sections = parsed.sections.map(s => ({
            ...s,
            parentId: s.parentId && validIds.has(s.parentId) ? s.parentId : null,
          }))
          if (before !== parsed.sections.length) {
            console.log(`[StudyMind] LLM sections filtered by page range: ${before} → ${parsed.sections.length}`)
          }
        }
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
