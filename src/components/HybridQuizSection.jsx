import { useState, useRef } from 'react'
import { Check, X, RotateCcw, Send, Loader2, ChevronDown, ChevronUp, AlertTriangle, RefreshCw, Eye, PenLine } from 'lucide-react'
import { useLLMStream } from '../hooks/useLLMStream'
import { buildQuizEvaluationPrompt } from '../lib/promptBuilder'
import { useTranslation } from '../lib/useTranslation'
import { useFeatureStore } from '../stores/featureStore'

const BLOOM_COLORS = {
  recall: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' },
  understand: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  apply: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  analyze: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
}

function BloomBadge({ level }) {
  const { t } = useTranslation()
  if (!level) return null
  const c = BLOOM_COLORS[level] || BLOOM_COLORS.understand
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${c.bg} ${c.text} border ${c.border} ml-1.5`}>
      {t(`bloom.${level}`)}
    </span>
  )
}

function ScoreBadge({ score, classification }) {
  const { t } = useTranslation()
  const config = {
    correct: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: Check, labelKey: 'freeQuiz.correct' },
    partial: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', icon: AlertTriangle, labelKey: 'freeQuiz.partial' },
    incorrect: { bg: 'bg-error/10', border: 'border-error/30', text: 'text-error', icon: X, labelKey: 'freeQuiz.incorrect' },
  }
  const c = config[classification] || config.partial
  const Icon = c.icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <Icon className="w-3 h-3" />
      {t(c.labelKey)} ({score}%)
    </div>
  )
}

function ScoreBar({ score }) {
  const color = score >= 80 ? 'bg-success' : score >= 40 ? 'bg-amber-500' : 'bg-error'
  return (
    <div className="w-full h-1.5 bg-surface-light/50 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${score}%` }} />
    </div>
  )
}

