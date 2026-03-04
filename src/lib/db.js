// Database client — fetch wrapper over server-side SQLite
// Same interface as the old IndexedDB implementation so stores/hooks don't change

const API_BASE = import.meta.env.VITE_API_URL || ''

async function call(action, params = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch(`${API_BASE}/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    const json = await res.json()
    if (!json.ok) throw new Error(json.error || 'DB error')
    return json.data
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`DB timeout: ${action} tardó más de 10s`)
    }
    throw err
  }
}

export const db = {
  // Documents
  getAllDocuments: () => call('getAllDocuments'),
  getDocument: (id) => call('getDocument', { id }),
  saveDocument: (doc) => call('saveDocument', { doc }),
  findByContentHash: (hash) => call('findByContentHash', { hash }),
  deleteDocument: (id) => call('deleteDocument', { id }),

  // Structures
  getStructure: (documentId) => call('getStructure', { documentId }),
  saveStructure: (documentId, structure) => call('saveStructure', { documentId, structure }),

  // Topics
  getTopics: (documentId) => call('getTopics', { documentId }),
  saveTopic: (documentId, topic) => call('saveTopic', { documentId, topic }),
  deleteTopics: (documentId) => call('deleteTopics', { documentId }),

  // Progress
  getProgress: (documentId) => call('getProgress', { documentId }),
  saveProgress: (documentId, topicId, data) => call('saveProgress', { documentId, topicId, data }),

  // Page data
  savePageData: (documentId, data) => call('savePageData', { documentId, data }),
  getPageData: (documentId) => call('getPageData', { documentId }),

  // Chat history
  getChatHistory: (documentId, topicId) => call('getChatHistory', { documentId, topicId }),
  saveChatHistory: (documentId, topicId, messages) => call('saveChatHistory', { documentId, topicId, messages }),
  deleteChatHistory: (documentId, topicId) => call('deleteChatHistory', { documentId, topicId }),

  // Books
  getBookByHash: (hash) => call('getBookByHash', { hash }),
  getBook: (id) => call('getBook', { id }),
  saveBook: (book) => call('saveBook', { book }),
  updateBookStructure: (bookId, structure) => call('updateBookStructure', { bookId, structure }),
  getBookDocuments: (bookId) => call('getBookDocuments', { bookId }),
  getBookTopics: (bookId) => call('getBookTopics', { bookId }),
}
