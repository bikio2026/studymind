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

// Normalize text for keyword matching — handles OCR artifacts
function normForKeyword(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[~·•]/g, '')       // OCR artifacts (lNDI~E → lNDIE)
    .replace(/l(?=[A-Z])/g, 'I') // OCR: lowercase L before uppercase → I (ANALlTICO → ANALITICO)
    .toLowerCase()
}

function scoreTOCPage(pageText) {
  let score = 0
  const lines = pageText.split('\n').filter(l => l.trim())
  if (lines.length === 0) return { score: 0, type: 'unknown' }

  // Signal 1: Keyword in first 500 chars (extended for continuation pages)
  const header = normForKeyword(pageText.slice(0, 500))
  let type = 'unknown'

  for (const kw of ANALYTICAL_KEYWORDS) {
    if (header.includes(normForKeyword(kw))) { score += 30; type = 'analytical'; break }
  }
  if (type === 'unknown') {
    for (const kw of GENERAL_KEYWORDS) {
      if (header.includes(normForKeyword(kw))) { score += 30; type = 'general'; break }
    }
  }
  if (type === 'unknown') {
    for (const kw of TOC_KEYWORDS) {
      if (header.includes(normForKeyword(kw))) { score += 30; type = 'general'; break }
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
 * Prioritizes general TOC (chapter hierarchy) over analytical index (alphabetical).
 */
export function extractTOCTextFromRegions(tocResult, maxChars = 12000) {
  if (!tocResult.hasTOC || tocResult.regions.length === 0) return ''

  // Sort: general first (has chapter hierarchy), then analytical, then unknown
  const sorted = [...tocResult.regions].sort((a, b) => {
    const priority = { general: 0, analytical: 1, unknown: 2 }
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

// --- TOC Parser: extract structured entries from TOC text ---

/**
 * Parse TOC text into structured entries with titles, page numbers, and levels.
 * Returns array of { title, pageNumber, level, type }
 */
export function parseTOCEntries(tocText) {
  if (!tocText) return []

  const entries = []
  const lines = tocText.split('\n').map(l => l.trim()).filter(Boolean)

  for (const line of lines) {
    // Skip very short lines or lines that are just numbers
    if (line.length < 3 || /^\d+$/.test(line)) continue

    // Extract page number from end of line (with or without dots/leaders)
    const pageMatch = line.match(/[.…·\s]{2,}\s*(\d{1,4})\s*$/) || line.match(/\s{2,}(\d{1,4})\s*$/)
    if (!pageMatch) continue

    const pageNumber = parseInt(pageMatch[1], 10)
    const title = line.slice(0, pageMatch.index).replace(/[.…·]+\s*$/, '').trim()

    if (!title || title.length < 2) continue

    // Detect level based on content patterns
    let level = 2 // default: chapter
    let type = 'section'

    const normTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // Part detection
    if (/^(parte|part)\s+[ivxlcdm\d]+/i.test(title) || /^(PARTE|PART)\s/.test(title)) {
      level = 1
      type = 'part'
    }
    // Chapter detection (explicit)
    else if (/^(capitulo|cap\.?|chapter|ch\.?)\s+\d+/i.test(normTitle)) {
      level = 2
      type = 'chapter'
    }
    // Numbered chapter (just number + title, like "3. Teoría del ingreso")
    else if (/^\d{1,2}[\.\)]\s/.test(title) && !/^\d{1,2}\.\d/.test(title)) {
      level = 2
      type = 'chapter'
    }
    // Sub-section: decimal numbering (3.1, 3.2, 12.3)
    else if (/^\d{1,2}\.\d{1,2}/.test(title)) {
      level = 3
      type = 'subsection'
    }
    // Detect indentation level from original line
    else {
      const leadingSpaces = line.match(/^(\s*)/)[1].length
      if (leadingSpaces >= 6) level = 3
      else if (leadingSpaces >= 3) level = 2
    }

    entries.push({ title, pageNumber, level, type })
  }

  // If no parts detected, promote chapters to level 1
  const hasParts = entries.some(e => e.type === 'part')
  if (!hasParts) {
    for (const entry of entries) {
      if (entry.type === 'chapter') entry.level = 1
      else if (entry.type === 'subsection') entry.level = 2
    }
  }

  console.log(`[StudyMind] TOC parsed: ${entries.length} entries (${entries.filter(e => e.level === 1).length} L1, ${entries.filter(e => e.level === 2).length} L2, ${entries.filter(e => e.level === 3).length} L3)`)
  return entries
}

/**
 * Detect page offset between book page numbers (from TOC) and PDF page numbers.
 * Returns the offset to add to book page to get PDF page.
 */
export function detectPageOffset(pages, tocEntries) {
  if (!pages?.length || !tocEntries?.length) return 0

  const normalizeForSearch = (text) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

  // Pre-normalize all pages once
  const normalizedPages = pages.map(p => ({
    pageNumber: p.pageNumber,
    text: normalizeForSearch(p.text),
  }))

  // Pass 1: exact title match (try ALL entries, not just first 5)
  for (const entry of tocEntries) {
    if (!entry.pageNumber) continue
    const searchTitle = normalizeForSearch(entry.title)
    if (searchTitle.length < 5) continue

    for (const page of normalizedPages) {
      if (page.text.includes(searchTitle)) {
        const offset = page.pageNumber - entry.pageNumber
        console.log(`[StudyMind] Page offset detected: ${offset} (found "${entry.title}" at PDF page ${page.pageNumber}, book page ${entry.pageNumber})`)
        return offset
      }
    }
  }

  // Pass 2: partial match — use first significant words of the title
  for (const entry of tocEntries) {
    if (!entry.pageNumber) continue
    const fullTitle = normalizeForSearch(entry.title)
    // Strip common prefixes like "capitulo X:", "parte X:", etc.
    const stripped = fullTitle.replace(/^(capitulo|parte|seccion|unidad|tema)\s+[\divxlc]+[.:)\s-]*/i, '').trim()
    const words = (stripped || fullTitle).split(' ').filter(w => w.length > 2)
    if (words.length < 2) continue

    // Try matching first 4 words, then 3, then 2
    for (let n = Math.min(words.length, 4); n >= 2; n--) {
      const partial = words.slice(0, n).join(' ')
      if (partial.length < 8) continue

      for (const page of normalizedPages) {
        if (page.text.includes(partial)) {
          const offset = page.pageNumber - entry.pageNumber
          console.log(`[StudyMind] Page offset detected (partial): ${offset} (matched "${partial}" at PDF page ${page.pageNumber}, book page ${entry.pageNumber})`)
          return offset
        }
      }
    }
  }

  console.log('[StudyMind] Could not detect page offset, defaulting to 0')
  return 0
}

/**
 * Convert parsed TOC entries into section structure (similar to LLM output format).
 * Assigns parentId based on level hierarchy.
 */
export function tocEntriesToStructure(entries, pageOffset = 0) {
  const sections = []
  const parentStack = [] // stack of { id, level }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    const id = i + 1

    // Find parent: closest ancestor in stack with lower level
    while (parentStack.length > 0 && parentStack[parentStack.length - 1].level >= entry.level) {
      parentStack.pop()
    }
    const parentId = parentStack.length > 0 ? parentStack[parentStack.length - 1].id : null

    // Calculate PDF page from book page + offset
    const pdfPage = entry.pageNumber + pageOffset

    sections.push({
      id,
      title: entry.title,
      level: entry.level,
      parentId,
      pageStart: pdfPage,
      bookPage: entry.pageNumber,
    })

    parentStack.push({ id, level: entry.level })
  }

  // Compute pageEnd for each section
  for (let i = 0; i < sections.length; i++) {
    const next = sections.find((s, j) => j > i && s.level <= sections[i].level)
    sections[i].pageEnd = next ? next.pageStart - 1 : null
  }

  return sections
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
