import http from 'node:http'
import { readFileSync } from 'node:fs'

// Load .env
try {
  const envContent = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx)
    const val = trimmed.slice(eqIdx + 1)
    process.env[key] = val
  }
} catch { /* .env not found */ }

const PORT = 3058
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPTS = {
  structure: `Sos un analizador experto de documentos académicos y libros de texto. Tu tarea es identificar la estructura de un documento.

REGLAS ESTRICTAS:
- Respondé ÚNICAMENTE con JSON válido. Sin texto antes ni después del JSON.
- Identificá el título del documento y el autor si aparece.
- Listá TODAS las secciones, capítulos y subsecciones que identifiques.
- Asigná niveles jerárquicos: 1 = capítulo/parte principal, 2 = sección, 3 = subsección.
- Si hay un índice formal, usalo como base principal.
- Si no hay índice, inferí la estructura por encabezados y cambios temáticos.
- parentId referencia al id de la sección padre (null si es nivel 1).`,

  studyGuide: `Sos un tutor experto que crea guías de estudio excepcionales. Tu objetivo es que el estudiante entienda conceptos profundos de forma clara y eficiente.

REGLAS ESTRICTAS:
- Respondé ÚNICAMENTE con JSON válido. Sin texto antes ni después del JSON.
- El resumen debe capturar la ESENCIA del tema en 2-3 oraciones.
- La explicación expandida debe ser MEJOR que el texto original: más clara, más organizada, con analogías cuando ayuden.
- Los conceptos clave deben ser frases cortas y concretas (no oraciones largas).
- Las preguntas del quiz deben evaluar COMPRENSIÓN CONCEPTUAL, no memorización de datos.
- Clasificá la relevancia honestamente: "core" solo si es fundamental para entender el resto.
- Las conexiones deben referir a otras secciones del mismo documento.
- Escribí en español rioplatense, claro y didáctico.`,

  summary: `Sos un tutor experto que sintetiza textos académicos. Español rioplatense, didáctico.
Respondé en texto plano, sin markdown. Priorizá comprensión conceptual sobre detalles.`,
}

function getSystemPrompt(version) {
  return SYSTEM_PROMPTS[version] || SYSTEM_PROMPTS.structure
}

const CLAUDE_MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', speed: 'rápido' },
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4', speed: 'equilibrado' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Sonnet 4.5', speed: 'preciso' },
]

const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', speed: 'rápido' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', speed: 'ultra rápido' },
]

function sseHeaders(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => resolve(body))
  })
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Health check
  if (req.url === '/api/health' && req.method === 'GET') {
    const result = {
      claude: { available: false, models: [] },
      groq: { available: false, models: [] },
    }

    if (process.env.ANTHROPIC_API_KEY) {
      result.claude.available = true
      result.claude.models = CLAUDE_MODELS.map(m => m.id)
    }

    if (process.env.GROQ_API_KEY) {
      result.groq.available = true
      result.groq.models = GROQ_MODELS.map(m => m.id)
    }

    const status = result.claude.available || result.groq.available ? 'ok' : 'error'
    res.writeHead(status === 'ok' ? 200 : 503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status, ...result }))
    return
  }

  // Claude API — streaming
  if (req.url === '/api/analyze-claude' && req.method === 'POST') {
    const body = await readBody(req)
    try {
      const { prompt, model = 'claude-haiku-4-5-20251001', promptVersion = 'structure', maxTokens = 4096 } = JSON.parse(body)
      const systemPrompt = getSystemPrompt(promptVersion)
      const apiKey = process.env.ANTHROPIC_API_KEY

      if (!apiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada. Agregala al archivo .env' }))
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
        res.writeHead(claudeRes.status, { 'Content-Type': 'application/json' })
        let detail = ''
        try { detail = JSON.parse(errText).error?.message || errText.slice(0, 200) } catch { detail = errText.slice(0, 200) }
        res.end(JSON.stringify({ error: `Claude API (${claudeRes.status}): ${detail}` }))
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
      console.error('Claude error:', err.message)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      } else {
        res.end()
      }
    }
    return
  }

  // Groq API — streaming
  if (req.url === '/api/analyze-groq' && req.method === 'POST') {
    const body = await readBody(req)
    try {
      const { prompt, model = 'llama-3.3-70b-versatile', promptVersion = 'structure', maxTokens = 4096 } = JSON.parse(body)
      const systemPrompt = getSystemPrompt(promptVersion)
      const apiKey = process.env.GROQ_API_KEY

      if (!apiKey) {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'GROQ_API_KEY no configurada. Agregala al archivo .env' }))
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
        res.writeHead(groqRes.status, { 'Content-Type': 'application/json' })
        let detail = ''
        try { detail = JSON.parse(errText).error?.message || errText.slice(0, 200) } catch { detail = errText.slice(0, 200) }
        res.end(JSON.stringify({ error: `Groq API (${groqRes.status}): ${detail}` }))
        return
      }

      sseHeaders(res)
      const reader = groqRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let doneSent = false

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
            if (!doneSent) {
              doneSent = true
              res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
            }
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

      // Only send done if Groq didn't send [DONE] signal
      if (!doneSent) {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
      }
      res.end()
    } catch (err) {
      console.error('Groq error:', err.message)
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: err.message }))
      } else {
        res.end()
      }
    }
    return
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`StudyMind API running on http://localhost:${PORT}`)
  console.log(`Claude API: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'not configured (set ANTHROPIC_API_KEY in .env)'}`)
  console.log(`Groq API: ${process.env.GROQ_API_KEY ? 'configured' : 'not configured (set GROQ_API_KEY in .env)'}`)
})
