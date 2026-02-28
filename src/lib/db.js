// IndexedDB wrapper for StudyMind persistence
const DB_NAME = 'studymind'
const DB_VERSION = 1

const STORES = {
  documents: 'documents',
  structures: 'structures',
  topics: 'topics',
  progress: 'progress',
}

let dbInstance = null

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance)

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      // documents: {id, fileName, fileSize, totalPages, fullText, processedAt, status}
      if (!db.objectStoreNames.contains(STORES.documents)) {
        const docStore = db.createObjectStore(STORES.documents, { keyPath: 'id' })
        docStore.createIndex('fileName', 'fileName', { unique: false })
      }

      // structures: {documentId, title, author, sections[]}
      if (!db.objectStoreNames.contains(STORES.structures)) {
        db.createObjectStore(STORES.structures, { keyPath: 'documentId' })
      }

      // topics: {id (documentId_sectionId), documentId, sectionId, ...guide data}
      if (!db.objectStoreNames.contains(STORES.topics)) {
        const topicStore = db.createObjectStore(STORES.topics, { keyPath: 'id' })
        topicStore.createIndex('documentId', 'documentId', { unique: false })
      }

      // progress: {id (documentId_topicId), documentId, topicId, studied, quizScores[], resets[]}
      if (!db.objectStoreNames.contains(STORES.progress)) {
        const progressStore = db.createObjectStore(STORES.progress, { keyPath: 'id' })
        progressStore.createIndex('documentId', 'documentId', { unique: false })
      }
    }

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onerror = () => reject(request.error)
  })
}

// Generic CRUD operations

async function getAll(storeName) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getByKey(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

async function getByIndex(storeName, indexName, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const request = index.getAll(value)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function put(storeName, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.put(data)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function deleteByKey(storeName, key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function deleteByIndex(storeName, indexName, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const index = store.index(indexName)
    const cursorReq = index.openCursor(value)
    cursorReq.onsuccess = (event) => {
      const cursor = event.target.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
      } else {
        resolve()
      }
    }
    cursorReq.onerror = () => reject(cursorReq.error)
  })
}

// Domain-specific API

export const db = {
  // Documents
  async getAllDocuments() {
    return getAll(STORES.documents)
  },

  async getDocument(id) {
    return getByKey(STORES.documents, id)
  },

  async saveDocument(doc) {
    return put(STORES.documents, doc)
  },

  async deleteDocument(id) {
    // Cascade: delete structure, topics, progress
    await deleteByKey(STORES.documents, id)
    await deleteByKey(STORES.structures, id)
    await deleteByIndex(STORES.topics, 'documentId', id)
    await deleteByIndex(STORES.progress, 'documentId', id)
  },

  // Structures
  async getStructure(documentId) {
    return getByKey(STORES.structures, documentId)
  },

  async saveStructure(documentId, structure) {
    return put(STORES.structures, { documentId, ...structure })
  },

  // Topics
  async getTopics(documentId) {
    return getByIndex(STORES.topics, 'documentId', documentId)
  },

  async saveTopic(documentId, topic) {
    const id = `${documentId}_${topic.id}`
    return put(STORES.topics, { ...topic, id, documentId })
  },

  async deleteTopics(documentId) {
    return deleteByIndex(STORES.topics, 'documentId', documentId)
  },

  // Progress
  async getProgress(documentId) {
    return getByIndex(STORES.progress, 'documentId', documentId)
  },

  async saveProgress(documentId, topicId, data) {
    const id = `${documentId}_${topicId}`
    return put(STORES.progress, { id, documentId, topicId, ...data })
  },
}
