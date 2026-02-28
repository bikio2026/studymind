import { useState, useCallback } from 'react'
import { extractTextFromPDF } from '../lib/pdfExtractor'

export function usePDFParser() {
  const [document, setDocument] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  const parseFile = useCallback(async (file) => {
    setParsing(true)
    setError(null)
    setProgress({ current: 0, total: 0, phase: 'parsing' })

    try {
      const result = await extractTextFromPDF(file, setProgress)
      const doc = {
        fileName: file.name,
        fileSize: file.size,
        ...result,
      }
      setDocument(doc)
      return doc
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setParsing(false)
    }
  }, [])

  const reset = useCallback(() => {
    setDocument(null)
    setParsing(false)
    setProgress(null)
    setError(null)
  }, [])

  return { document, parsing, progress, error, parseFile, reset }
}
