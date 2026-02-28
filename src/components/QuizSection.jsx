import { useState } from 'react'
import { Check, X, RotateCcw } from 'lucide-react'

export default function QuizSection({ questions, onComplete }) {
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const revealAnswer = (idx) => {
    setRevealed(prev => ({ ...prev, [idx]: true }))
  }

  const markAnswer = (idx, correct) => {
    const newAnswers = { ...answers, [idx]: correct }
    setAnswers(newAnswers)

    if (Object.keys(newAnswers).length === questions.length) {
      setSubmitted(true)
      const score = Math.round(
        Object.values(newAnswers).filter(Boolean).length / questions.length * 100
      )
      onComplete?.(score)
    }
  }

  const reset = () => {
    setAnswers({})
    setRevealed({})
    setSubmitted(false)
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => (
        <div key={idx} className="bg-surface/50 rounded-lg p-4">
          <p className="text-sm font-medium mb-3">
            <span className="text-accent mr-2">P{idx + 1}.</span>
            {q.question}
          </p>

          {!revealed[idx] ? (
            <button
              onClick={() => revealAnswer(idx)}
              className="text-xs text-accent hover:text-accent/80 transition-colors underline underline-offset-2"
            >
              Ver respuesta
            </button>
          ) : (
            <div className="animate-fadeIn">
              <p className="text-sm text-text-dim mb-3 pl-3 border-l-2 border-accent/30">
                {q.answer}
              </p>

              {answers[idx] === undefined && !submitted && (
                <div className="flex gap-2">
                  <button
                    onClick={() => markAnswer(idx, true)}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-text-muted hover:text-success hover:bg-success/10 border border-surface-light hover:border-success/30"
                  >
                    <Check className="w-3 h-3" /> Lo sabía
                  </button>
                  <button
                    onClick={() => markAnswer(idx, false)}
                    className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors text-text-muted hover:text-error hover:bg-error/10 border border-surface-light hover:border-error/30"
                  >
                    <X className="w-3 h-3" /> No lo sabía
                  </button>
                </div>
              )}

              {answers[idx] !== undefined && (
                <span className={`text-xs ${answers[idx] ? 'text-success' : 'text-error'}`}>
                  {answers[idx] ? 'Correcto' : 'A repasar'}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {submitted && (
        <div className="flex items-center justify-between p-4 bg-surface rounded-lg animate-fadeIn border border-surface-light">
          <div>
            <span className="text-sm font-semibold">
              Resultado: {Object.values(answers).filter(Boolean).length}/{questions.length}
            </span>
            <span className="text-xs text-text-muted ml-2">
              ({Math.round(Object.values(answers).filter(Boolean).length / questions.length * 100)}%)
            </span>
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
