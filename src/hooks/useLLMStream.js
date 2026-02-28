import { useState, useCallback, useRef } from 'react'

const ENDPOINTS = {
  claude: '/api/analyze-claude',
  groq: '/api/analyze-groq',
}

export function useLLMStream() {
  const [status, setStatus] = useState({ claude: false, groq: false })
  const controllerRef = useRef(null)

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setStatus({
        claude: data.claude?.available || false,
        groq: data.groq?.available || false,
      })
      return data
    } catch {
      return null
    }
  }, [])

  const streamRequest = useCallback(async (prompt, { provider = 'claude', model, promptVersion = 'structure', maxTokens = 4096, onToken, onDone, onError }) => {
    if (controllerRef.current) {
      controllerRef.current.abort()
    }
    const controller = new AbortController()
    controllerRef.current = controller

    try {
      const endpoint = ENDPOINTS[provider]
      if (!endpoint) throw new Error(`Provider desconocido: ${provider}`)

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model, promptVersion, maxTokens }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error de red' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const json = JSON.parse(line.slice(6))
            if (json.token) {
              fullText += json.token
              onToken?.(fullText, json.token)
            }
            if (json.done) {
              onDone?.(fullText)
            }
          } catch { /* skip */ }
        }
      }

      // Ensure onDone is called even if no explicit done signal
      if (fullText) {
        onDone?.(fullText)
      }

      return fullText
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message)
        throw err
      }
    }
  }, [])

  const cancel = useCallback(() => {
    controllerRef.current?.abort()
  }, [])

  return { status, checkHealth, streamRequest, cancel }
}