export default function HybridQuizSection({ questions, topicContext, provider, language, onComplete, savedAnswers, onSaveAnswer, onResetAnswers }) {
  const { t } = useTranslation()
  const bloomEnabled = useFeatureStore(s => s.features.bloomBadges)

  // Per-question state: { mode: 'pending'|'self'|'freetext', revealed, selfAnswer, textAnswer, evaluation, score }
  const [questionStates, setQuestionStates] = useState(() => {
    // Load saved answers if available
    if (savedAnswers && Object.keys(savedAnswers).length > 0) {
      const states = {}
      for (const [idx, data] of Object.entries(savedAnswers)) {
        states[idx] = { ...data }
      }
      return states
    }
    return {}
  })
  const [evaluatingIdx, setEvaluatingIdx] = useState(null)
  const [error, setError] = useState(null)
  const [showModelAnswer, setShowModelAnswer] = useState({})
  const { streamRequest, cancel } = useLLMStream()
  const cancelledRef = useRef(false)
  const completedRef = useRef(
    // If loading saved answers that were already complete, mark as completed
    savedAnswers && Object.keys(savedAnswers).length === questions.length &&
    Object.values(savedAnswers).every(s => s.score !== undefined)
  )

  const getState = (idx) => questionStates[idx] || { mode: 'pending' }

  const completedCount = Object.values(questionStates).filter(s => s.score !== undefined).length
  const allCompleted = completedCount === questions.length

  const checkAllCompleted = (states) => {
    const done = Object.values(states).filter(s => s.score !== undefined).length
    if (done === questions.length && !completedRef.current) {
      completedRef.current = true
      const avgScore = Math.round(
        Object.values(states).reduce((sum, s) => sum + (s.score || 0), 0) / questions.length
      )
      onComplete?.(avgScore)
    }
  }

  // Choose mode for a question
  const chooseMode = (idx, mode) => {
    setQuestionStates(prev => ({ ...prev, [idx]: { ...(prev[idx] || {}), mode } }))
  }

  // --- Self-assessment ---
  const revealAndChooseSelf = (idx) => {
    setQuestionStates(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), mode: 'self', revealed: true },
    }))
  }

  const markSelfAnswer = (idx, correct) => {
    const score = correct ? 100 : 0
    setQuestionStates(prev => {
      const updated = { ...prev, [idx]: { ...prev[idx], selfAnswer: correct, score } }
      checkAllCompleted(updated)
      // Persist this answer
      onSaveAnswer?.(idx, { mode: 'self', revealed: true, selfAnswer: correct, score })
      return updated
    })
  }

  // --- Free text ---
  const handleTextChange = (idx, text) => {
    setQuestionStates(prev => ({
      ...prev,
      [idx]: { ...(prev[idx] || {}), textAnswer: text },
    }))
  }

  const evaluateAnswer = async (idx) => {
    const q = questions[idx]
    const state = questionStates[idx]
    const userAnswer = state?.textAnswer?.trim()
    if (!userAnswer || userAnswer.length < 10) return

    setEvaluatingIdx(idx)
    setError(null)
    cancelledRef.current = false

    const prompt = buildQuizEvaluationPrompt(
      q.question,
      q.answer,
      userAnswer,
      topicContext,
      language
    )

    try {
      const fullText = await streamRequest(prompt, {
        provider: provider || 'claude',
        model: 'claude-haiku-4-5-20251001',
        promptVersion: 'quizEval',
        maxTokens: 512,
        language,
        onToken: () => {},
        onDone: () => {},
        onError: (err) => {
          if (!cancelledRef.current) setError(err)
        },
      })

      if (cancelledRef.current) return

      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error(t('freeQuiz.invalidResponse'))

      const result = JSON.parse(jsonMatch[0])
      const score = Math.max(0, Math.min(100, Math.round(result.score || 0)))
      const classification = ['correct', 'partial', 'incorrect'].includes(result.classification)
        ? result.classification
        : score >= 80 ? 'correct' : score >= 40 ? 'partial' : 'incorrect'

      const evaluation = { score, classification, feedback: result.feedback || '' }

      setQuestionStates(prev => {
        const updated = { ...prev, [idx]: { ...prev[idx], evaluation, score } }
        checkAllCompleted(updated)
        // Persist this answer
        onSaveAnswer?.(idx, { mode: 'freetext', textAnswer: prev[idx]?.textAnswer, evaluation, score })
        return updated
      })
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || t('freeQuiz.evalError'))
      }
    } finally {
      setEvaluatingIdx(null)
    }
  }

  const reset = () => {
    cancelledRef.current = true
    completedRef.current = false
    cancel()
    setQuestionStates({})
    setEvaluatingIdx(null)
    setError(null)
    setShowModelAnswer({})
    onResetAnswers?.()
  }

  const toggleModelAnswer = (idx) => {
    setShowModelAnswer(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const avgScore = allCompleted
    ? Math.round(Object.values(questionStates).reduce((sum, s) => sum + (s.score || 0), 0) / questions.length)
    : 0

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const state = getState(idx)
        const isEvaluating = evaluatingIdx === idx
        const hasTextAnswer = (state.textAnswer?.trim()?.length || 0) >= 10

        return (
          <div key={idx} className="bg-surface/50 rounded-lg p-4">
            {/* Question */}
            <p className="text-sm font-medium mb-3">
              <span className="text-accent mr-2">P{idx + 1}.</span>
              {q.question}
              {bloomEnabled && <BloomBadge level={q.bloomLevel} />}
            </p>

            {/* Mode selection (pending) */}
            {state.mode === 'pending' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => chooseMode(idx, 'freetext')}
                  className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors text-text-muted hover:text-accent hover:bg-accent/10 border border-surface-light hover:border-accent/30"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  {t('hybrid.writeAnswer')}
                </button>
                <button
                  onClick={() => revealAndChooseSelf(idx)}
                  className="text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors text-text-muted hover:text-blue-400 hover:bg-blue-400/10 border border-surface-light hover:border-blue-400/30"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {t('hybrid.revealAnswer')}
                </button>
              </div>
            )}

            {/* Self-assessment mode */}
            {state.mode === 'self' && (
              <div className="animate-fadeIn">
                <p className="text-sm text-text-dim mb-3 pl-3 border-l-2 border-accent/30">
                  {q.answer}
                </p>

                {state.score === undefined && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => markSelfAnswer(idx, true)}
                      className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-text-muted hover:text-success hover:bg-success/10 border border-surface-light hover:border-success/30"
                    >
                      <Check className="w-3 h-3" /> {t('quiz.knew')}
                    </button>
                    <button
                      onClick={() => markSelfAnswer(idx, false)}
                      className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-text-muted hover:text-error hover:bg-error/10 border border-surface-light hover:border-error/30"
                    >
                      <X className="w-3 h-3" /> {t('quiz.didntKnow')}
                    </button>
                  </div>
                )}

                {state.score !== undefined && (
                  <span className={`text-xs ${state.selfAnswer ? 'text-success' : 'text-error'}`}>
                    {state.selfAnswer ? t('quiz.correct') : t('quiz.toReview')}
                  </span>
                )}
              </div>
            )}

            {/* Free text mode — input */}
            {state.mode === 'freetext' && !state.evaluation && (
              <div className="space-y-2 animate-fadeIn">
                <textarea
                  value={state.textAnswer || ''}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                  placeholder={t('freeQuiz.placeholder')}
                  disabled={isEvaluating}
                  className="w-full bg-surface border border-surface-light rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-y min-h-[80px] disabled:opacity-50"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    {(state.textAnswer?.trim()?.length || 0)} {t('freeQuiz.charCount')}
                  </span>
                  <button
                    onClick={() => evaluateAnswer(idx)}
                    disabled={!hasTextAnswer || isEvaluating}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isEvaluating ? (
                      <><Loader2 className="w-3 h-3 animate-spin" /> {t('freeQuiz.evaluating')}</>
                    ) : (
                      <><Send className="w-3 h-3" /> {t('freeQuiz.evaluate')}</>
                    )}
                  </button>
                </div>
                {error && evaluatingIdx === null && (
                  <div className="flex items-center gap-2 text-xs text-error bg-error/5 border border-error/10 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => evaluateAnswer(idx)} className="ml-auto text-accent hover:text-accent/80 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> {t('common.retry')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Free text mode — evaluation result */}
            {state.mode === 'freetext' && state.evaluation && (
              <div className="space-y-3 animate-fadeIn">
                <p className="text-sm text-text-muted bg-surface-light/30 rounded-lg px-3 py-2 italic">
                  {state.textAnswer}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={state.evaluation.score} classification={state.evaluation.classification} />
                    <ScoreBar score={state.evaluation.score} />
                  </div>
                  {state.evaluation.feedback && (
                    <p className="text-sm text-text-dim leading-relaxed pl-3 border-l-2 border-accent/30 italic">
                      {state.evaluation.feedback}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleModelAnswer(idx)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                >
                  {showModelAnswer[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showModelAnswer[idx] ? t('freeQuiz.hideModelAnswer') : t('freeQuiz.showModelAnswer')}
                </button>
                {showModelAnswer[idx] && (
                  <p className="text-sm text-text-dim pl-3 border-l-2 border-surface-light animate-fadeIn">
                    {q.answer}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Progress + reset */}
      {completedCount > 0 && !allCompleted && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{t('freeQuiz.evaluated', { n: completedCount, total: questions.length })}</span>
          <button
            onClick={reset}
            className="text-xs text-text-muted hover:text-accent flex items-center gap-1 transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> {t('common.reset')}
          </button>
        </div>
      )}

      {/* Final result */}
      {allCompleted && (
        <div className="flex items-center justify-between p-4 bg-surface rounded-lg animate-fadeIn border border-surface-light">
          <div className="space-y-1">
            <div>
              <span className="text-sm font-semibold">
                {t('freeQuiz.result', { score: avgScore })}
              </span>
              <span className="text-xs text-text-muted ml-2">
                {t('freeQuiz.average', { n: questions.length })}
              </span>
            </div>
            <ScoreBar score={avgScore} />
          </div>
          <button
            onClick={reset}
            className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> {t('common.reset')}
          </button>
        </div>
      )}
    </div>
  )
}
