export function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function truncate(text, maxLength = 200) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

export function extractFirstPages(pages, maxPages = 5) {
  return pages
    .slice(0, maxPages)
    .map(p => p.text)
    .join('\n\n')
}

// --- TOC Detection Engine ---

const TOC_KEYWORDS = [
  'índice general', 'indice general', 'índice analítico', 'indice analitico',
  'índice temático', 'indice tematico', 'índice de contenidos', 'indice de contenidos',
  'tabla de contenidos', 'table of contents', 'contents',
  'índice', 'indice', 'contenido', 'sumario',
]

const ANALYTICAL_KEYWORDS = [
  'índice analítico', 'indice analitico', 'índice temático', 'indice tematico',
  'índice de materias', 'indice de materias', 'analytical index',
]

const GENERAL_KEYWORDS = [
  'índice general', 'indice general', 'tabla de contenidos', 'table of contents',
  'contenido', 'contents', 'sumario',
]

function scoreTOCPage(pageText) {
  let score = 0
  const lines = pageText.split('\n').filter(l => l.trim())
  if (lines.length === 0) return { score: 0, type: 'unknown' }

  // Signal 1: Keyword in first 300 chars
  const header = pageText.slice(0, 300).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  let type = 'unknown'

  for (const kw of ANALYTICAL_KEYWORDS) {
    const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (header.includes(kwNorm)) { score += 30; type = 'analytical'; break }
  }
  if (type === 'unknown') {
    for (const kw of GENERAL_KEYWORDS) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (header.includes(kwNorm)) { score += 30; type = 'general'; break }
    }
  }
  if (type === 'unknown') {
    for (const kw of TOC_KEYWORDS) {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (header.includes(kwNorm)) { score += 30; type = 'general'; break }
    }
  }

  // Signal 2: Dot-leader lines (e.g., "Capítulo 1 ........... 15")
  const dotLeaderPattern = /[.…·]{3,}\s*\d{1,4}\s*$/gm
  const dotLeaderLines = pageText.match(dotLeaderPattern) || []
  const dotRatio = dotLeaderLines.length / lines.length
  if (dotRatio > 0.3) score += 40
  else if (dotRatio > 0.15) score += 20

  // Signal 3: Short lines ending in number (TOC without dots)
  const shortNumPattern = /^.{10,100}\s+\d{1,4}\s*$/gm
  const shortNumLines = pageText.match(shortNumPattern) || []
  const shortNumRatio = shortNumLines.length / lines.length
  if (shortNumRatio > 0.25) score += 20
  else if (shortNumRatio > 0.12) score += 10

  return { score, type }
}

/**
 * Scans ALL pages of a PDF and detects Table of Contents pages.
 * Groups consecutive TOC pages into regions.
 */
export function detectTOCPages(pages) {
  const tocPages = []

  for (const page of pages) {
    const { score, type } = scoreTOCPage(page.text)
    if (score >= 30) {
      tocPages.push({ pageNumber: page.pageNumber, text: page.text, score, type })
    }
  }

  if (tocPages.length === 0) {
    console.log('[StudyMind] No TOC pages detected')
    return { hasTOC: false, regions: [] }
  }

  // Group into contiguous regions (allow gap of up to 2 pages)
  const regions = []
  let currentRegion = { pages: [tocPages[0]], type: tocPages[0].type }

  for (let i = 1; i < tocPages.length; i++) {
    const gap = tocPages[i].pageNumber - tocPages[i - 1].pageNumber
    const sameType = tocPages[i].type === currentRegion.type || tocPages[i].type === 'unknown' || currentRegion.type === 'unknown'

    if (gap <= 3 && sameType) {
      currentRegion.pages.push(tocPages[i])
      if (currentRegion.type === 'unknown' && tocPages[i].type !== 'unknown') {
        currentRegion.type = tocPages[i].type
      }
    } else {
      regions.push({
        type: currentRegion.type,
        startPage: currentRegion.pages[0].pageNumber,
        endPage: currentRegion.pages[currentRegion.pages.length - 1].pageNumber,
        pages: currentRegion.pages,
      })
      currentRegion = { pages: [tocPages[i]], type: tocPages[i].type }
    }
  }
  // Push last region
  regions.push({
    type: currentRegion.type,
    startPage: currentRegion.pages[0].pageNumber,
    endPage: currentRegion.pages[currentRegion.pages.length - 1].pageNumber,
    pages: currentRegion.pages,
  })

  console.log(`[StudyMind] TOC detected: ${regions.length} region(s)`, regions.map(r =>
    `${r.type} (pages ${r.startPage}-${r.endPage}, ${r.pages.length} pages, avg score ${Math.round(r.pages.reduce((a, p) => a + p.score, 0) / r.pages.length)})`
  ))

  return { hasTOC: true, regions }
}

/**
 * Extracts combined TOC text from detected regions.
 * Prioritizes analytical index over general TOC.
 */
export function extractTOCTextFromRegions(tocResult, maxChars = 12000) {
  if (!tocResult.hasTOC || tocResult.regions.length === 0) return ''

  // Sort: analytical first, then general, then unknown
  const sorted = [...tocResult.regions].sort((a, b) => {
    const priority = { analytical: 0, general: 1, unknown: 2 }
    return (priority[a.type] ?? 2) - (priority[b.type] ?? 2)
  })

  let result = ''
  for (const region of sorted) {
    for (const page of region.pages) {
      if (result.length >= maxChars) break
      result += (result ? '\n\n' : '') + page.text
    }
  }

  return result.slice(0, maxChars)
}

// --- Main sampling function ---

export function getSampledText(pages, maxTokens = 8000, tocText = null) {
  const maxChars = maxTokens * 4

  if (tocText) {
    // Budget: 40% for TOC, 60% for page samples
    const tocBudget = Math.floor(maxChars * 0.4)
    const sampleBudget = maxChars - tocBudget

    let result = `=== ÍNDICE DEL DOCUMENTO ===\n${tocText.slice(0, tocBudget)}\n=== FIN DEL ÍNDICE ===\n\n`

    // Sample pages from the filtered range (all pages, not just after page 5)
    const step = Math.max(1, Math.floor(pages.length / 20))
    for (let i = 0; i < pages.length; i += step) {
      if (result.length >= tocBudget + sampleBudget) break
      result += `\n\n--- Página ${pages[i].pageNumber} ---\n${pages[i].text.slice(0, 500)}`
    }

    return result.slice(0, maxChars)
  }

  // No TOC provided: use original behavior (first 5 pages as pseudo-TOC + samples)
  const firstPages = extractFirstPages(pages)

  if (firstPages.length >= maxChars) {
    return firstPages.slice(0, maxChars)
  }

  let result = firstPages
  const step = Math.max(1, Math.floor(pages.length / 20))

  for (let i = 5; i < pages.length; i += step) {
    if (result.length >= maxChars) break
    result += `\n\n--- Página ${pages[i].pageNumber} ---\n${pages[i].text.slice(0, 500)}`
  }

  return result.slice(0, maxChars)
}
