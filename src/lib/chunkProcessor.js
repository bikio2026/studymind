export function estimateTokens(text) {
  return Math.ceil(text.length / 4)
}

export function chunkText(text, maxTokens = 6000) {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return [text]

  const chunks = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      chunks.push(remaining)
      break
    }

    // Try to split at paragraph boundary
    let splitIdx = remaining.lastIndexOf('\n\n', maxChars)
    if (splitIdx < maxChars * 0.5) {
      splitIdx = remaining.lastIndexOf('. ', maxChars)
    }
    if (splitIdx < maxChars * 0.3) {
      splitIdx = maxChars
    }

    chunks.push(remaining.slice(0, splitIdx + 1))
    remaining = remaining.slice(splitIdx + 1)
  }

  return chunks
}

// Normalize text for fuzzy matching: lowercase, strip accents, collapse whitespace, remove punctuation
function normalize(text) {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim()
}

// Find title position in fullText using fuzzy normalized matching
function findTitleIndex(fullText, title) {
  // 1. Exact match
  let idx = fullText.indexOf(title)
  if (idx !== -1) return idx

  // 2. Case-insensitive match
  const lowerFull = fullText.toLowerCase()
  const lowerTitle = title.toLowerCase()
  idx = lowerFull.indexOf(lowerTitle)
  if (idx !== -1) return idx

  // 3. Normalized match — search the normalized fullText for the normalized title
  const normFull = normalize(fullText)
  const normTitle = normalize(title)
  const normIdx = normFull.indexOf(normTitle)
  if (normIdx !== -1) {
    // Map normalized index back to original: count non-stripped chars up to normIdx
    let origIdx = 0
    let normCount = 0
    const fullNorm = normalize(fullText)
    // Walk original text, tracking position in normalized version
    for (let i = 0; i < fullText.length && normCount < normIdx; i++) {
      const charNorm = normalize(fullText[i])
      if (charNorm.length > 0) normCount += charNorm.length
      origIdx = i + 1
    }
    return origIdx
  }

  // 4. Keyword match — extract significant words and find a line that contains most of them
  const keywords = normTitle.split(' ').filter(w => w.length > 3)
  if (keywords.length >= 2) {
    const lines = fullText.split('\n')
    let bestScore = 0
    let bestLineStart = -1
    let offset = 0
    for (const line of lines) {
      const normLine = normalize(line)
      const matches = keywords.filter(kw => normLine.includes(kw)).length
      const score = matches / keywords.length
      if (score > bestScore && score >= 0.6) {
        bestScore = score
        bestLineStart = offset
      }
      offset += line.length + 1
    }
    if (bestLineStart !== -1) return bestLineStart
  }

  return -1
}

export function extractSectionText(fullText, sections, sectionId) {
  const section = sections.find(s => s.id === sectionId)
  if (!section) return ''

  const sectionIdx = sections.indexOf(section)
  const nextSameOrHigherLevel = sections.find(
    (s, i) => i > sectionIdx && s.level <= section.level
  )

  const startIdx = findTitleIndex(fullText, section.title)
  if (startIdx === -1) return ''

  let endIdx = fullText.length
  if (nextSameOrHigherLevel) {
    const nextIdx = findTitleIndex(
      fullText.slice(startIdx + section.title.length),
      nextSameOrHigherLevel.title
    )
    if (nextIdx > -1) endIdx = startIdx + section.title.length + nextIdx
  }

  return fullText.slice(startIdx, endIdx).trim()
}
