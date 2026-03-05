import { useState, useEffect, useMemo } from 'react'
import { BookOpen, FileText, Layers, Sparkles, Loader2, ChevronRight } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'

const RELEVANCE_COLORS = {
  core: { bg: 'bg-amber-500/15', text: 'text-amber-500', dot: 'bg-amber-500' },
  supporting: { bg: 'bg-blue-500/15', text: 'text-blue-500', dot: 'bg-blue-500' },
  detail: { bg: 'bg-gray-500/15', text: 'text-gray-400', dot: 'bg-gray-400' },
}

export default function BookIntro({ structure, topics, documentId, language, provider, onNavigateToTopic }) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)

  // Load cached summary
  useEffect(() => {
    const cached = localStorage.getItem(`studymind-intro-${documentId}`)
    if (cached) setSummary(cached)
  }, [documentId])

  // Stats
  const stats = useMemo(() => {
    const core = topics.filter(t => t.relevance === 'core').length
    const supporting = topics.filter(t => t.relevance === 'supporting').length
    const detail = topics.filter(t => t.relevance === 'detail').length
    const totalPages = structure.sections?.reduce((max, s) => Math.max(max, s.pageEnd || s.pageStart || 0), 0) || 0
    return { core, supporting, detail, total: topics.length, totalPages }
  }, [topics, structure])

  // Table of contents: level 1-2 sections with relevance dots
  const toc = useMemo(() => {
    if (!structure?.sections?.length) return []
    const topicMap = {}
    topics.forEach(t => { topicMap[t.id || t.sectionId] = t })

    return structure.sections
      .filter(s => s.level <= 2)
      .map(s => ({
        id: s.id,
        title: s.title,
        level: s.level,
        topic: topicMap[s.id],
        pageStart: s.pageStart,
      }))
  }, [structure, topics])

  const generateSummary = async () => {
    setGenerating(true)
    setError(null)
    try {
      const sectionTitles = structure.sections
        .filter(s => s.level <= 2)
        .map(s => s.title)
        .join('\n- ')

      const prompt = language === 'es'
        ? `Sos un tutor académico. Dado un libro titulado "${structure.title || 'Sin título'}" con las siguientes secciones:\n- ${sectionTitles}\n\nEscribí una introducción de 2-3 párrafos en español que explique de qué trata este libro, qué temas principales cubre y cómo se conectan entre sí. Usá un tono accesible y motivador para un estudiante. No uses formato markdown, solo texto plano.`
        : `You are an academic tutor. Given a book titled "${structure.title || 'Untitled'}" with the following sections:\n- ${sectionTitles}\n\nWrite a 2-3 paragraph introduction in English that explains what this book covers, its main topics, and how they connect. Use an accessible, motivating tone for a student. Don't use markdown formatting, just plain text.`

      const endpoint = provider === 'groq' ? '/api/analyze-groq' : '/api/analyze-claude'
      const apiBase = import.meta.env.VITE_API_URL || ''
      const secret = import.meta.env.VITE_APP_SECRET || ''

      const res = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(secret ? { 'x-api-secret': secret } : {}),
        },
        body: JSON.stringify({
          prompt,
          promptVersion: 'freeform',
          provider,
          model: provider === 'groq' ? 'llama-3.3-70b-versatile' : 'claude-haiku-4-5-20251001',
          maxTokens: 1024,
          language,
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)

      // Read streaming response
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        fullText += decoder.decode(value, { stream: true })
      }

      // Clean SSE format
      const cleaned = fullText
        .split('\n')
        .filter(line => line.startsWith('data: '))
        .map(line => {
          const data = line.slice(6)
          if (data === '[DONE]') return ''
          try {
            const parsed = JSON.parse(data)
            return parsed.token || parsed.text || parsed.content || ''
          } catch {
            return data
          }
        })
        .join('')

      const result = cleaned || fullText
      setSummary(result)
      localStorage.setItem(`studymind-intro-${documentId}`, result)
    } catch (err) {
      console.error('[BookIntro] Generate summary error:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="bg-surface-alt rounded-2xl p-6 border border-surface-light/30">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-accent/10 shrink-0">
            <BookOpen className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-text leading-tight">
              {structure.title || t('intro.untitled')}
            </h2>
            {structure.author && (
              <p className="text-sm text-text-muted mt-1">{structure.author}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-3 mt-5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light/30">
            <FileText className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-dim">
              {stats.totalPages > 0 ? `${stats.totalPages} ${t('intro.pages')}` : `${stats.total} ${t('intro.topics')}`}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-light/30">
            <Layers className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-dim">{stats.total} {t('intro.topics')}</span>
          </div>
          {Object.entries(RELEVANCE_COLORS).map(([key, colors]) => {
            const count = stats[key]
            if (!count) return null
            return (
              <div key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${colors.bg}`}>
                <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                <span className={`text-xs font-medium ${colors.text}`}>{count} {t(`relevance.${key}`)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* AI Summary */}
      <div className="bg-surface-alt rounded-2xl p-6 border border-surface-light/30">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text">{t('intro.overview')}</h3>
        </div>

        {summary ? (
          <div>
            <div className="text-sm text-text-dim leading-relaxed whitespace-pre-line">
              {summary}
            </div>
            <button
              onClick={() => { setSummary(null); localStorage.removeItem(`studymind-intro-${documentId}`) }}
              className="text-[10px] text-text-muted hover:text-accent mt-2 transition-colors"
            >
              {t('intro.regenerate') || 'Regenerar'}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            {error && (
              <p className="text-xs text-error mb-3">{error}</p>
            )}
            <button
              onClick={generateSummary}
              disabled={generating}
              className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg bg-accent/10 hover:bg-accent/15
                border border-accent/20 text-sm font-medium text-accent hover:text-accent/80
                transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t('intro.generateSummary')}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Table of Contents */}
      <div className="bg-surface-alt rounded-2xl p-6 border border-surface-light/30">
        <h3 className="text-sm font-semibold text-text mb-4">{t('intro.tableOfContents')}</h3>
        <div className="space-y-1">
          {toc.map((item) => {
            const colors = item.topic ? RELEVANCE_COLORS[item.topic.relevance] || RELEVANCE_COLORS.detail : null
            const isClickable = !!item.topic

            return (
              <button
                key={item.id}
                onClick={() => isClickable && onNavigateToTopic(item.id)}
                disabled={!isClickable}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                  isClickable
                    ? 'hover:bg-surface-light/50 cursor-pointer'
                    : 'opacity-40 cursor-default'
                } ${item.level === 1 ? '' : 'ml-4'}`}
              >
                {colors ? (
                  <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
                ) : (
                  <div className="w-2 h-2 rounded-full shrink-0 bg-surface-light" />
                )}
                <span className={`text-sm flex-1 truncate ${
                  item.level === 1 ? 'font-medium text-text' : 'text-text-dim'
                }`}>
                  {item.title}
                </span>
                {item.pageStart && (
                  <span className="text-[10px] text-text-muted shrink-0">p.{item.pageStart}</span>
                )}
                {isClickable && (
                  <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
