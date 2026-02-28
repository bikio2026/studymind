import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'studymind-progress'

export function useProgress(documentTitle) {
  const [progress, setProgress] = useState(() => {
    if (!documentTitle) return { topicsStudied: [], quizScores: {} }
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const all = JSON.parse(stored)
        return all[documentTitle] || { topicsStudied: [], quizScores: {} }
      }
    } catch { /* ignore */ }
    return { topicsStudied: [], quizScores: {} }
  })

  useEffect(() => {
    if (!documentTitle) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const all = stored ? JSON.parse(stored) : {}
      all[documentTitle] = progress
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch { /* ignore */ }
  }, [progress, documentTitle])

  const markTopicStudied = useCallback((topicId) => {
    setProgress(prev => ({
      ...prev,
      topicsStudied: [...new Set([...prev.topicsStudied, topicId])],
    }))
  }, [])

  const saveQuizScore = useCallback((topicId, score) => {
    setProgress(prev => ({
      ...prev,
      quizScores: { ...prev.quizScores, [topicId]: score },
    }))
  }, [])

  const getStats = useCallback(() => {
    const studied = progress.topicsStudied.length
    const scores = Object.values(progress.quizScores)
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0
    return { studied, quizzed: scores.length, avgScore }
  }, [progress])

  return { progress, markTopicStudied, saveQuizScore, getStats }
}
