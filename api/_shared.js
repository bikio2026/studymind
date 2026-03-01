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

  chat: `Sos un tutor socrático experto en el tema que se te presenta. Tu rol es GUIAR al estudiante a pensar, no darle respuestas directas.

REGLAS:
- Respondé en español rioplatense, claro y accesible.
- Usá el método socrático: ante una pregunta, respondé con otra pregunta que guíe al estudiante a descubrir la respuesta por sí mismo.
- Si el estudiante está muy perdido (después de 2-3 intercambios sin avance), podés dar una pista más directa, pero nunca la respuesta completa de entrada.
- Si el estudiante te pide explícitamente la respuesta ("decime la respuesta", "no entiendo nada"), podés ser más directo pero siempre explicando el razonamiento, no solo el dato.
- Basá tus respuestas EXCLUSIVAMENTE en el contexto del tema que se te proporciona. No inventes información que no esté en el material.
- Respuestas cortas y focalizadas (2-4 oraciones). No des clases magistrales.
- Si el estudiante pregunta algo fuera del tema, redirigilo amablemente al contenido de la sección.
- Podés usar analogías y ejemplos cotidianos para clarificar conceptos.
- Usá formato de texto plano. Nada de markdown, listas ni encabezados.
- Nunca empezás con "¡Buena pregunta!" ni frases condescendientes similares.`,
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
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.status(200)
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

// Origin-based auth: only allow requests from known domains
// ALLOWED_ORIGINS env var = comma-separated list (e.g. "https://studymind-eight.vercel.app,http://localhost:3057")
// If not set, auth is disabled (dev mode — allows all origins)
function requireAuth(req, res) {
  const allowedRaw = process.env.ALLOWED_ORIGINS
  if (!allowedRaw) return true // No origins configured → allow all (dev)

  const allowed = allowedRaw.split(',').map(s => s.trim()).filter(Boolean)
  const origin = req.headers.origin || ''
  const referer = req.headers.referer || ''

  // Check origin header (sent on POST/fetch requests)
  if (origin && allowed.some(a => origin.startsWith(a))) return true
  // Fallback: check referer (some browsers send referer instead of origin)
  if (referer && allowed.some(a => referer.startsWith(a))) return true

  res.status(403).json({ error: 'Origen no autorizado.' })
  return false
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => resolve(body))
  })
}

module.exports = {
  ANTHROPIC_API_URL,
  ANTHROPIC_VERSION,
  GROQ_API_URL,
  SYSTEM_PROMPTS,
  getSystemPrompt,
  CLAUDE_MODELS,
  GROQ_MODELS,
  sseHeaders,
  cors,
  readBody,
  requireAuth,
}
