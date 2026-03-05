import { useState, useRef } from 'react'
import { X, GraduationCap, Send, Loader2, Sparkles, Eye, BookOpen, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'
import { useFeatureStore } from '../stores/featureStore'
import { useLLMStream } from '../hooks/useLLMStream'
import { buildTutorFocusPrompt } from '../lib/promptBuilder'

export default function TutorObservations({ open, onClose, topics, provider, language }) {
  const { t } = useTranslation()
  const observations = useFeatureStore(s => s.tutorObservations || [])
  const saveObservations = useFeatureStore(s => s.saveObservations)
  const backdropRef = useRef(null)
  const { streamRequest } = useLLMStream()

  const [newObservation, setNewObservation] = useState('')
  const [selectedTopic, setSelectedTopic] = useState('') // '' = global
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [expandedObs, setExpandedObs] = useState({})

  const toggleObs = (idx) => {
    setExpandedObs(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleGenerate = async () => {
    const text = newObservation.trim()
    if (!text || text.length < 10) return

    setGenerating(true)
    setError(null)

    try {
      // Build topic summaries for the prompt
      const topicsSummaries = selectedTopic
        ? topics.filter(t => t.id === selectedTopic).map(t => ({ title: t.sectionTitle, summary: t.summary }))
        : topics.map(t => ({ title: t.sectionTitle, summary: t.summary }))

      const prompt = buildTutorFocusPrompt(text, topicsSummaries, language)
      const fullText = await streamRequest(prompt, {
        provider: provider || 'claude',
        model: 'claude-haiku-4-5-20251001',
        promptVersion: 'tutorFocus',
        maxTokens: 1500,
        language,
        onToken: () => {},
        onDone: () => {},
        onError: (err) => { throw new Error(err) },
      })

      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Invalid response')

      const result = JSON.parse(jsonMatch[0])

      const observation = {
        text,
        topicId: selectedTopic || null,
        topicTitle: selectedTopic ? topics.find(t => t.id === selectedTopic)?.sectionTitle : null,
        date: Date.now(),
        questions: result.questions || [],
        relevantTopics: result.relevantTopics || [],
        miniGuide: result.miniGuide || '',
      }

      const updated = [observation, ...observations]
      await saveObservations(updated)

      setNewObservation('')
      setSelectedTopic('')
      setExpandedObs({ 0: true }) // auto-expand the new one
    } catch (err) {
      console.error('[TutorObservations] Error:', err)
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const removeObservation = async (idx) => {
    const updated = observations.filter((_, i) => i !== idx)
    await saveObservations(updated)
  }

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      onClick={(e) => e.target === backdropRef.current && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
    >
      <div className="bg-surface rounded-2xl border border-surface-light/30 w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-light/20 sticky top-0 bg-surface rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <h2 className="text-base font-semibold text-text">{t('tutor.title')}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-light/30 text-text-muted transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* New observation input */}
          <div className="space-y-3">
            <p className="text-xs text-text-muted">{t('tutor.inputDesc')}</p>

            {/* Topic selector (optional) */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted shrink-0">{t('tutor.scope')}:</span>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(e.target.value)}
                className="flex-1 text-xs bg-surface-light/20 border border-surface-light/30 rounded-lg px-2 py-1.5 text-text"
              >
                <option value="">{t('tutor.global')}</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>{topic.sectionTitle}</option>
                ))}
              </select>
            </div>

            <textarea
              value={newObservation}
              onChange={(e) => setNewObservation(e.target.value)}
              placeholder={t('tutor.placeholder')}
              rows={3}
              disabled={generating}
              className="w-full text-sm bg-surface-light/20 border border-surface-light/30 rounded-lg px-3 py-2
                text-text placeholder-text-muted/50 resize-none focus:outline-none focus:border-accent/50
                disabled:opacity-50"
            />

            {error && (
              <p className="text-xs text-error">{error}</p>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={generating || !newObservation.trim() || newObservation.trim().length < 10}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg
                  bg-accent/10 text-accent hover:bg-accent/15 border border-accent/20
                  disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('common.processing')}</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5" /> {t('tutor.generateFocus')}</>
                )}
              </button>
            </div>
          </div>

          {/* Saved observations */}
          {observations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                {t('tutor.history')} ({observations.length})
              </h3>

              {observations.map((obs, idx) => {
                const isExpanded = expandedObs[idx]

                return (
                  <div key={idx} className="border border-surface-light/30 rounded-xl overflow-hidden">
                    {/* Observation header */}
                    <button
                      onClick={() => toggleObs(idx)}
                      className="w-full text-left px-4 py-3 hover:bg-surface-light/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-text line-clamp-2">{obs.text}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-text-muted">
                              {new Date(obs.date).toLocaleDateString()}
                            </span>
                            {obs.topicTitle ? (
                              <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                                {obs.topicTitle}
                              </span>
                            ) : (
                              <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full">
                                {t('tutor.global')}
                              </span>
                            )}
                            <span className="text-[10px] text-text-muted">
                              {obs.questions?.length || 0} {t('tutor.questionsCount')}
                            </span>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0 mt-1" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0 mt-1" />
                        )}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-4 animate-fadeIn border-t border-surface-light/20 pt-3">
                        {/* Generated questions */}
                        {obs.questions?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-2 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {t('tutor.focusQuestions')}
                            </h4>
                            <div className="space-y-2">
                              {obs.questions.map((q, qi) => (
                                <div key={qi} className="bg-accent/5 border border-accent/10 rounded-lg px-3 py-2">
                                  <p className="text-sm text-text">{q.question}</p>
                                  {q.hint && (
                                    <p className="text-[11px] text-text-muted mt-1 italic">
                                      💡 {q.hint}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mini guide */}
                        {obs.miniGuide && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <BookOpen className="w-3 h-3" />
                              {t('tutor.miniGuide')}
                            </h4>
                            <div className="text-sm text-text-dim leading-relaxed whitespace-pre-line bg-blue-500/5 border border-blue-500/15 rounded-lg px-4 py-3">
                              {obs.miniGuide}
                            </div>
                          </div>
                        )}

                        {/* Relevant topics */}
                        {obs.relevantTopics?.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <Eye className="w-3 h-3" />
                              {t('tutor.relevantTopics')}
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {obs.relevantTopics.map((topic, ti) => (
                                <span key={ti} className="text-[10px] bg-surface-light/50 text-text-dim px-2 py-0.5 rounded-full">
                                  {topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => removeObservation(idx)}
                          className="text-[10px] text-text-muted hover:text-error flex items-center gap-1 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          {t('tutor.delete')}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
