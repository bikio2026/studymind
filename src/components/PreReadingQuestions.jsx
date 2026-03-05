import { useState, useEffect } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Plus, X, Loader2, Sparkles } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'

export default function PreReadingQuestions({ topic, documentId, provider, language, onGenerate }) {
  const { t } = useTranslation()
  const storageKey = `studymind-prq-custom-${topic.id}`

  // Collapse state: expanded on first visit, collapsed after
  const visitKey = `studymind-visited-${topic.id}`
  const [expanded, setExpanded] = useState(() => !localStorage.getItem(visitKey))
  const [customQuestions, setCustomQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [newQ, setNewQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Mark as visited on first render
  useEffect(() => { localStorage.setItem(visitKey, '1') }, [visitKey])

  const aiQuestions = topic.preReadingQuestions || []
  const allQuestions = [...aiQuestions, ...customQuestions]
  const hasQuestions = allQuestions.length > 0

  const addCustom = () => {
    if (!newQ.trim()) return
    const updated = [...customQuestions, newQ.trim()]
    setCustomQuestions(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
    setNewQ('')
    setShowAdd(false)
  }

  const removeCustom = (idx) => {
    const updated = customQuestions.filter((_, i) => i !== idx)
    setCustomQuestions(updated)
    localStorage.setItem(storageKey, JSON.stringify(updated))
  }

  const handleGenerate = async () => {
    if (!onGenerate) return
    setGenerating(true)
    try { await onGenerate() } finally { setGenerating(false) }
  }

  return (
    <div className="mb-4 rounded-xl bg-accent/5 border border-accent/15 overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium text-accent">
            {t('preReading.title')}
          </span>
          {hasQuestions && (
            <span className="text-[10px] text-accent/60 bg-accent/10 px-1.5 py-0.5 rounded-full">
              {allQuestions.length}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-3.5 h-3.5 text-accent/50" /> : <ChevronDown className="w-3.5 h-3.5 text-accent/50" />}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4">
          {!hasQuestions && !generating ? (
            <div className="text-center py-3">
              <p className="text-xs text-text-muted mb-2">{t('preReading.empty')}</p>
              {onGenerate && (
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg
                    bg-accent/10 hover:bg-accent/15 text-xs font-medium text-accent
                    border border-accent/20 transition-colors"
                >
                  <Sparkles className="w-3 h-3" />
                  {t('preReading.generate')}
                </button>
              )}
            </div>
          ) : generating ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-accent">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {t('common.processing')}
            </div>
          ) : (
            <div className="space-y-2">
              {allQuestions.map((q, i) => {
                const isCustom = i >= aiQuestions.length
                const customIdx = i - aiQuestions.length
                return (
                  <div key={i} className="flex items-start gap-2 group">
                    <span className="text-accent/40 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                    <p className="text-sm text-text-dim leading-relaxed flex-1">{q}</p>
                    {isCustom && (
                      <button
                        onClick={() => removeCustom(customIdx)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-error transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Add custom question */}
          {hasQuestions && (
            <div className="mt-3 pt-2 border-t border-accent/10">
              {showAdd ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQ}
                    onChange={(e) => setNewQ(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                    placeholder={t('preReading.addPlaceholder')}
                    className="flex-1 bg-surface/50 border border-surface-light/30 rounded-lg px-2.5 py-1.5
                      text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40"
                    autoFocus
                  />
                  <button onClick={addCustom} className="text-xs text-accent px-2">{t('common.add')}</button>
                  <button onClick={() => { setShowAdd(false); setNewQ('') }} className="text-xs text-text-muted px-1">{t('common.cancel')}</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdd(true)}
                  className="flex items-center gap-1 text-[10px] text-text-muted hover:text-accent transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  {t('preReading.addOwn')}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
