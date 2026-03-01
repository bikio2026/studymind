import { useState, useEffect, useRef } from 'react'
import { Loader2, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { db } from '../lib/db'
import { extractSectionTextByPages } from '../lib/chunkProcessor'

const CONFIDENCE_BADGE = {
  high: { label: 'Coincidencia alta', icon: CheckCircle, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  medium: { label: 'Coincidencia media', icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  low: { label: 'Coincidencia baja', icon: AlertTriangle, color: 'text-error', bg: 'bg-error/10', border: 'border-error/20' },
}

// In-memory cache to avoid re-fetching from IDB
const sourceCache = new Map()

export default function SourceTextViewer({ documentId, topicId, sections }) {
  const [state, setState] = useState({ status: 'idle', text: '', confidence: 'low' })
  const loadedRef = useRef(false)

  useEffect(() => {
    // Reset when topic changes
    loadedRef.current = false
    const cacheKey = `${documentId}_${topicId}`
    const cached = sourceCache.get(cacheKey)
    if (cached) {
      setState({ status: 'loaded', ...cached })
      loadedRef.current = true
      return
    }

    // Load from IDB
    setState({ status: 'loading', text: '', confidence: 'low' })
    let cancelled = false

    async function load() {
      try {
        const pageData = await db.getPageData(documentId)
        if (cancelled) return

        if (!pageData || (!pageData.pages?.length && !pageData.fullText)) {
          setState({ status: 'empty', text: '', confidence: 'low' })
          return
        }

        // Build document object expected by extractSectionTextByPages
        const document = {
          pages: pageData.pages || [],
          fullText: pageData.fullText || pageData.pages?.map(p => p.text).join('\n\n') || '',
        }

        const result = extractSectionTextByPages(document, sections, topicId)
        if (cancelled) return

        if (!result.text) {
          setState({ status: 'empty', text: '', confidence: 'low' })
          return
        }

        const data = { text: result.text, confidence: result.confidence }
        sourceCache.set(cacheKey, data)
        setState({ status: 'loaded', ...data })
        loadedRef.current = true
      } catch (err) {
        if (!cancelled) {
          console.error('[SourceTextViewer] Error loading source text:', err)
          setState({ status: 'error', text: '', confidence: 'low' })
        }
      }
    }

    load()
    return () => { cancelled = true }
  }, [documentId, topicId, sections])

  if (state.status === 'loading' || state.status === 'idle') {
    return (
      <div className="flex items-center justify-center py-8 text-text-muted">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Cargando texto fuente...</span>
      </div>
    )
  }

  if (state.status === 'empty') {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-text-muted">
          No se encontró texto fuente para esta sección en el PDF original.
        </p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-error/70">
          Error al cargar el texto fuente. Intentá recargar la página.
        </p>
      </div>
    )
  }

  const badge = CONFIDENCE_BADGE[state.confidence] || CONFIDENCE_BADGE.low
  const BadgeIcon = badge.icon

  return (
    <div className="space-y-3">
      {/* Confidence badge */}
      <div className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${badge.color} ${badge.bg} border ${badge.border}`}>
        <BadgeIcon className="w-3 h-3" />
        <span>{badge.label}</span>
      </div>

      {/* Source text */}
      <div className="max-h-[500px] overflow-y-auto rounded-lg bg-surface/60 border border-surface-light/50 p-4 scrollbar-thin">
        <p className="text-sm text-text-dim leading-relaxed whitespace-pre-line font-mono text-[13px]">
          {state.text}
        </p>
      </div>

      <p className="text-[11px] text-text-muted/60">
        Texto extraído directamente del PDF. Puede contener artefactos de formato.
      </p>
    </div>
  )
}
