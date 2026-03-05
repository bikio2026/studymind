// IndexedDB storage for PDF binary files
// Key: contentHash (same as books table), Value: ArrayBuffer of original PDF
// Persists across browser sessions, survives page reloads

const DB_NAME = 'studymind-pdfs'
const STORE_NAME = 'pdfs'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const pdfStorage = {
  /** Save PDF binary by contentHash */
  async save(contentHash, arrayBuffer) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(arrayBuffer, contentHash)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  },

  /** Get PDF binary by contentHash (returns ArrayBuffer or null) */
  async get(contentHash) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).get(contentHash)
      req.onsuccess = () => { db.close(); resolve(req.result || null) }
      req.onerror = () => { db.close(); reject(req.error) }
    })
  },

  /** Check if PDF exists in local storage */
  async has(contentHash) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const req = tx.objectStore(STORE_NAME).count(contentHash)
      req.onsuccess = () => { db.close(); resolve(req.result > 0) }
      req.onerror = () => { db.close(); reject(req.error) }
    })
  },

  /** Delete PDF by contentHash */
  async delete(contentHash) {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(contentHash)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); reject(tx.error) }
    })
  },

  /** Get approximate total usage in bytes */
  async getUsage() {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const cursor = store.openCursor()
      let totalBytes = 0
      cursor.onsuccess = () => {
        const c = cursor.result
        if (c) {
          if (c.value instanceof ArrayBuffer) totalBytes += c.value.byteLength
          c.continue()
        } else {
          db.close()
          resolve(totalBytes)
        }
      }
      cursor.onerror = () => { db.close(); reject(cursor.error) }
    })
  },
}
