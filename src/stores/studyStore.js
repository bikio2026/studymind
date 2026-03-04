import { create } from 'zustand'
import { db } from '../lib/db'

export const useStudyStore = create((set, get) => ({
  structure: null,
  topics: [],
  phase: 'idle', // idle | loading | parsing | analyzing | generating | stopped | ready
  generatingTopic: null,
  progress: { current: 0, total: 0 },
  error: null,

  setPhase: (phase) => set({ phase }),
  setError: (error) => set({ error }),
  setGeneratingTopic: (name) => set({ generatingTopic: name }),
  setProgress: (progress) => set({ progress }),

  // Load persisted data for a document
  loadFromDB: async (documentId) => {
    try {
      const structure = await db.getStructure(documentId)
      const topics = await db.getTopics(documentId)

      if (structure) {
        const cleanTopics = topics.map(({ id: idbId, documentId: _docId, ...rest }) => {
          const sectionId = rest.sectionId || idbId.replace(`${documentId}_`, '')
          return { ...rest, id: sectionId, sectionId }
        })
        set({ structure, topics: cleanTopics, phase: 'ready', error: null })
        return true
      }

      set({ structure: null, topics: [], phase: 'idle' })
      return false
    } catch (err) {
      console.error('[StudyMind] loadFromDB error:', err.message)
      set({ structure: null, topics: [], phase: 'idle', error: err.message })
      return false
    }
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

  // Save a translation for a topic (cached for on-demand translation)
  saveTopicTranslation: async (documentId, topicId, language, translatedData) => {
    set(state => {
      const updated = state.topics.map(t => {
        if (t.id !== topicId) return t
        const translations = { ...(t.translations || {}), [language]: translatedData }
        return { ...t, translations }
      })
      return { topics: updated }
    })

    // Persist to DB — read current topic, add translation, save back
    const currentTopic = get().topics.find(t => t.id === topicId)
    if (currentTopic) {
      await db.saveTopic(documentId, currentTopic)
    }
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
