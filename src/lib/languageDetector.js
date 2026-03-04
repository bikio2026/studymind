/**
 * Simple language detection based on stop word frequency.
 * No LLM calls needed — runs client-side in <1ms.
 */

const STOP_WORDS = {
  en: ['the', 'and', 'is', 'in', 'to', 'of', 'that', 'it', 'for', 'with', 'as', 'this', 'are', 'was', 'be', 'from', 'have', 'an', 'which', 'by', 'but', 'not', 'or', 'can', 'will', 'about', 'their', 'been', 'would', 'each'],
  es: ['de', 'la', 'el', 'en', 'que', 'los', 'del', 'las', 'un', 'por', 'con', 'una', 'para', 'es', 'se', 'como', 'su', 'al', 'más', 'pero', 'sus', 'este', 'entre', 'cuando', 'esta', 'también', 'son', 'hay', 'sobre', 'tiene'],
  pt: ['que', 'em', 'um', 'para', 'com', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'ao', 'ele', 'das', 'tem', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está'],
  fr: ['le', 'et', 'les', 'des', 'en', 'un', 'une', 'du', 'que', 'est', 'dans', 'qui', 'par', 'pour', 'au', 'sur', 'pas', 'sont', 'avec', 'ce', 'il', 'se', 'cette', 'son', 'mais', 'nous', 'ses', 'tout', 'aux', 'elle'],
  de: ['der', 'die', 'und', 'den', 'das', 'von', 'ist', 'des', 'ein', 'mit', 'dem', 'nicht', 'sich', 'auf', 'eine', 'auch', 'als', 'noch', 'nach', 'wie', 'wird', 'bei', 'oder', 'nur', 'einer', 'sind', 'kann', 'wenn', 'aber', 'hat'],
  it: ['di', 'che', 'il', 'la', 'per', 'un', 'una', 'del', 'alla', 'con', 'sono', 'nel', 'dalla', 'dei', 'delle', 'gli', 'anche', 'come', 'più', 'questo', 'essere', 'suo', 'sua', 'hanno', 'cui', 'tra', 'stato', 'già', 'tutti', 'dopo'],
}

// Discriminator words: unique to one language, helps resolve ambiguity
const DISCRIMINATORS = {
  en: ['the', 'and', 'with', 'that', 'this', 'from', 'have', 'been', 'would', 'which'],
  es: ['los', 'las', 'del', 'una', 'como', 'más', 'pero', 'cuando', 'también', 'sobre'],
  pt: ['uma', 'dos', 'das', 'tem', 'muito', 'sua', 'seu', 'nos', 'há', 'está'],
  fr: ['les', 'des', 'une', 'dans', 'pour', 'sont', 'avec', 'cette', 'nous', 'tout'],
  de: ['der', 'die', 'und', 'den', 'das', 'ein', 'nicht', 'sich', 'auch', 'wird'],
  it: ['che', 'del', 'alla', 'nel', 'delle', 'gli', 'anche', 'questo', 'essere', 'hanno'],
}

const LANGUAGE_NAMES = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
}

/**
 * Detect the language of a text sample using stop word frequency.
 * @param {string} text - Text to analyze
 * @param {number} sampleSize - Chars to sample (default 3000)
 * @returns {string} Language code ('en', 'es', etc.)
 */
export function detectLanguage(text, sampleSize = 3000) {
  if (!text || text.length < 50) return 'es' // fallback

  const sample = text.slice(0, sampleSize).toLowerCase()
  const words = sample.split(/[\s.,;:!?()[\]{}"'`\-/\\]+/).filter(w => w.length >= 2)

  if (words.length < 20) return 'es' // too little text

  const wordSet = new Set(words)
  const scores = {}

  for (const [lang, stopWords] of Object.entries(STOP_WORDS)) {
    let score = 0
    for (const sw of stopWords) {
      if (wordSet.has(sw)) score += 1
    }
    // Bonus for discriminator words (x2 weight)
    for (const dw of (DISCRIMINATORS[lang] || [])) {
      if (wordSet.has(dw)) score += 1
    }
    scores[lang] = score
  }

  // Find top score
  let bestLang = 'es'
  let bestScore = 0
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestLang = lang
    }
  }

  return bestLang
}

/**
 * Get the display name for a language code.
 */
export function getLanguageName(code) {
  return LANGUAGE_NAMES[code] || code
}

/**
 * Get all supported languages as [code, name] pairs.
 */
export function getSupportedLanguages() {
  return Object.entries(LANGUAGE_NAMES)
}

/**
 * Get content languages (the two main ones for content generation/translation).
 */
export function getContentLanguages() {
  return [
    ['en', 'English'],
    ['es', 'Español'],
  ]
}
