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

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      content_hash TEXT UNIQUE NOT NULL,
      file_name TEXT,
      total_pages INTEGER,
      structure TEXT NOT NULL,
      created_at INTEGER
    );
  `)

  // Add book_id column to documents (idempotent — ignore if already exists)
  try {
    await db.execute('ALTER TABLE documents ADD COLUMN book_id TEXT')
  } catch { /* column already exists */ }

  // Trash support: soft-delete columns
  try {
    await db.execute('ALTER TABLE documents ADD COLUMN is_deleted INTEGER DEFAULT 0')
  } catch { /* column already exists */ }
  try {
    await db.execute('ALTER TABLE documents ADD COLUMN deleted_at INTEGER')
  } catch { /* column already exists */ }

  // PDF blob storage URL on books table
  try {
    await db.execute('ALTER TABLE books ADD COLUMN pdf_blob_url TEXT')
  } catch { /* column already exists */ }
}

// --- Documents ---

async function getAllDocuments() {
  const db = getClient()
  const result = await db.execute('SELECT data FROM documents WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY processed_at DESC')
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
    sql: `INSERT OR REPLACE INTO documents (id, file_name, content_hash, processed_at, book_id, data)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [doc.id, doc.fileName || null, doc.contentHash || null, doc.processedAt || null, doc.bookId || null, JSON.stringify(doc)]
  })
}

async function findByContentHash(hash) {
  if (!hash) return []
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM documents WHERE content_hash = ?', args: [hash] })
  return result.rows.map(r => JSON.parse(r.data))
}

// Soft delete: move to trash (keeps all related data intact)
async function softDeleteDocument(id) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE documents SET is_deleted = 1, deleted_at = ? WHERE id = ?',
    args: [Date.now(), id]
  })
}

// Restore from trash
async function restoreDocument(id) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE documents SET is_deleted = 0, deleted_at = NULL WHERE id = ?',
    args: [id]
  })
}

// Hard delete: permanent cascade removal
async function hardDeleteDocument(id) {
  const db = getClient()
  await db.execute({ sql: 'DELETE FROM documents WHERE id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM structures WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM topics WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM progress WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM page_data WHERE document_id = ?', args: [id] })
  await db.execute({ sql: 'DELETE FROM chat_history WHERE document_id = ?', args: [id] })
}

// Legacy alias (used by old code paths — now does soft delete)
async function deleteDocument(id) {
  return softDeleteDocument(id)
}

// Get trashed documents (enriched with topic count)
async function getTrashedDocuments() {
  const db = getClient()
  const result = await db.execute(`
    SELECT d.data, d.deleted_at, d.id AS doc_id,
           (SELECT COUNT(*) FROM topics t WHERE t.document_id = d.id) AS topic_count
    FROM documents d
    WHERE d.is_deleted = 1
    ORDER BY d.deleted_at DESC
  `)
  return result.rows.map(r => ({
    ...JSON.parse(r.data),
    deletedAt: r.deleted_at,
    topicCount: Number(r.topic_count) || 0,
  }))
}

// Auto-cleanup: permanently delete docs trashed more than maxAgeMs ago
async function cleanupTrash(maxAgeMs) {
  const db = getClient()
  const cutoff = Date.now() - maxAgeMs
  // Get IDs of expired trashed docs
  const result = await db.execute({
    sql: 'SELECT id FROM documents WHERE is_deleted = 1 AND deleted_at < ?',
    args: [cutoff]
  })
  for (const row of result.rows) {
    await hardDeleteDocument(row.id)
  }
  return result.rows.length
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

// --- Books ---

async function getBookByHash(hash) {
  if (!hash) return null
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT * FROM books WHERE content_hash = ?', args: [hash] })
  if (!result.rows[0]) return null
  const row = result.rows[0]
  return {
    id: row.id,
    contentHash: row.content_hash,
    fileName: row.file_name,
    totalPages: row.total_pages,
    structure: JSON.parse(row.structure),
    createdAt: row.created_at,
    pdfBlobUrl: row.pdf_blob_url || null,
  }
}

async function getBook(id) {
  if (!id) return null
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT * FROM books WHERE id = ?', args: [id] })
  if (!result.rows[0]) return null
  const row = result.rows[0]
  return {
    id: row.id,
    contentHash: row.content_hash,
    fileName: row.file_name,
    totalPages: row.total_pages,
    structure: JSON.parse(row.structure),
    createdAt: row.created_at,
    pdfBlobUrl: row.pdf_blob_url || null,
  }
}

async function saveBook(book) {
  const db = getClient()
  await db.execute({
    sql: `INSERT OR REPLACE INTO books (id, content_hash, file_name, total_pages, structure, created_at, pdf_blob_url)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [book.id, book.contentHash, book.fileName || null, book.totalPages || null, JSON.stringify(book.structure), book.createdAt || Date.now(), book.pdfBlobUrl || null]
  })
}

async function updateBookStructure(bookId, structure) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE books SET structure = ? WHERE id = ?',
    args: [JSON.stringify(structure), bookId]
  })
}

async function updateBookContentHash(bookId, newHash) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE books SET content_hash = ? WHERE id = ?',
    args: [newHash, bookId]
  })
}

async function updateBookBlobUrl(contentHash, blobUrl) {
  const db = getClient()
  await db.execute({
    sql: 'UPDATE books SET pdf_blob_url = ? WHERE content_hash = ?',
    args: [blobUrl, contentHash]
  })
}

async function getBookDocuments(bookId) {
  if (!bookId) return []
  const db = getClient()
  const result = await db.execute({ sql: 'SELECT data FROM documents WHERE book_id = ? ORDER BY processed_at ASC', args: [bookId] })
  return result.rows.map(r => JSON.parse(r.data))
}

async function getBookTopics(bookId) {
  if (!bookId) return []
  const db = getClient()
  // Get all topics from all documents belonging to this book
  const result = await db.execute({
    sql: `SELECT t.data FROM topics t
          JOIN documents d ON t.document_id = d.id
          WHERE d.book_id = ?`,
    args: [bookId]
  })
  return result.rows.map(r => JSON.parse(r.data))
}

// --- Action Router ---

async function handleAction(action, params) {
  switch (action) {
    case 'getAllDocuments': return getAllDocuments()
    case 'getDocument': return getDocument(params.id)
    case 'saveDocument': return saveDocument(params.doc)
    case 'findByContentHash': return findByContentHash(params.hash)
    case 'deleteDocument': return deleteDocument(params.id)
    case 'softDeleteDocument': return softDeleteDocument(params.id)
    case 'restoreDocument': return restoreDocument(params.id)
    case 'hardDeleteDocument': return hardDeleteDocument(params.id)
    case 'getTrashedDocuments': return getTrashedDocuments()
    case 'cleanupTrash': return cleanupTrash(params.maxAgeMs || 7 * 24 * 60 * 60 * 1000)
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
    case 'getBookByHash': return getBookByHash(params.hash)
    case 'getBook': return getBook(params.id)
    case 'saveBook': return saveBook(params.book)
    case 'updateBookStructure': return updateBookStructure(params.bookId, params.structure)
    case 'updateBookContentHash': return updateBookContentHash(params.bookId, params.newHash)
    case 'getBookDocuments': return getBookDocuments(params.bookId)
    case 'getBookTopics': return getBookTopics(params.bookId)
    case 'updateBookBlobUrl': return updateBookBlobUrl(params.contentHash, params.blobUrl)
    default: throw new Error(`Unknown action: ${action}`)
  }
}

module.exports = { initDB, handleAction }
