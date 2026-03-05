import { create } from 'zustand'
import { db } from '../lib/db'

const TRASH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export const useDocumentStore = create((set, get) => ({
  documents: [],
  trashedDocuments: [],
  loading: true,
  activeDocumentId: null,

  // Load library from IDB
  loadDocuments: async () => {
    set({ loading: true })
    // Auto-cleanup expired trash (>7 days)
    try { await db.cleanupTrash(TRASH_MAX_AGE_MS) } catch { /* ignore */ }
    const docs = await db.getAllDocuments()
    const trashed = await db.getTrashedDocuments()
    // Sort by processedAt descending (newest first)
    docs.sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0))
    set({ documents: docs, trashedDocuments: trashed, loading: false })
  },

  // Save new document to IDB and store
  saveDocument: async (doc) => {
    await db.saveDocument(doc)
    set(state => ({
      documents: [doc, ...state.documents.filter(d => d.id !== doc.id)],
    }))
  },

  // Update document status
  updateDocumentStatus: async (id, status) => {
    const doc = await db.getDocument(id)
    if (doc) {
      doc.status = status
      await db.saveDocument(doc)
      set(state => ({
        documents: state.documents.map(d => d.id === id ? { ...d, status } : d),
      }))
    }
  },

  // Soft delete — move to trash
  deleteDocument: async (id) => {
    const doc = get().documents.find(d => d.id === id)
    await db.softDeleteDocument(id)
    set(state => ({
      documents: state.documents.filter(d => d.id !== id),
      trashedDocuments: doc
        ? [{ ...doc, deletedAt: Date.now() }, ...state.trashedDocuments]
        : state.trashedDocuments,
      activeDocumentId: state.activeDocumentId === id ? null : state.activeDocumentId,
    }))
  },

  // Restore from trash
  restoreDocument: async (id) => {
    await db.restoreDocument(id)
    set(state => {
      const doc = state.trashedDocuments.find(d => d.id === id)
      const { deletedAt, ...cleanDoc } = doc || {}
      return {
        trashedDocuments: state.trashedDocuments.filter(d => d.id !== id),
        documents: doc
          ? [cleanDoc, ...state.documents].sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0))
          : state.documents,
      }
    })
  },

  // Permanently delete from trash
  permanentlyDeleteDocument: async (id) => {
    await db.hardDeleteDocument(id)
    set(state => ({
      trashedDocuments: state.trashedDocuments.filter(d => d.id !== id),
    }))
  },

  // Empty entire trash
  emptyTrash: async () => {
    const { trashedDocuments } = get()
    for (const doc of trashedDocuments) {
      await db.hardDeleteDocument(doc.id)
    }
    set({ trashedDocuments: [] })
  },

  // Rename document
  renameDocument: async (id, displayName) => {
    const doc = await db.getDocument(id)
    if (doc) {
      doc.displayName = displayName || null
      await db.saveDocument(doc)
      set(state => ({
        documents: state.documents.map(d => d.id === id ? { ...d, displayName: displayName || null } : d),
      }))
    }
  },

  // Set active document (opens study view)
  setActiveDocument: (id) => set({ activeDocumentId: id }),

  // Back to library
  clearActiveDocument: () => set({ activeDocumentId: null }),
}))
