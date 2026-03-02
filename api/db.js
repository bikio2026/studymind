const { cors, readBody, requireAuth } = require('./_shared.js')

let dbModule = null
let initialized = false

function getDB() {
  if (!dbModule) {
    try {
      dbModule = require('../lib/database.cjs')
    } catch (e) {
      console.error('[DB] Failed to load database module:', e.message, e.stack)
      throw e
    }
  }
  return dbModule
}

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

  try {
    const db = getDB()

    if (!initialized) {
      await db.initDB()
      initialized = true
    }

    const body = await readBody(req)
    const { action, params = {} } = JSON.parse(body)

    if (!action) {
      res.status(400).json({ ok: false, error: 'Missing action' })
      return
    }

    const result = await db.handleAction(action, params)
    res.status(200).json({ ok: true, data: result !== undefined ? result : null })
  } catch (err) {
    console.error('[DB] Error:', err.message, err.stack)
    res.status(500).json({ ok: false, error: err.message })
  }
}
