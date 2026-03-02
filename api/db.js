const { cors, readBody, requireAuth } = require('./_shared.js')
const { initDB, handleAction } = require('../lib/database.cjs')

let initialized = false

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

  if (!initialized) {
    await initDB()
    initialized = true
  }

  const body = await readBody(req)
  try {
    const { action, params = {} } = JSON.parse(body)

    if (!action) {
      res.status(400).json({ ok: false, error: 'Missing action' })
      return
    }

    const result = await handleAction(action, params)
    res.status(200).json({ ok: true, data: result !== undefined ? result : null })
  } catch (err) {
    console.error('[DB]', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
}
