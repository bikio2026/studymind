import { useState, useCallback, useRef } from 'react'

const ENDPOINTS = {
  claude: '/api/analyze-claude',
  groq: '/api/analyze-groq',
}

export function useLLMStream() {
  const [status, setStatus] = useState({ claude: false, groq: false })
  const activeControllers = useRef(new Set())

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
    // Each request gets its own independent controller — no aborting previous requests
    const controller = new AbortController()
    activeControllers.current.add(controller)

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
      let doneCalled = false

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
            if (json.done && !doneCalled) {
              doneCalled = true
              onDone?.(fullText)
            }
          } catch { /* skip */ }
        }
      }

      // Fallback: call onDone if stream ended without explicit done signal
      if (!doneCalled) {
        if (fullText) {
          onDone?.(fullText)
        } else {
          throw new Error('El modelo no generó contenido. Probá con otro modelo o un PDF más corto.')
        }
      }

      return fullText
    } catch (err) {
      if (err.name !== 'AbortError') {
        onError?.(err.message)
        throw err
      }
    } finally {
      activeControllers.current.delete(controller)
    }
  }, [])

  const cancel = useCallback(() => {
    // Cancel all active requests
    for (const controller of activeControllers.current) {
      controller.abort()
    }
    activeControllers.current.clear()
  }, [])

  return { status, checkHealth, streamRequest, cancel }
}
