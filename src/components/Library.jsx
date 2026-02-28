import { useState, useRef } from 'react'
import { useDocumentStore } from '../stores/documentStore'
import {
  FileText, Upload, Trash2, Clock, BookOpen,
  ChevronRight, AlertCircle, Loader2, Files
} from 'lucide-react'

function formatDate(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d

  if (diff < 60_000) return 'Hace un momento'
  if (diff < 3_600_000) return `Hace ${Math.floor(diff / 60_000)} min`
  if (diff < 86_400_000) return `Hace ${Math.floor(diff / 3_600_000)}h`

  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentCard({ doc, onOpen, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isReady = doc.status === 'ready'

  return (
    <div
      className="group relative rounded-xl border border-surface-light/40 bg-surface-alt/60 hover:bg-surface-alt hover:border-accent/30 transition-all duration-200 cursor-pointer"
      onClick={() => onOpen(doc.id)}
      style={{ animationDelay: `${Math.random() * 0.1}s` }}
    >
      <div className="p-5">
        {/* Top row: icon + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-accent" />
          </div>

          <div className="flex items-center gap-2">
            {isReady ? (
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                Listo
              </span>
            ) : (
              <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin-slow" />
                Procesando
              </span>
            )}
          </div>
        </div>

        {/* File name */}
        <h3 className="text-sm font-semibold text-text truncate mb-1 group-hover:text-accent transition-colors">
          {doc.fileName}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          {doc.totalPages && (
            <span className="flex items-center gap-1">
              <Files className="w-3 h-3" />
              {doc.totalPages} pág.
            </span>
          )}
          <span>{formatSize(doc.fileSize)}</span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {formatDate(doc.processedAt)}
          </span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-surface-light/30 px-5 py-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirmDelete) {
              onDelete(doc.id)
            } else {
              setConfirmDelete(true)
              setTimeout(() => setConfirmDelete(false), 3000)
            }
          }}
          className={`text-[11px] flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            confirmDelete
              ? 'text-error bg-error/10 hover:bg-error/20'
              : 'text-text-muted hover:text-error'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          {confirmDelete ? 'Confirmar' : 'Eliminar'}
        </button>

        <span className="text-[11px] text-accent flex items-center gap-1">
          Abrir <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}

export default function Library({ onNewDocument }) {
  const documents = useDocumentStore(s => s.documents)
  const loading = useDocumentStore(s => s.loading)
  const setActiveDocument = useDocumentStore(s => s.setActiveDocument)
  const deleteDocument = useDocumentStore(s => s.deleteDocument)

  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setUploadError('Solo se aceptan archivos PDF')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError('El archivo es demasiado grande (máx 100 MB)')
      return
    }
    setUploadError(null)
    onNewDocument(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const hasDocuments = documents.length > 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-accent animate-spin-slow" />
      </div>
    )
  }

  // Empty state — just show the upload area
  if (!hasDocuments) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          className={`
            w-full max-w-lg p-16 rounded-2xl border-2 border-dashed cursor-pointer
            transition-all duration-200 text-center
            ${dragging
              ? 'border-accent bg-accent-glow scale-[1.02]'
              : 'border-surface-light hover:border-accent/50 hover:bg-accent-glow/50'}
          `}
        >
          <Upload className="w-14 h-14 mx-auto mb-5 text-accent" />
          <h2 className="text-2xl font-bold mb-2">Subí tu primer PDF</h2>
          <p className="text-text-dim text-sm mb-1">
            Arrastrá el archivo acá o hacé click para seleccionarlo
          </p>
          <p className="text-text-muted text-xs">
            Libros de texto, apuntes, papers &mdash; cualquier PDF con texto
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            onChange={(e) => handleFile(e.target.files[0])}
            className="hidden"
          />
        </div>

        {uploadError && (
          <div className="mt-4 flex items-center gap-2 text-error text-sm animate-fadeIn">
            <AlertCircle className="w-4 h-4" />
            <span>{uploadError}</span>
          </div>
        )}

        <div className="mt-12 max-w-md text-center">
          <h3 className="text-sm font-semibold text-text-dim mb-3">Cómo funciona</h3>
          <div className="grid grid-cols-3 gap-6 text-xs text-text-muted">
            <div>
              <div className="text-2xl mb-1">1</div>
              <p>Subís un PDF y se extrae todo el texto</p>
            </div>
            <div>
              <div className="text-2xl mb-1">2</div>
              <p>La IA detecta la estructura y los temas</p>
            </div>
            <div>
              <div className="text-2xl mb-1">3</div>
              <p>Se genera una guía interactiva por tema</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Library with documents
  return (
    <div className="max-w-4xl mx-auto">
      {/* Section header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-dim">
            Tu biblioteca
            <span className="text-text-muted font-normal ml-2">
              {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
            </span>
          </h2>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          className="text-xs text-accent hover:text-accent/80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 hover:bg-accent-glow transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          Nuevo PDF
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={(e) => handleFile(e.target.files[0])}
          className="hidden"
        />
      </div>

      {uploadError && (
        <div className="mb-4 flex items-center gap-2 text-error text-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Document grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Upload card */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          className={`
            rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center
            min-h-[160px] transition-all duration-200
            ${dragging
              ? 'border-accent bg-accent-glow scale-[1.02]'
              : 'border-surface-light/50 hover:border-accent/40 hover:bg-accent-glow/30'}
          `}
        >
          <Upload className="w-8 h-8 text-text-muted mb-2" />
          <span className="text-xs text-text-muted">Subir PDF</span>
        </div>

        {/* Document cards */}
        {documents.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onOpen={setActiveDocument}
            onDelete={deleteDocument}
          />
        ))}
      </div>
    </div>
  )
}
