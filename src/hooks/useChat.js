import { useCallback, useEffect } from 'react'
import { useLLMStream } from './useLLMStream'
import { useChatStore } from '../stores/chatStore'

const MAX_HISTORY_MESSAGES = 20 // 10 pares user/assistant

// Default chat models (cheapest for quick responses)
const CHAT_MODELS = {
  claude: 'claude-haiku-4-5-20251001',
  groq: 'llama-3.1-8b-instant',
}

// Build context message with topic info for the LLM
function buildContextMessage(topic) {
  const parts = [
    `TEMA: "${topic.sectionTitle}"`,
    `RESUMEN: ${topic.summary}`,
  ]
  if (topic.keyConcepts?.length) {
    parts.push(`CONCEPTOS CLAVE: ${topic.keyConcepts.join(', ')}`)
  }
  if (topic.expandedExplanation) {
    // Trim to ~2000 chars to save tokens
    const explanation = topic.expandedExplanation.slice(0, 2000)
    parts.push(`EXPLICACIÓN DEL TEMA:\n${explanation}`)
  }
  return parts.join('\n\n')
}

// Trim history to fit context window
function trimHistory(messages) {
  if (messages.length <= MAX_HISTORY_MESSAGES) return messages
  // Keep first 2 messages (context + first response) + last N
  return [
    ...messages.slice(0, 2),
    ...messages.slice(-(MAX_HISTORY_MESSAGES - 2))
  ]
}

export function useChat(documentId, topicId, topic, provider = 'claude') {
  const { streamRequest, cancel: cancelStream } = useLLMStream()

  const chat = useChatStore(s => s.chats[topicId])
  const loadChat = useChatStore(s => s.loadChat)
  const addUserMessage = useChatStore(s => s.addUserMessage)
  const addAssistantMessage = useChatStore(s => s.addAssistantMessage)
  const setStreamingContent = useChatStore(s => s.setStreamingContent)
  const clearStreaming = useChatStore(s => s.clearStreaming)
  const setLoading = useChatStore(s => s.setLoading)
  const clearChat = useChatStore(s => s.clearChat)

  const messages = chat?.messages || []
  const loading = chat?.loading || false
  const streamingContent = chat?.streamingContent || null

  // Load chat history from IDB on mount
  useEffect(() => {
    loadChat(documentId, topicId)
  }, [documentId, topicId, loadChat])

  // Send a message
  const sendMessage = useCallback(async (userText) => {
    if (!userText.trim() || loading) return

    // Add user message to store (optimistic)
    addUserMessage(topicId, userText.trim())

    // Build messages array for API
    // We need to read from the store after the update
    // Small delay to ensure state is updated
    await new Promise(r => setTimeout(r, 0))

    const currentMessages = useChatStore.getState().chats[topicId]?.messages || []

    // Build the API messages array
    let apiMessages = []
    const contextMsg = buildContextMessage(topic)

    if (currentMessages.length === 1) {
      // First message: inject topic context with the question
      apiMessages = [
        { role: 'user', content: `${contextMsg}\n\n---\n\nPREGUNTA DEL ESTUDIANTE: ${userText.trim()}` }
      ]
    } else {
      // Subsequent messages: use trimmed history with context in first message
      const history = trimHistory(currentMessages)
      apiMessages = history.map((msg, i) => {
        if (i === 0 && msg.role === 'user') {
          // Prepend context to the first user message
          return { role: 'user', content: `${contextMsg}\n\n---\n\nPREGUNTA DEL ESTUDIANTE: ${msg.content}` }
        }
        return { role: msg.role, content: msg.content }
      })
    }

    try {
      const model = CHAT_MODELS[provider] || CHAT_MODELS.claude

      await streamRequest(null, {
        provider,
        model,
        promptVersion: 'chat',
        maxTokens: 1024,
        messages: apiMessages,
        onToken: (text) => {
          setStreamingContent(topicId, text)
        },
        onDone: async (text) => {
          await addAssistantMessage(documentId, topicId, text)
        },
        onError: (err) => {
          clearStreaming(topicId)
          console.error('[Chat] Error:', err)
        },
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('[Chat] Error:', err)
      }
      clearStreaming(topicId)
    }
  }, [topic, topicId, documentId, provider, loading, streamRequest, addUserMessage, addAssistantMessage, setStreamingContent, clearStreaming])

  // Cancel current streaming
  const cancel = useCallback(() => {
    cancelStream()
    clearStreaming(topicId)
  }, [cancelStream, topicId, clearStreaming])

  // Clear all chat history for this topic
  const reset = useCallback(async () => {
    await clearChat(documentId, topicId)
  }, [documentId, topicId, clearChat])

  return {
    messages,
    loading,
    streamingContent,
    sendMessage,
    cancel,
    reset,
  }
}
