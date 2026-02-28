import { useState, useEffect } from 'react'
import { Cpu } from 'lucide-react'

const PROVIDERS = {
  claude: {
    name: 'Claude',
    models: [
      { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5' },
      { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4' },
    ],
  },
  groq: {
    name: 'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B' },
    ],
  },
}

const STORAGE_KEYS = {
  provider: 'studymind-llm-provider',
  model: 'studymind-llm-model',
}

export default function LLMSelector({ status, onProviderChange }) {
  const [provider, setProvider] = useState(
    () => localStorage.getItem(STORAGE_KEYS.provider) || 'claude'
  )
  const [model, setModel] = useState(
    () => localStorage.getItem(STORAGE_KEYS.model) || 'claude-haiku-4-5-20251001'
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.provider, provider)
    localStorage.setItem(STORAGE_KEYS.model, model)
    onProviderChange?.({ provider, model })
  }, [provider, model, onProviderChange])

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    setModel(PROVIDERS[newProvider].models[0].id)
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <Cpu className="w-4 h-4 text-text-muted" />
      <select
        value={provider}
        onChange={(e) => handleProviderChange(e.target.value)}
        className="bg-surface-alt text-text px-2 py-1 rounded border border-surface-light text-xs cursor-pointer"
      >
        {Object.entries(PROVIDERS).map(([key, { name }]) => (
          <option key={key} value={key} disabled={status && !status[key]}>
            {name} {status && !status[key] ? '(no disponible)' : ''}
          </option>
        ))}
      </select>
      <select
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="bg-surface-alt text-text px-2 py-1 rounded border border-surface-light text-xs cursor-pointer"
      >
        {PROVIDERS[provider].models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
    </div>
  )
}
