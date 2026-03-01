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

// Find title position in fullText using strict matching (no keyword fallback)
// Accepts optional pre-computed normalized fullText for performance
function findTitleIndex(fullText, title, normFullCached = null) {
  // 1. Exact match
  let idx = fullText.indexOf(title)
  if (idx !== -1) return { idx, method: 'exact' }

  // 2. Case-insensitive match
  const lowerFull = fullText.toLowerCase()
  const lowerTitle = title.toLowerCase()
  idx = lowerFull.indexOf(lowerTitle)
  if (idx !== -1) return { idx, method: 'case-insensitive' }

  // 3. Normalized match — search the normalized fullText for the normalized title
  const normFull = normFullCached || normalize(fullText)
  const normTitle = normalize(title)
  const normIdx = normFull.indexOf(normTitle)
  if (normIdx !== -1) {
    // Map normalized index back to original: walk original text tracking position
    let origIdx = 0
    let normCount = 0
    for (let i = 0; i < fullText.length && normCount < normIdx; i++) {
      const charNorm = normalize(fullText[i])
      if (charNorm.length > 0) normCount += charNorm.length
      origIdx = i + 1
    }
    return { idx: origIdx, method: 'normalized' }
  }

  // No keyword fallback — return not found to avoid false matches
  return { idx: -1, method: 'none' }
}

// Extract section text using page ranges (preferred) or title matching (fallback)
// Returns { text, confidence } where confidence is 'high', 'medium', or 'low'
export function extractSectionTextByPages(document, sections, sectionId, normFullCached = null) {
  const section = sections.find(s => s.id === sectionId)
  if (!section) return { text: '', confidence: 'low' }

  // Strategy 1: use page ranges if available from LLM
  if (section.pageStart && document.pages) {
    const start = Math.max(0, section.pageStart - 1) // 0-indexed

    // Only proceed if start is within document range
    if (start < document.pages.length) {
      // Determine end: use pageEnd, or next section's pageStart, or +20 pages max
      let end
      if (section.pageEnd) {
        end = Math.min(document.pages.length, section.pageEnd)
      } else {
        // Find next section at same or higher level to determine end
        const sectionIdx = sections.indexOf(section)
        const nextSection = sections.find(
          (s, i) => i > sectionIdx && s.level <= section.level && s.pageStart
        )
        end = nextSection
          ? Math.min(document.pages.length, nextSection.pageStart - 1)
          : Math.min(document.pages.length, start + 20)
      }

      if (end <= start) end = Math.min(document.pages.length, start + 5)

      const text = document.pages
        .slice(start, end)
        .map(p => p.text)
        .join('\n\n')
        .trim()

      // Only return if we got meaningful text; otherwise fall through to other strategies
      if (text.length >= 100) {
        return { text, confidence: 'high' }
      }
    }
    // Fall through — page numbers from LLM were out of range or extracted text too short
    console.warn(`[StudyMind] Strategy 1 fallthrough: "${section.title}" (pageStart: ${section.pageStart}, docPages: ${document.pages.length})`)
  }

  // Strategy 2: try title matching on fullText
  if (document.fullText) {
    const result = extractSectionTextStrict(document.fullText, sections, sectionId, normFullCached)
    if (result.text && result.text.length >= 100) {
      return result
    }
  }

  // Strategy 3: proportional page distribution
  // When page ranges and title matching both fail, distribute pages evenly among sections.
  // This handles cases where the LLM couldn't determine page ranges (e.g., no TOC in selected pages)
  if (document.pages && document.pages.length > 0) {
    const contentSections = sections.filter(s => s.level <= 2)
    const sectionIdx = contentSections.findIndex(s => s.id === sectionId)
    if (sectionIdx !== -1 && contentSections.length > 0) {
      const totalPages = document.pages.length
      const pagesPerSection = totalPages / contentSections.length
      const start = Math.floor(sectionIdx * pagesPerSection)
      const end = Math.min(totalPages, Math.ceil((sectionIdx + 1) * pagesPerSection))

      if (end > start) {
        const text = document.pages
          .slice(start, end)
          .map(p => p.text)
          .join('\n\n')
          .trim()

        if (text.length >= 50) {
          return { text, confidence: 'medium' }
        }
      }
    }
  }

  return { text: '', confidence: 'low' }
}

// Strict text extraction by title matching (without keyword fallback)
function extractSectionTextStrict(fullText, sections, sectionId, normFullCached = null) {
  const section = sections.find(s => s.id === sectionId)
  if (!section) return { text: '', confidence: 'low' }

  const sectionIdx = sections.indexOf(section)
  const nextSameOrHigherLevel = sections.find(
    (s, i) => i > sectionIdx && s.level <= section.level
  )

  const { idx: startIdx, method } = findTitleIndex(fullText, section.title, normFullCached)
  if (startIdx === -1) return { text: '', confidence: 'low' }

  let endIdx = fullText.length
  if (nextSameOrHigherLevel) {
    const { idx: nextIdx } = findTitleIndex(
      fullText.slice(startIdx + section.title.length),
      nextSameOrHigherLevel.title,
      null // don't use cached normFull for sliced text
    )
    if (nextIdx > -1) endIdx = startIdx + section.title.length + nextIdx
  }

  const text = fullText.slice(startIdx, endIdx).trim()
  const confidence = method === 'exact' || method === 'case-insensitive' ? 'medium' : 'low'

  return { text, confidence }
}

// Legacy function — kept for compatibility with regenerateSection
export function extractSectionText(fullText, sections, sectionId) {
  const result = extractSectionTextStrict(fullText, sections, sectionId)
  return result.text
}

// Pre-compute normalized fullText once for batch operations
export function precomputeNormalized(fullText) {
  return normalize(fullText)
}
