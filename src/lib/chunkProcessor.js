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

export function extractSectionText(fullText, sections, sectionId) {
  const section = sections.find(s => s.id === sectionId)
  if (!section) return ''

  const sectionIdx = sections.indexOf(section)
  const nextSameOrHigherLevel = sections.find(
    (s, i) => i > sectionIdx && s.level <= section.level
  )

  const startIdx = fullText.indexOf(section.title)
  if (startIdx === -1) return ''

  let endIdx = fullText.length
  if (nextSameOrHigherLevel) {
    const nextIdx = fullText.indexOf(nextSameOrHigherLevel.title, startIdx + section.title.length)
    if (nextIdx > -1) endIdx = nextIdx
  }

  return fullText.slice(startIdx, endIdx).trim()
}
