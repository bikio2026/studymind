const { handleUpload } = require('@vercel/blob/client')
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

  if (!requireAuth(req, res)) return

  try {
    // handleUpload manages the client upload token generation
    const response = await handleUpload({
      body: req.body || await readBodyJSON(req),
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        // Validate: only PDFs, max 100MB
        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 100 * 1024 * 1024,
          tokenPayload: pathname,
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // After upload completes, save the blob URL to the book
        // The tokenPayload contains the pathname which includes the contentHash
        const contentHash = extractHashFromPath(blob.pathname)
        if (contentHash) {
          try {
            const db = getDB()
            if (!initialized) {
              await db.initDB()
              initialized = true
            }
            await db.handleAction('updateBookBlobUrl', {
              contentHash,
              blobUrl: blob.url,
            })
          } catch (e) {
            console.error('[PDF Upload] Failed to save blob URL:', e.message)
          }
        }
      },
    })

    res.status(200).json(response)
  } catch (err) {
    console.error('[PDF Upload] Error:', err.message)
    res.status(err.status || 500).json({ error: err.message })
  }
}

function readBodyJSON(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try { resolve(JSON.parse(body)) }
      catch { resolve({}) }
    })
  })
}

function extractHashFromPath(pathname) {
  // pathname format: "pdfs/{contentHash}.pdf"
  const match = pathname.match(/pdfs\/([a-f0-9]+)\.pdf/)
  return match ? match[1] : null
}
