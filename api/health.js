const { CLAUDE_MODELS, GROQ_MODELS, cors } = require('./_shared.js')

module.exports = function handler(req, res) {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

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
  res.status(status === 'ok' ? 200 : 503).json({ status, ...result })
}
