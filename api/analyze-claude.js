const { ANTHROPIC_API_URL, ANTHROPIC_VERSION, getSystemPrompt, sseHeaders, cors, readBody, requireAuth } = require('./_shared.js')

module.exports = async function handler(req, res) {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!requireAuth(req, res)) return

  const body = await readBody(req)
  try {
    const { prompt, model = 'claude-haiku-4-5-20251001', promptVersion = 'structure', maxTokens = 4096 } = JSON.parse(body)
    const systemPrompt = getSystemPrompt(promptVersion)
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      res.status(401).json({ error: 'ANTHROPIC_API_KEY no configurada' })
      return
    }

    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(maxTokens, 8192),
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      let detail = ''
      try { detail = JSON.parse(errText).error?.message || errText.slice(0, 200) } catch { detail = errText.slice(0, 200) }

      // Return the upstream status so the client can classify the error (429 = rate limit, etc.)
      res.status(claudeRes.status).json({ error: `Claude API (${claudeRes.status}): ${detail}`, status: claudeRes.status })
      return
    }

    sseHeaders(res)
    const reader = claudeRes.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') continue

        try {
          const json = JSON.parse(data)
          if (json.type === 'content_block_delta' && json.delta?.text) {
            res.write(`data: ${JSON.stringify({ token: json.delta.text })}\n\n`)
          }
          if (json.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          }
        } catch { /* skip malformed */ }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
    res.end()
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({ error: err.message })
    } else {
      res.end()
    }
  }
}
