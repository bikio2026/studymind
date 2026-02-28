// Shared model display name mapping
export const MODEL_DISPLAY = {
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
  'claude-sonnet-4-20250514': 'Sonnet 4',
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B',
}

export function getModelName(modelId) {
  return MODEL_DISPLAY[modelId] || modelId || 'Desconocido'
}

export function getProviderName(provider) {
  const names = { claude: 'Claude', groq: 'Groq' }
  return names[provider] || provider || ''
}
