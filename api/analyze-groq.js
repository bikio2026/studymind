const { GROQ_API_URL, getSystemPrompt, sseHeaders, cors, readBody, requireAuth } = require('./_shared.js')

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
    const { prompt, model = 'llama-3.3-70b-versatile', promptVersion = 'structure', maxTokens = 4096 } = JSON.parse(body)
    const systemPrompt = getSystemPrompt(promptVersion)
    const apiKey = process.env.GROQ_API_KEY

    if (!apiKey) {
      res.status(401).json({ error: 'GROQ_API_KEY no configurada' })
      return
    }

    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: Math.min(maxTokens, 8192),
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      let detail = ''
      try { detail = JSON.parse(errText).error?.message || errText.slice(0, 200) } catch { detail = errText.slice(0, 200) }

      // Return the upstream status so the client can classify the error (429 = rate limit, etc.)
      res.status(groqRes.status).json({ error: `Groq API (${groqRes.status}): ${detail}`, status: groqRes.status })
      return
    }

    sseHeaders(res)
    const reader = groqRes.body.getReader()
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
        if (data === '[DONE]') {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
          continue
        }

        try {
          const json = JSON.parse(data)
          const content = json.choices?.[0]?.delta?.content
          if (content) {
            res.write(`data: ${JSON.stringify({ token: content })}\n\n`)
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
