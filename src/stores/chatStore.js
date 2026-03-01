import { create } from 'zustand'
import { db } from '../lib/db'

export const useChatStore = create((set, get) => ({
  // { [topicId]: { messages: [{role, content, timestamp}], loading: bool, streamingContent: string|null } }
  chats: {},

  // Load chat history from IDB for a specific topic
  loadChat: async (documentId, topicId) => {
    const messages = await db.getChatHistory(documentId, topicId)
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: { messages, loading: false, streamingContent: null }
      }
    }))
  },

  // Add a user message (optimistic — before API call)
  addUserMessage: (topicId, content) => {
    const msg = { role: 'user', content, timestamp: Date.now() }
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: {
          messages: [...(state.chats[topicId]?.messages || []), msg],
          loading: true,
          streamingContent: null
        }
      }
    }))
  },

  // Add completed assistant message and persist to IDB
  addAssistantMessage: async (documentId, topicId, content) => {
    const msg = { role: 'assistant', content, timestamp: Date.now() }
    const current = get().chats[topicId]?.messages || []
    const updated = [...current, msg]

    await db.saveChatHistory(documentId, topicId, updated)
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: { messages: updated, loading: false, streamingContent: null }
      }
    }))
  },

  // Update streaming content (partial assistant response)
  setStreamingContent: (topicId, content) => {
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: {
          ...state.chats[topicId],
          streamingContent: content
        }
      }
    }))
  },

  // Clear streaming state
  clearStreaming: (topicId) => {
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: {
          ...state.chats[topicId],
          streamingContent: null,
          loading: false
        }
      }
    }))
  },

  // Set loading state
  setLoading: (topicId, loading) => {
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: { ...(state.chats[topicId] || { messages: [], streamingContent: null }), loading }
      }
    }))
  },

  // Clear chat for a topic (UI + IDB)
  clearChat: async (documentId, topicId) => {
    await db.deleteChatHistory(documentId, topicId)
    set(state => ({
      chats: {
        ...state.chats,
        [topicId]: { messages: [], loading: false, streamingContent: null }
      }
    }))
  },

  // Reset all chats (on library exit)
  clear: () => set({ chats: {} }),
}))
