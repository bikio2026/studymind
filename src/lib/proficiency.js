/**
 * Proficiency calculation and mastery levels for StudyMind.
 *
 * Mastery levels:
 *   - sin-empezar: No quiz attempted, not studied
 *   - visto: Marked as studied but no quiz
 *   - aprendiendo: Quiz score < 60%
 *   - dominado: Quiz score 60-84%
 *   - experto: Quiz score >= 85%
 */

export const MASTERY_LEVELS = {
  'sin-empezar': {
    label: 'Sin empezar',
    color: 'text-text-muted/40',
    bg: 'bg-text-muted/5',
    ring: 'stroke-text-muted/20',
    fill: 'stroke-text-muted/20',
    order: 0,
  },
  visto: {
    label: 'Visto',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    ring: 'stroke-blue-400/30',
    fill: 'stroke-blue-400',
    order: 1,
  },
  aprendiendo: {
    label: 'Aprendiendo',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    ring: 'stroke-amber-400/30',
    fill: 'stroke-amber-400',
    order: 2,
  },
  dominado: {
    label: 'Dominado',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    ring: 'stroke-emerald-400/30',
    fill: 'stroke-emerald-400',
    order: 3,
  },
  experto: {
    label: 'Experto',
    color: 'text-accent',
    bg: 'bg-accent/10',
    ring: 'stroke-accent/30',
    fill: 'stroke-accent',
    order: 4,
  },
}

/**
 * Calculate mastery level from progress data.
 */
export function getMasteryLevel(topicProgress) {
  if (!topicProgress) return 'sin-empezar'

  const { studied, quizScores } = topicProgress
  const lastScore = quizScores?.length > 0 ? quizScores[quizScores.length - 1].score : null

  if (lastScore !== null) {
    if (lastScore >= 85) return 'experto'
    if (lastScore >= 60) return 'dominado'
    return 'aprendiendo'
  }

  if (studied) return 'visto'
  return 'sin-empezar'
}

/**
 * Calculate proficiency percentage (0-100) from quiz history.
 * Uses weighted average: recent scores matter more.
 */
export function getProficiency(topicProgress) {
  if (!topicProgress?.quizScores?.length) return 0

  const scores = topicProgress.quizScores
  if (scores.length === 1) return scores[0].score

  // Weighted: last score counts double
  const weights = scores.map((_, i) => (i === scores.length - 1 ? 2 : 1))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)
  const weighted = scores.reduce((sum, s, i) => sum + s.score * weights[i], 0)

  return Math.round(weighted / totalWeight)
}

/**
 * Calculate document-level stats from all topic progress.
 */
export function getDocumentStats(topics, progress) {
  const stats = {
    total: topics.length,
    byMastery: {},
    avgProficiency: 0,
    quizzesTaken: 0,
    studiedCount: 0,
  }

  // Initialize mastery counts
  for (const key of Object.keys(MASTERY_LEVELS)) {
    stats.byMastery[key] = 0
  }

  let proficiencySum = 0
  let proficiencyCount = 0

  for (const topic of topics) {
    const tp = progress[topic.id]
    const mastery = getMasteryLevel(tp)
    stats.byMastery[mastery]++

    if (tp?.studied) stats.studiedCount++
    if (tp?.quizScores?.length > 0) {
      stats.quizzesTaken += tp.quizScores.length
      proficiencySum += getProficiency(tp)
      proficiencyCount++
    }
  }

  stats.avgProficiency = proficiencyCount > 0
    ? Math.round(proficiencySum / proficiencyCount)
    : 0

  return stats
}

/**
 * Depth levels for content presentation.
 */
export const DEPTH_LEVELS = {
  resumen: {
    label: 'Resumen',
    description: 'Vista rápida: solo el resumen',
    icon: '1',
  },
  intermedio: {
    label: 'Intermedio',
    description: 'Resumen + conceptos clave + conexiones',
    icon: '2',
  },
  completo: {
    label: 'Completo',
    description: 'Todo el contenido incluyendo explicación expandida',
    icon: '3',
  },
}
