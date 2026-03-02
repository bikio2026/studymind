// SQLite database module for StudyMind
// Works with both local file (dev) and Turso remote (production)

let client = null

function getClient() {
  if (client) return client
  const url = process.env.TURSO_DATABASE_URL || 'file:./data/studymind.db'
  const authToken = process.env.TURSO_AUTH_TOKEN || undefined

  // Use HTTP-only client for remote URLs (Vercel serverless — no native bindings)
  // Use full client for local file:// URLs (dev — needs sqlite3 native)
  let createClientFn
  if (url.startsWith('file:')) {
    createClientFn = require('@libsql/client').createClient
  } else {
    createClientFn = require('@libsql/client/http').createClient
  }

  client = createClientFn({ url, authToken })
  return client
}

async function initDB() {
  const db = getClient()
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      file_name TEXT,
      content_hash TEXT,
      processed_at INTEGER,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS structures (
      document_id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS progress (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS page_data (
      document_id TEXT PRIMARY KEY,
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at INTEGER
    );
  `)
}

// --- Documents ---

async function getAllDocuments() {
  const db = getClient()
  const result = await db.execute('SELECT data FROM documents ORDER BY processed_at DESC')
  return result.rows.map(r => JSON.parse(r.data))
}

async function getDocument(id) {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM documents WHERE id = ?', args: [id] })
  return result.rows[0] ? JSON.parse(result.rows[0].data) : null
}

async function saveDocument(doc) {
  const db = getClient()
  await db.execute({
    sql: `INSERT OR REPLACE INTO documents (id, file_name, content_hash, processed_at, data)
          VALUES (?, ?, ?, ?, ?)`,
    args: [doc.id, doc.fileName || null, doc.contentHash || null, doc.processedAt || null, JSON.stringify(doc)]
  })
}

async function findByContentHash(hash) {
  if (!hash) return []
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM documents WHERE content_hash = ?', args: [hash] })
  return result.rows.map(r => JSON.parse(r.data))
}

async function deleteDocument(id) {
  const db = getClient()
  // Cascade delete all related data
  await db.execute({ sql: 'DELETE FROM documents WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM structures WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM topics WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM progress WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM page_data WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM chat_history WHERE document_id = ?', args: [id] })
}

// --- Structures ---

async function getStructure(documentId) {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM structures WHERE document_id = ?', args: [documentId] })
  return result.rows[0] ? JSON.parse(result.rows[0].data) : null
}

async function saveStructure(documentId, structure) {
  const db = getClient()
  await db.execute({
    sql: 'INSERT OR REPLACE INTO structures (document_id, data) VALUES (?, ?)',
    args: [documentId, JSON.stringify({ documentId, ...structure })]
  })
}

// --- Topics ---

async function getTopics(documentId) {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM topics WHERE document_id = ?', args: [documentId] })
  return result.rows.map(r => JSON.parse(r.data))
}

async function saveTopic(documentId, topic) {
  const id = `${documentId}_${topic.id}`
  const db = getClient()
  const record = { ...topic, id, documentId }
  await db.execute({
    sql: 'INSERT OR REPLACE INTO topics (id, document_id, data) VALUES (?, ?, ?)',
    args: [id, documentId, JSON.stringify(record)]
  })
}

async function deleteTopics(documentId) {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM topics WHERE document_id = ?', args: [documentId] })
}

// --- Progress ---

async function getProgress(documentId) {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM progress WHERE document_id = ?', args: [documentId] })
  return result.rows.map(r => JSON.parse(r.data))
}

async function saveProgress(documentId, topicId, data) {
  const id = `${documentId}_${topicId}`
  const db = getClient()
  const record = { id, documentId, topicId, ...data }
  await db.execute({
    sql: 'INSERT OR REPLACE INTO progress (id, document_id, data) VALUES (?, ?, ?)',
    args: [id, documentId, JSON.stringify(record)]
  })
}

// --- Page Data ---

async function savePageData(documentId, data) {
  const db = getClient()
  const record = { documentId, ...data }
  await db.execute({
    sql: 'INSERT OR REPLACE INTO page_data (document_id, data) VALUES (?, ?)',
    args: [documentId, JSON.stringify(record)]
  })
}

async function getPageData(documentId) {
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM page_data WHERE document_id = ?', args: [documentId] })
  return result.rows[0] ? JSON.parse(result.rows[0].data) : null
}

// --- Chat History ---

async function getChatHistory(documentId, topicId) {
  const id = `${documentId}_${topicId}`
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM chat_history WHERE id = ?', args: [id] })
  if (!result.rows[0]) return []
  const record = JSON.parse(result.rows[0].data)
  return record.messages || []
}

async function saveChatHistory(documentId, topicId, messages) {
  const id = `${documentId}_${topicId}`
  const db = getClient()
  const record = { id, documentId, topicId, messages, updatedAt: Date.now() }
  await db.execute({
    sql: 'INSERT OR REPLACE INTO chat_history (id, document_id, data, updated_at) VALUES (?, ?, ?, ?)',
    args: [id, documentId, JSON.stringify(record), Date.now()]
  })
}

async function deleteChatHistory(documentId, topicId) {
  const id = `${documentId}_${topicId}`
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM chat_history WHERE id = ?', args: [id] })
}

// --- Action Router ---

async function handleAction(action, params) {
  switch (action) {
    case 'getAllDocuments': return getAllDocuments()
    case 'getDocument': return getDocument(params.id)
    case 'saveDocument': return saveDocument(params.doc)
    case 'findByContentHash': return findByContentHash(params.hash)
    case 'deleteDocument': return deleteDocument(params.id)
    case 'getStructure': return getStructure(params.documentId)
    case 'saveStructure': return saveStructure(params.documentId, params.structure)
    case 'getTopics': return getTopics(params.documentId)
    case 'saveTopic': return saveTopic(params.documentId, params.topic)
    case 'deleteTopics': return deleteTopics(params.documentId)
    case 'getProgress': return getProgress(params.documentId)
    case 'saveProgress': return saveProgress(params.documentId, params.topicId, params.data)
    case 'savePageData': return savePageData(params.documentId, params.data)
    case 'getPageData': return getPageData(params.documentId)
    case 'getChatHistory': return getChatHistory(params.documentId, params.topicId)
    case 'saveChatHistory': return saveChatHistory(params.documentId, params.topicId, params.messages)
    case 'deleteChatHistory': return deleteChatHistory(params.documentId, params.topicId)
    default: throw new Error(`Unknown action: ${action}`)
  }
}

module.exports = { initDB, handleAction }
