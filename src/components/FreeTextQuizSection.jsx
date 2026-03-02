import { useState, useCallback, useRef } from 'react'
import { Send, RotateCcw, Loader2, ChevronDown, ChevronUp, Check, AlertTriangle, X, RefreshCw } from 'lucide-react'
import { useLLMStream } from '../hooks/useLLMStream'
import { buildQuizEvaluationPrompt } from '../lib/promptBuilder'

function ScoreBadge({ score, classification }) {
  const config = {
    correct: { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success', icon: Check, label: 'Correcto' },
    partial: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-500', icon: AlertTriangle, label: 'Parcial' },
    incorrect: { bg: 'bg-error/10', border: 'border-error/30', text: 'text-error', icon: X, label: 'Incorrecto' },
  }
  const c = config[classification] || config.partial
  const Icon = c.icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text} border ${c.border}`}>
      <Icon className="w-3 h-3" />
      {c.label} ({score}%)
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

export default function FreeTextQuizSection({ questions, topicContext, provider, onComplete }) {
  const [answers, setAnswers] = useState({})
  const [evaluations, setEvaluations] = useState({})
  const [evaluatingIdx, setEvaluatingIdx] = useState(null)
  const [error, setError] = useState(null)
  const [showModelAnswer, setShowModelAnswer] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const { streamRequest, cancel } = useLLMStream()
  const cancelledRef = useRef(false)

  const evaluatedCount = Object.keys(evaluations).length
  const allEvaluated = evaluatedCount === questions.length

  const handleTextChange = (idx, text) => {
    setAnswers(prev => ({ ...prev, [idx]: text }))
  }

  const evaluateAnswer = useCallback(async (idx) => {
    const q = questions[idx]
    const userAnswer = answers[idx]?.trim()
    if (!userAnswer || userAnswer.length < 10) return

    setEvaluatingIdx(idx)
    setError(null)
    cancelledRef.current = false

    const prompt = buildQuizEvaluationPrompt(
      q.question,
      q.answer,
      userAnswer,
      topicContext
    )

    try {
      const fullText = await streamRequest(prompt, {
        provider: provider || 'claude',
        model: 'claude-haiku-4-5-20251001',
        promptVersion: 'quizEval',
        maxTokens: 512,
        onToken: () => {},
        onDone: () => {},
        onError: (err) => {
          if (!cancelledRef.current) setError(err)
        },
      })

      if (cancelledRef.current) return

      // Parse JSON from LLM response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Respuesta inválida del evaluador')

      const result = JSON.parse(jsonMatch[0])
      const score = Math.max(0, Math.min(100, Math.round(result.score || 0)))
      const classification = ['correct', 'partial', 'incorrect'].includes(result.classification)
        ? result.classification
        : score >= 80 ? 'correct' : score >= 40 ? 'partial' : 'incorrect'

      const evaluation = {
        score,
        classification,
        feedback: result.feedback || '',
      }

      setEvaluations(prev => {
        const updated = { ...prev, [idx]: evaluation }

        // Check if all done → submit
        if (Object.keys(updated).length === questions.length && !submitted) {
          setSubmitted(true)
          const avgScore = Math.round(
            Object.values(updated).reduce((sum, e) => sum + e.score, 0) / questions.length
          )
          onComplete?.(avgScore)
        }

        return updated
      })
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err.message || 'Error al evaluar la respuesta')
      }
    } finally {
      setEvaluatingIdx(null)
    }
  }, [questions, answers, topicContext, provider, streamRequest, submitted, onComplete])

  const reset = () => {
    cancelledRef.current = true
    cancel()
    setAnswers({})
    setEvaluations({})
    setEvaluatingIdx(null)
    setError(null)
    setShowModelAnswer({})
    setSubmitted(false)
  }

  const toggleModelAnswer = (idx) => {
    setShowModelAnswer(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const evaluation = evaluations[idx]
        const isEvaluating = evaluatingIdx === idx
        const hasAnswer = (answers[idx]?.trim()?.length || 0) >= 10

        return (
          <div key={idx} className="bg-surface/50 rounded-lg p-4">
            {/* Question */}
            <p className="text-sm font-medium mb-3">
              <span className="text-accent mr-2">P{idx + 1}.</span>
              {q.question}
            </p>

            {/* Answer input or evaluation result */}
            {!evaluation ? (
              <div className="space-y-2">
                <textarea
                  value={answers[idx] || ''}
                  onChange={(e) => handleTextChange(idx, e.target.value)}
                  placeholder="Escribí tu respuesta..."
                  disabled={isEvaluating}
                  className="w-full bg-surface border border-surface-light rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted/40 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-y min-h-[80px] disabled:opacity-50"
                  rows={3}
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">
                    {(answers[idx]?.trim()?.length || 0)} caracteres (mín. 10)
                  </span>
                  <button
                    onClick={() => evaluateAnswer(idx)}
                    disabled={!hasAnswer || isEvaluating}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors bg-accent/10 text-accent hover:bg-accent/20 border border-accent/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" /> Evaluando...
                      </>
                    ) : (
                      <>
                        <Send className="w-3 h-3" /> Evaluar
                      </>
                    )}
                  </button>
                </div>
                {error && evaluatingIdx === null && idx === Math.max(...Object.keys(answers).map(Number).filter(k => !evaluations[k]), 0) && (
                  <div className="flex items-center gap-2 text-xs text-error bg-error/5 border border-error/10 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                    <button onClick={() => evaluateAnswer(idx)} className="ml-auto text-accent hover:text-accent/80 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" /> Reintentar
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                {/* User's answer (dimmed) */}
                <p className="text-sm text-text-muted bg-surface-light/30 rounded-lg px-3 py-2 italic">
                  {answers[idx]}
                </p>

                {/* Score + feedback */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={evaluation.score} classification={evaluation.classification} />
                    <ScoreBar score={evaluation.score} />
                  </div>
                  {evaluation.feedback && (
                    <p className="text-sm text-text-dim leading-relaxed pl-3 border-l-2 border-accent/30 italic">
                      {evaluation.feedback}
                    </p>
                  )}
                </div>

                {/* Model answer toggle */}
                <button
                  onClick={() => toggleModelAnswer(idx)}
                  className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1"
                >
                  {showModelAnswer[idx] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showModelAnswer[idx] ? 'Ocultar' : 'Ver'} respuesta modelo
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

      {/* Progress indicator */}
      {evaluatedCount > 0 && !allEvaluated && (
        <div className="text-xs text-text-muted text-center">
          {evaluatedCount} de {questions.length} preguntas evaluadas
        </div>
      )}

      {/* Final result */}
      {allEvaluated && (
        <div className="flex items-center justify-between p-4 bg-surface rounded-lg animate-fadeIn border border-surface-light">
          <div className="space-y-1">
            <div>
              <span className="text-sm font-semibold">
                Resultado: {Math.round(Object.values(evaluations).reduce((s, e) => s + e.score, 0) / questions.length)}%
              </span>
              <span className="text-xs text-text-muted ml-2">
                (promedio de {questions.length} preguntas)
              </span>
            </div>
            <ScoreBar score={Math.round(Object.values(evaluations).reduce((s, e) => s + e.score, 0) / questions.length)} />
          </div>
          <button
            onClick={reset}
            className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reiniciar
          </button>
        </div>
      )}
    </div>
  )
}
