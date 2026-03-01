import { normalizeText } from './chunkProcessor'

/**
 * Parse the target section name from a connection string.
 * Connection strings come from LLM in various formats like:
 *   "Relación con 'Oferta y Demanda': ambos conceptos..."
 *   "Se conecta con la sección 'Equilibrio de Mercado' porque..."
 *   "Complementa el capítulo sobre Política Fiscal"
 *   "Ver también: Teoría del Consumidor"
 */
export function parseConnectionTarget(connectionString) {
  if (!connectionString) return null

  // Strategy 1: text between single quotes (most common from our prompt)
  const singleQuoteMatch = connectionString.match(/'([^']{3,})'/)
  if (singleQuoteMatch) return singleQuoteMatch[1].trim()

  // Strategy 2: text between double quotes
  const doubleQuoteMatch = connectionString.match(/"([^"]{3,})"/)
  if (doubleQuoteMatch) return doubleQuoteMatch[1].trim()

  // Strategy 3: text after "con" followed by a colon (e.g., "Relación con Oferta y Demanda: ...")
  const conColonMatch = connectionString.match(/\bcon\s+(.+?)(?:\s*:|$)/i)
  if (conColonMatch) {
    const candidate = conColonMatch[1].trim()
    // Only accept if it's reasonable section-title length
    if (candidate.length >= 3 && candidate.length <= 120) return candidate
  }

  // Strategy 4: text after "sección" or "capítulo" (e.g., "Ver la sección Equilibrio General")
  const sectionMatch = connectionString.match(/(?:secci[oó]n|cap[ií]tulo)\s+(?:sobre\s+)?(.+?)(?:\s*[:.;,]|$)/i)
  if (sectionMatch) return sectionMatch[1].trim()

  return null
}

/**
 * Compute similarity between two normalized strings.
 * Returns a score from 0 to 1.
 */
function similarityScore(a, b) {
  if (a === b) return 1
  if (!a || !b) return 0

  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) {
    const shorter = a.length < b.length ? a : b
    const longer = a.length >= b.length ? a : b
    return shorter.length / longer.length
  }

  // Word overlap score
  const wordsA = new Set(a.split(' ').filter(w => w.length > 2))
  const wordsB = new Set(b.split(' ').filter(w => w.length > 2))
  if (wordsA.size === 0 || wordsB.size === 0) return 0

  let overlap = 0
  for (const w of wordsA) {
    if (wordsB.has(w)) overlap++
  }

  const union = new Set([...wordsA, ...wordsB]).size
  return overlap / union // Jaccard similarity
}

/**
 * Find the best matching topic for a target section name.
 * Returns { topicId, title, score } or null if no good match.
 */
export function findRelatedTopic(targetName, sections, topics) {
  if (!targetName || !sections?.length || !topics?.length) return null

  const normTarget = normalizeText(targetName)
  if (!normTarget || normTarget.length < 3) return null

  let bestMatch = null
  let bestScore = 0

  // Build topic lookup for quick access
  const topicIds = new Set(topics.map(t => t.id))

  for (const section of sections) {
    // Only match sections that have a generated topic
    if (!topicIds.has(section.id)) continue

    const normTitle = normalizeText(section.title)
    const score = similarityScore(normTarget, normTitle)

    if (score > bestScore) {
      bestScore = score
      bestMatch = { topicId: section.id, title: section.title, score }
    }
  }

  // Threshold: require at least 0.3 similarity to avoid false matches
  if (bestMatch && bestScore >= 0.3) {
    return bestMatch
  }

  return null
}

/**
 * Enrich an array of connection strings with navigation data.
 * Returns array of { text, targetTopicId, targetTitle } objects.
 */
export function enrichConnections(connections, sections, topics) {
  if (!connections?.length) return []

  return connections.map(connText => {
    const targetName = parseConnectionTarget(connText)
    const match = targetName ? findRelatedTopic(targetName, sections, topics) : null

    return {
      text: connText,
      targetTopicId: match?.topicId || null,
      targetTitle: match?.title || null,
    }
  })
}
