import { getMasteryLevel, MASTERY_LEVELS } from './proficiency'

/**
 * Build a recommended learning path from topics.
 *
 * Strategy:
 * 1. Core topics first (fundamentals you need to understand everything else)
 * 2. Supporting topics next (reinforce core concepts)
 * 3. Detail topics last (examples, specific cases)
 * Within each group, maintain document order (as authored by the original text).
 *
 * Returns array of { topic, mastery, phase } objects.
 */
export function buildLearningPath(topics, progress) {
  if (!topics?.length) return []

  const phases = [
    { key: 'core', label: 'Fundamentos', relevance: 'core' },
    { key: 'supporting', label: 'Refuerzo', relevance: 'supporting' },
    { key: 'detail', label: 'Profundización', relevance: 'detail' },
  ]

  const path = []

  for (const phase of phases) {
    const phaseTopics = topics.filter(t => t.relevance === phase.relevance)
    for (const topic of phaseTopics) {
      const mastery = getMasteryLevel(progress[topic.id])
      path.push({
        topic,
        mastery,
        phase: phase.key,
        phaseLabel: phase.label,
      })
    }
  }

  return path
}

/**
 * Get the next recommended topic to study.
 *
 * Priority:
 * 1. First un-started core topic
 * 2. First core topic that needs review (aprendiendo)
 * 3. First un-started supporting topic
 * 4. First supporting topic that needs review
 * 5. First un-started detail topic
 * 6. First detail topic that needs review
 * 7. null if all mastered/expert
 */
export function getNextRecommendation(topics, progress, currentTopicId = null) {
  if (!topics?.length) return null

  const path = buildLearningPath(topics, progress)

  // Priority 1: Un-started topics (in path order: core → supporting → detail)
  const unstarted = path.find(p =>
    p.mastery === 'sin-empezar' && p.topic.id !== currentTopicId
  )
  if (unstarted) {
    return {
      topic: unstarted.topic,
      reason: `Siguiente tema ${unstarted.phaseLabel.toLowerCase()} sin empezar`,
      phase: unstarted.phase,
    }
  }

  // Priority 2: Topics only viewed but not quizzed
  const onlyViewed = path.find(p =>
    p.mastery === 'visto' && p.topic.id !== currentTopicId
  )
  if (onlyViewed) {
    return {
      topic: onlyViewed.topic,
      reason: 'Ya lo viste, probá el quiz para afianzar',
      phase: onlyViewed.phase,
    }
  }

  // Priority 3: Topics that need review (aprendiendo = low quiz score)
  const needsReview = path.find(p =>
    p.mastery === 'aprendiendo' && p.topic.id !== currentTopicId
  )
  if (needsReview) {
    return {
      topic: needsReview.topic,
      reason: 'Necesita repaso — intentá mejorar el quiz',
      phase: needsReview.phase,
    }
  }

  // Priority 4: Dominated but not expert
  const canImprove = path.find(p =>
    p.mastery === 'dominado' && p.topic.id !== currentTopicId
  )
  if (canImprove) {
    return {
      topic: canImprove.topic,
      reason: 'Dominado — un repaso más para ser experto',
      phase: canImprove.phase,
    }
  }

  // All expert!
  return null
}

/**
 * Get phase progress stats.
 */
export function getPhaseStats(topics, progress) {
  const phases = [
    { key: 'core', label: 'Fundamentos' },
    { key: 'supporting', label: 'Refuerzo' },
    { key: 'detail', label: 'Profundización' },
  ]

  return phases.map(phase => {
    const phaseTopics = topics.filter(t => t.relevance === phase.key)
    const mastered = phaseTopics.filter(t => {
      const m = getMasteryLevel(progress[t.id])
      return m === 'dominado' || m === 'experto'
    }).length

    return {
      ...phase,
      total: phaseTopics.length,
      mastered,
      pct: phaseTopics.length > 0 ? Math.round((mastered / phaseTopics.length) * 100) : 0,
    }
  }).filter(p => p.total > 0)
}
