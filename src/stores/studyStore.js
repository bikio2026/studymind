import { create } from 'zustand'
import { db } from '../lib/db'

export const useStudyStore = create((set, get) => ({
  structure: null,
  topics: [],
  phase: 'idle', // idle | parsing | analyzing | generating | ready
  generatingTopic: null,
  progress: { current: 0, total: 0 },
  error: null,

  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),
  setGeneratingTopic: (name) => set({ generatingTopic: name }),
  setProgress: (progress) => set({ progress }),

  // Load persisted data for a document
  loadFromDB: async (documentId) => {
    const structure = await db.getStructure(documentId)
    const topics = await db.getTopics(documentId)

    if (structure && topics.length > 0) {
      // Restore topic IDs from IDB composite keys
      // IDB stores: { id: "docId_sectionId", documentId, sectionId?, ...data }
      // We need to recover the original sectionId as the topic's `id`
      const cleanTopics = topics.map(({ id: idbId, documentId: _docId, ...rest }) => {
        // Prefer explicit sectionId (new format), fallback to extracting from composite key
        const sectionId = rest.sectionId || idbId.replace(`${documentId}_`, '')
        return { ...rest, id: sectionId, sectionId }
      })
      set({ structure, topics: cleanTopics, phase: 'ready', error: null })
      return true // loaded from cache
    }

    set({ structure: null, topics: [], phase: 'idle' })
    return false // needs processing
  },

  // Save structure to IDB
  saveStructure: async (documentId, structure) => {
    await db.saveStructure(documentId, structure)
    set({ structure })
  },

  // Add a generated topic (called incrementally during generation)
  addTopic: async (documentId, topic) => {
    await db.saveTopic(documentId, topic)
    set(state => {
      const existing = state.topics.findIndex(t => t.id === topic.id)
      if (existing >= 0) {
        // Replace (regeneration)
        const updated = [...state.topics]
        updated[existing] = topic
        return { topics: updated }
      }
      return { topics: [...state.topics, topic] }
    })
  },

  // Regenerate a single topic (remove then re-add)
  removeTopic: (topicId) => {
    set(state => ({
      topics: state.topics.filter(t => t.id !== topicId),
    }))
  },

  // Reset all study data
  reset: () => set({
    structure: null,
    topics: [],
    phase: 'idle',
    generatingTopic: null,
    progress: { current: 0, total: 0 },
    error: null,
  }),
}))
