import { useState, useCallback, useRef } from 'react'

const ENDPOINTS = {
  claude: '/api/analyze-claude',
  groq: '/api/analyze-groq',
}

// Rate limit retry config
const MAX_RETRIES = 3
const BASE_DELAY_MS = 2000 // 2s base for exponential backoff

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Detect if error is a rate limit (429) or spending limit
function classifyError(status, message) {
  const msg = (message || '').toLowerCase()

  // Anthropic spending limit — not retryable
  if (msg.includes('usage limit') || msg.includes('spending limit') || msg.includes('will regain access')) {
    return 'spending_limit'
  }
  // Rate limit (429) — retryable with backoff
  if (status === 429 || msg.includes('rate limit') || msg.includes('too many request')) {
    return 'rate_limit'
  }
  // Overloaded (529) — retryable
  if (status === 529 || msg.includes('overloaded')) {
    return 'overloaded'
  }
  return 'other'
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
    const endpoint = ENDPOINTS[provider]
    if (!endpoint) throw new Error(`Provider desconocido: ${provider}`)

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Each attempt gets its own controller
      const controller = new AbortController()
      activeControllers.current.add(controller)

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, model, promptVersion, maxTokens }),
          signal: controller.signal,
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Error de red' }))
          const errMsg = err.error || `HTTP ${res.status}`
          const errorType = classifyError(res.status, errMsg)

          // Spending limit: don't retry, give clear message
          if (errorType === 'spending_limit') {
            const providerName = provider === 'claude' ? 'Anthropic' : 'Groq'
            throw new Error(`Límite de gasto mensual alcanzado en ${providerName}. Revisá tu plan en la consola del proveedor o probá con otro provider.`)
          }

          // Rate limit / overloaded: retry with backoff
          if ((errorType === 'rate_limit' || errorType === 'overloaded') && attempt < MAX_RETRIES) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt) // 2s, 4s, 8s
            console.log(`[StudyMind] ${errorType} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`)
            activeControllers.current.delete(controller)
            await sleep(delay)
            continue
          }

          // Rate limit after all retries exhausted
          if (errorType === 'rate_limit') {
            const providerName = provider === 'claude' ? 'Anthropic' : 'Groq'
            throw new Error(`Rate limit de ${providerName} excedido después de ${MAX_RETRIES} reintentos. Esperá unos minutos y volvé a intentar.`)
          }

          throw new Error(errMsg)
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
        if (err.name === 'AbortError') {
          return // Cancelled — exit silently
        }
        // If this was a retry attempt and we got a non-retryable error, throw it
        if (attempt === MAX_RETRIES || !['rate_limit', 'overloaded'].includes(classifyError(0, err.message))) {
          onError?.(err.message)
          throw err
        }
      } finally {
        activeControllers.current.delete(controller)
      }
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
