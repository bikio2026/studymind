import { create } from 'zustand'
import { db } from '../lib/db'

const DEFAULTS = {
  preReadingQuestions: true,
  bloomBadges: true,
  learningPath: false,
  helpButton: true,
  defaultQuizMode: 'hybrid',   // 'self' | 'freetext' | 'hybrid'
  defaultDepth: 'completo',    // 'resumen' | 'intermedio' | 'completo'
}

function loadFeatures(documentId) {
  try {
    const raw = localStorage.getItem(`studymind-features-${documentId}`)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS }
  } catch { return { ...DEFAULTS } }
}

function saveFeatures(documentId, features) {
  localStorage.setItem(`studymind-features-${documentId}`, JSON.stringify(features))
}

export const useFeatureStore = create((set, get) => ({
  features: { ...DEFAULTS },
  tutorNotes: '',
  tutorObservations: [],
  documentId: null,

  // Load features + tutor notes/observations for a document
  load: async (documentId) => {
    const features = loadFeatures(documentId)
    let tutorNotes = ''
    let tutorObservations = []
    try {
      const raw = await db.getTutorNotes(documentId)
      if (raw) {
        // Try to parse as JSON (new format: observations array)
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed)) {
            tutorObservations = parsed
          } else {
            tutorNotes = raw // legacy plain text
          }
        } catch {
          tutorNotes = raw // legacy plain text
        }
      }
    } catch { /* no tutor notes yet */ }
    set({ features, tutorNotes, tutorObservations, documentId })
  },

  // Toggle a boolean feature
  toggle: (key) => {
    const { features, documentId } = get()
    if (!(key in features)) return
    const updated = { ...features, [key]: !features[key] }
    set({ features: updated })
    if (documentId) saveFeatures(documentId, updated)
  },

  // Set a feature value (for selects)
  setFeature: (key, value) => {
    const { features, documentId } = get()
    const updated = { ...features, [key]: value }
    set({ features: updated })
    if (documentId) saveFeatures(documentId, updated)
  },

  // Save tutor notes (legacy)
  saveTutorNotes: async (notes) => {
    const { documentId } = get()
    set({ tutorNotes: notes })
    if (documentId) {
      try { await db.saveTutorNotes(documentId, notes) } catch (e) { console.error('[FeatureStore] Save tutor notes error:', e) }
    }
  },

  // Save tutor observations (new interactive format)
  saveObservations: async (observations) => {
    const { documentId } = get()
    set({ tutorObservations: observations })
    if (documentId) {
      try {
        await db.saveTutorNotes(documentId, JSON.stringify(observations))
      } catch (e) {
        console.error('[FeatureStore] Save observations error:', e)
      }
    }
  },

  // Get feature value
  isEnabled: (key) => get().features[key] ?? DEFAULTS[key] ?? true,
}))
