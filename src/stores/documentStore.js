import { create } from 'zustand'
import { db } from '../lib/db'

export const useDocumentStore = create((set, get) => ({
  documents: [],
  loading: true,
  activeDocumentId: null,

  // Load library from IDB
  loadDocuments: async () => {
    set({ loading: true })
    const docs = await db.getAllDocuments()
    // Sort by processedAt descending (newest first)
    docs.sort((a, b) => (b.processedAt || 0) - (a.processedAt || 0))
    set({ documents: docs, loading: false })
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

  // Delete document + cascade
  deleteDocument: async (id) => {
    await db.deleteDocument(id)
    set(state => ({
      documents: state.documents.filter(d => d.id !== id),
      activeDocumentId: state.activeDocumentId === id ? null : state.activeDocumentId,
    }))
  },

  // Set active document (opens study view)
  setActiveDocument: (id) => set({ activeDocumentId: id }),

  // Back to library
  clearActiveDocument: () => set({ activeDocumentId: null }),
}))
