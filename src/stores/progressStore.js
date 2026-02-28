import { create } from 'zustand'
import { db } from '../lib/db'

export const useProgressStore = create((set, get) => ({
  progress: {}, // { [topicId]: { studied, quizScores, resets } }
  loaded: false,

  // Load progress for a document from IDB
  loadProgress: async (documentId) => {
    const records = await db.getProgress(documentId)
    const progress = {}
    for (const rec of records) {
      progress[rec.topicId] = {
        studied: rec.studied || false,
        quizScores: rec.quizScores || [],
        resets: rec.resets || [],
      }
    }
    set({ progress, loaded: true })
  },

  // Mark a topic as studied
  markStudied: async (documentId, topicId) => {
    const current = get().progress[topicId] || { studied: false, quizScores: [], resets: [] }
    const updated = { ...current, studied: true }

    await db.saveProgress(documentId, topicId, updated)
    set(state => ({
      progress: { ...state.progress, [topicId]: updated },
    }))
  },

  // Save a quiz score
  saveQuizScore: async (documentId, topicId, score) => {
    const current = get().progress[topicId] || { studied: false, quizScores: [], resets: [] }
    const updated = {
      ...current,
      quizScores: [...current.quizScores, { score, date: Date.now() }],
    }

    await db.saveProgress(documentId, topicId, updated)
    set(state => ({
      progress: { ...state.progress, [topicId]: updated },
    }))
  },

  // Reset progress for a topic (keeps history)
  resetTopic: async (documentId, topicId) => {
    const current = get().progress[topicId] || { studied: false, quizScores: [], resets: [] }
    const updated = {
      studied: false,
      quizScores: [],
      resets: [...current.resets, {
        date: Date.now(),
        previousScores: current.quizScores,
      }],
    }

    await db.saveProgress(documentId, topicId, updated)
    set(state => ({
      progress: { ...state.progress, [topicId]: updated },
    }))
  },

  // Reset all progress for a document
  resetAll: async (documentId, topicIds) => {
    const progress = {}
    for (const topicId of topicIds) {
      const current = get().progress[topicId] || { studied: false, quizScores: [], resets: [] }
      const updated = {
        studied: false,
        quizScores: [],
        resets: [...current.resets, {
          date: Date.now(),
          previousScores: current.quizScores,
        }],
      }
      await db.saveProgress(documentId, topicId, updated)
      progress[topicId] = updated
    }
    set({ progress })
  },

  // Clear store
  clear: () => set({ progress: {}, loaded: false }),
}))
