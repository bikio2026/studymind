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

export function extractTOCText(pages, maxPages = 5) {
  return pages
    .slice(0, maxPages)
    .map(p => p.text)
    .join('\n\n')
}

export function getSampledText(pages, maxTokens = 8000) {
  const maxChars = maxTokens * 4
  const tocText = extractTOCText(pages)

  if (tocText.length >= maxChars) {
    return tocText.slice(0, maxChars)
  }

  let result = tocText
  const step = Math.max(1, Math.floor(pages.length / 20))

  for (let i = 5; i < pages.length; i += step) {
    if (result.length >= maxChars) break
    result += `\n\n--- Página ${pages[i].pageNumber} ---\n${pages[i].text.slice(0, 500)}`
  }

  return result.slice(0, maxChars)
}
