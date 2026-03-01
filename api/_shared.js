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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-secret')
}

// Simple auth: verify x-api-secret header matches APP_SECRET env var
// If APP_SECRET is not set, auth is disabled (dev mode)
function requireAuth(req, res) {
  const secret = process.env.APP_SECRET
  if (!secret) return true // No secret configured → allow (dev)

  const provided = req.headers['x-api-secret']
  if (provided === secret) return true

  res.status(403).json({ error: 'Acceso no autorizado. Verificá la configuración de APP_SECRET.' })
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
