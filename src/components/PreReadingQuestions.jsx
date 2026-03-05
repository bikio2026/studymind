import { useState, useEffect } from 'react'
import { Lightbulb, ChevronDown, ChevronUp, Plus, X, Loader2, Sparkles, Send, Eye, BookOpen } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'
import { useLLMStream } from '../hooks/useLLMStream'
import { buildPreReadingEvalPrompt } from '../lib/promptBuilder'

export default function PreReadingQuestions({ topic, documentId, provider, language, onGenerate }) {
  const { t } = useTranslation()
  const storageKey = `studymind-prq-custom-${topic.id}`
  const answersKey = `studymind-prq-answers-${topic.id}`

  // Collapse state: expanded on first visit, collapsed after
  const visitKey = `studymind-visited-${topic.id}`
  const [expanded, setExpanded] = useState(() => !localStorage.getItem(visitKey))
  const [customQuestions, setCustomQuestions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]') } catch { return [] }
  })
  const [savedAnswers, setSavedAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(answersKey) || '{}') } catch { return {} }
  })
  const [newQ, setNewQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [answeringIdx, setAnsweringIdx] = useState(null) // which question is being answered
  const [draftAnswer, setDraftAnswer] = useState('')
  const [evaluatingIdx, setEvaluatingIdx] = useState(null)
  const { streamRequest } = useLLMStream()

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

  // Toggle answer input for a question
  const toggleAnswer = (idx) => {
    if (answeringIdx === idx) {
      setAnsweringIdx(null)
      setDraftAnswer('')
    } else {
      setAnsweringIdx(idx)
      setDraftAnswer('')
    }
  }

  // Evaluate a pre-reading answer
  const evaluateAnswer = async (idx) => {
    const question = allQuestions[idx]
    const answer = draftAnswer.trim()
    if (!answer || answer.length < 5) return

    setEvaluatingIdx(idx)
    try {
      const prompt = buildPreReadingEvalPrompt(question, answer, topic.summary, language)
      const fullText = await streamRequest(prompt, {
        provider: provider || 'claude',
        model: 'claude-haiku-4-5-20251001',
        promptVersion: 'preReadingEval',
        maxTokens: 512,
        language,
        onToken: () => {},
        onDone: () => {},
        onError: (err) => { throw new Error(err) },
      })

      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid response')

      const result = JSON.parse(jsonMatch[0])
      const answerData = {
        answer,
        feedback: result.feedback || '',
        lookForWhenReading: result.lookForWhenReading || [],
        connections: result.connections || [],
      }

      const updated = { ...savedAnswers, [idx]: answerData }
      setSavedAnswers(updated)
      localStorage.setItem(answersKey, JSON.stringify(updated))
      setAnsweringIdx(null)
      setDraftAnswer('')
    } catch (err) {
      console.error('[PreReadingQuestions] Eval error:', err)
    } finally {
      setEvaluatingIdx(null)
    }
  }

  // Clear a saved answer
  const clearAnswer = (idx) => {
    const updated = { ...savedAnswers }
    delete updated[idx]
    setSavedAnswers(updated)
    localStorage.setItem(answersKey, JSON.stringify(updated))
  }

  const answeredCount = Object.keys(savedAnswers).length

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
              {answeredCount > 0 ? `${answeredCount}/${allQuestions.length}` : allQuestions.length}
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
            <div className="space-y-3">
              {allQuestions.map((q, i) => {
                const isCustom = i >= aiQuestions.length
                const customIdx = i - aiQuestions.length
                const saved = savedAnswers[i]
                const isAnswering = answeringIdx === i
                const isEvaluating = evaluatingIdx === i

                return (
                  <div key={i} className="space-y-2">
                    {/* Question row */}
                    <div className="flex items-start gap-2 group">
                      <span className="text-accent/40 text-xs mt-0.5 shrink-0">{i + 1}.</span>
                      <p className="text-sm text-text-dim leading-relaxed flex-1">{q}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        {!saved && (
                          <button
                            onClick={() => toggleAnswer(i)}
                            className={`p-1 rounded transition-all text-text-muted hover:text-accent ${
                              isAnswering ? 'bg-accent/10 text-accent' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            title={t('preReading.answer')}
                          >
                            <Send className="w-3 h-3" />
                          </button>
                        )}
                        {isCustom && (
                          <button
                            onClick={() => removeCustom(customIdx)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-error transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Answer input */}
                    {isAnswering && !saved && (
                      <div className="ml-5 space-y-2 animate-fadeIn">
                        <textarea
                          value={draftAnswer}
                          onChange={(e) => setDraftAnswer(e.target.value)}
                          placeholder={t('preReading.answerPlaceholder')}
                          disabled={isEvaluating}
                          className="w-full bg-surface/50 border border-surface-light/30 rounded-lg px-3 py-2
                            text-xs text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/40
                            resize-y min-h-[60px] disabled:opacity-50"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setAnsweringIdx(null); setDraftAnswer('') }}
                            className="text-[10px] text-text-muted px-2 py-1"
                          >
                            {t('common.cancel')}
                          </button>
                          <button
                            onClick={() => evaluateAnswer(i)}
                            disabled={!draftAnswer.trim() || draftAnswer.trim().length < 5 || isEvaluating}
                            className="text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1
                              bg-accent/10 text-accent hover:bg-accent/15 border border-accent/20
                              disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {isEvaluating ? (
                              <><Loader2 className="w-2.5 h-2.5 animate-spin" /> {t('common.processing')}</>
                            ) : (
                              <><Send className="w-2.5 h-2.5" /> {t('preReading.evaluate')}</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Saved answer with feedback */}
                    {saved && (
                      <div className="ml-5 space-y-2 animate-fadeIn">
                        {/* Student's answer */}
                        <div className="text-xs text-text-muted bg-surface-light/30 rounded-lg px-3 py-2 italic">
                          {saved.answer}
                        </div>
                        {/* Feedback */}
                        {saved.feedback && (
                          <p className="text-xs text-text-dim leading-relaxed pl-3 border-l-2 border-accent/30">
                            {saved.feedback}
                          </p>
                        )}
                        {/* Look for when reading */}
                        {saved.lookForWhenReading?.length > 0 && (
                          <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Eye className="w-3 h-3 text-blue-400" />
                              <span className="text-[10px] font-medium text-blue-400">{t('preReading.lookFor')}</span>
                            </div>
                            <ul className="space-y-1">
                              {saved.lookForWhenReading.map((item, j) => (
                                <li key={j} className="text-[11px] text-text-dim flex items-start gap-1.5">
                                  <span className="text-blue-400/50 mt-0.5">•</span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Connections */}
                        {saved.connections?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {saved.connections.map((conn, j) => (
                              <span key={j} className="text-[10px] bg-accent/10 text-accent/80 px-2 py-0.5 rounded-full border border-accent/15">
                                <BookOpen className="w-2.5 h-2.5 inline mr-0.5" />{conn}
                              </span>
                            ))}
                          </div>
                        )}
                        {/* Clear button */}
                        <button
                          onClick={() => clearAnswer(i)}
                          className="text-[10px] text-text-muted hover:text-accent transition-colors"
                        >
                          {t('preReading.clearAnswer')}
                        </button>
                      </div>
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
