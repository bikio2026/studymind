import { useState, useEffect, useRef } from 'react'
import { Send, Square, Trash2, User, Bot } from 'lucide-react'
import { useChat } from '../hooks/useChat'

function ChatBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-accent" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-accent/15 text-text border border-accent/20'
          : 'bg-surface-alt text-text-dim border border-surface-light/50'
      }`}>
        <p className="whitespace-pre-line">
          {message.content}
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-accent/60 ml-0.5 animate-pulse-soft align-middle" />
          )}
        </p>
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-full bg-surface-light flex items-center justify-center shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-text-muted" />
        </div>
      )}
    </div>
  )
}

export default function ChatSection({ topic, documentId, provider }) {
  const {
    messages,
    loading,
    streamingContent,
    sendMessage,
    cancel,
    reset,
  } = useChat(documentId, topic.id, topic, provider)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Auto-scroll to bottom on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    sendMessage(input)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Messages area */}
      <div className="max-h-[400px] overflow-y-auto space-y-3 mb-3 pr-1 scrollbar-thin">
        {messages.length === 0 && !loading && (
          <p className="text-xs text-text-muted text-center py-6">
            Preguntale lo que quieras sobre este tema. Te voy a guiar para que llegues a la respuesta.
          </p>
        )}

        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}

        {streamingContent && (
          <ChatBubble
            message={{ role: 'assistant', content: streamingContent }}
            isStreaming
          />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribí tu pregunta..."
          disabled={loading}
          className="flex-1 bg-surface/80 border border-surface-light rounded-lg px-3 py-2 text-sm text-text
            placeholder:text-text-muted/50 focus:outline-none focus:border-accent/50
            disabled:opacity-50 transition-colors"
        />
        {loading ? (
          <button
            type="button"
            onClick={cancel}
            className="p-2 rounded-lg bg-error/10 text-error hover:bg-error/20 border border-error/20 transition-colors"
            title="Cancelar"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20
              transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Enviar"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
        {messages.length > 0 && !loading && (
          <button
            type="button"
            onClick={reset}
            className="p-2 rounded-lg hover:bg-surface-light text-text-muted hover:text-text transition-colors"
            title="Limpiar chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </form>
    </div>
  )
}
