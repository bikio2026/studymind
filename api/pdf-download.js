const { cors, requireAuth } = require('./_shared.js')

let dbModule = null
let initialized = false

function getDB() {
  if (!dbModule) dbModule = require('../lib/database.cjs')
  return dbModule
}

module.exports = async function handler(req, res) {
  cors(res)

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  if (!requireAuth(req, res)) return

  const hash = req.query?.hash || new URL(req.url, 'http://localhost').searchParams.get('hash')
  if (!hash) {
    res.status(400).json({ error: 'Missing hash parameter' })
    return
  }

  try {
    const db = getDB()
    if (!initialized) {
      await db.initDB()
      initialized = true
    }

    const book = await db.handleAction('getBookByHash', { hash })
    if (!book || !book.pdfBlobUrl) {
      res.status(404).json({ error: 'PDF not found on server' })
      return
    }

    // Redirect to the Vercel Blob URL (publicly accessible)
    res.redirect(302, book.pdfBlobUrl)
  } catch (err) {
    console.error('[PDF Download] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
}
