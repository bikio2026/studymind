import { useState, useRef } from 'react'
import { useDocumentStore } from '../stores/documentStore'
import { getModelName } from '../lib/models'
import { useTranslation } from '../lib/useTranslation'
import {
  FileText, Upload, Trash2, Clock, BookOpen,
  ChevronRight, AlertCircle, Loader2, Files, Cpu, Pencil,
  RotateCcw, Trash, AlertTriangle
} from 'lucide-react'

function formatDate(ts, t, locale = 'es-AR') {
  if (!ts) return '—'
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d

  if (diff < 60_000) return t('time.justNow')
  if (diff < 3_600_000) return t('time.minutesAgo', { n: Math.floor(diff / 60_000) })
  if (diff < 86_400_000) return t('time.hoursAgo', { n: Math.floor(diff / 3_600_000) })

  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocumentCard({ doc, onOpen, onDelete, onRename }) {
  const { t, language } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const inputRef = useRef(null)
  const isReady = doc.status === 'ready'
  const isIncomplete = doc.status === 'incomplete'

  const displayName = doc.displayName || doc.fileName

  const startEditing = (e) => {
    e.stopPropagation()
    setEditName(displayName)
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const saveEdit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== doc.fileName) {
      onRename(doc.id, trimmed)
    } else if (!trimmed || trimmed === doc.fileName) {
      onRename(doc.id, null) // reset to filename
    }
    setEditing(false)
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  return (
    <div
      className="group relative rounded-xl border border-surface-light/40 bg-surface-alt/60 hover:bg-surface-alt hover:border-accent/30 transition-all duration-200 cursor-pointer"
      onClick={() => !editing && onOpen(doc.id)}
      style={{ animationDelay: `${Math.random() * 0.1}s` }}
    >
      <div className="p-5">
        {/* Top row: icon + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-accent" />
          </div>

          <div className="flex items-center gap-2">
            {doc.bookId && (
              <span className="text-[10px] font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <BookOpen className="w-2.5 h-2.5" />
                {t('library.book')}
              </span>
            )}
            {isReady ? (
              <span className="text-[10px] font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">
                {t('library.ready')}
              </span>
            ) : isIncomplete ? (
              <span className="text-[10px] font-medium text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-2.5 h-2.5" />
                {t('library.incomplete')}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-warning bg-warning/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin-slow" />
                {t('library.processing')}
              </span>
            )}
          </div>
        </div>

        {/* File name / editable */}
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') cancelEdit()
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-sm font-semibold text-text bg-surface border border-accent/40 rounded-lg px-2 py-1 mb-1 outline-none focus:border-accent"
            maxLength={100}
          />
        ) : (
          <h3 className="text-sm font-semibold text-text line-clamp-2 mb-1 group-hover:text-accent transition-colors" title={displayName}>
            {displayName}
          </h3>
        )}

        {/* Model badge */}
        {doc.model && (
          <div className="flex items-center gap-1.5 text-[10px] text-accent/80 mb-1.5">
            <Cpu className="w-3 h-3" />
            <span>{getModelName(doc.model)}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-text-muted">
          {doc.totalPages && (
            <span className="flex items-center gap-1">
              <Files className="w-3 h-3" />
              {doc.pageRange
                ? `p. ${doc.pageRange.start}–${doc.pageRange.end} / ${doc.pageRange.originalTotal}`
                : `${doc.totalPages} ${t('common.pages')}`}
            </span>
          )}
          <span>{formatSize(doc.fileSize)}</span>
          <span className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3" />
            {formatDate(doc.processedAt, t, language === 'en' ? 'en-US' : 'es-AR')}
          </span>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-surface-light/30 px-5 py-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-2">
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
            {confirmDelete ? t('common.confirm') : t('common.delete')}
          </button>

          <button
            onClick={startEditing}
            className="text-[11px] flex items-center gap-1 px-2 py-1 rounded text-text-muted hover:text-accent transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {t('common.rename')}
          </button>
        </div>

        <span className="text-[11px] text-accent flex items-center gap-1">
          {t('common.open')} <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  )
}

function TrashedCard({ doc, onRestore, onPermanentDelete }) {
  const { t, language } = useTranslation()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const displayName = doc.displayName || doc.fileName
  const locale = language === 'en' ? 'en-US' : 'es-AR'

  const daysLeft = Math.max(0, Math.ceil((doc.deletedAt + 7 * 24 * 60 * 60 * 1000 - Date.now()) / (24 * 60 * 60 * 1000)))
  const deletedDate = new Date(doc.deletedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
  const processedDate = doc.processedAt
    ? new Date(doc.processedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
    : null

  // Pages info
  const pagesLabel = doc.pageRange
    ? `p. ${doc.pageRange.start}–${doc.pageRange.end} / ${doc.pageRange.originalTotal}`
    : doc.totalPages
      ? `${doc.totalPages} ${t('common.pages')}`
      : null

  return (
    <div className="rounded-xl border border-surface-light/30 bg-surface-alt/40 opacity-70 hover:opacity-100 transition-all duration-200">
      <div className="p-4">
        {/* Title + status */}
        <div className="flex items-start gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <Trash2 className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-text-dim truncate" title={displayName}>
              {displayName}
            </h3>
            {doc.bookId && (
              <span className="text-[9px] font-medium text-accent/70 bg-accent/5 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5 mt-0.5">
                <BookOpen className="w-2.5 h-2.5" />
                {t('library.book')}
              </span>
            )}
          </div>
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-text-muted ml-11">
          {pagesLabel && (
            <span className="flex items-center gap-1">
              <Files className="w-3 h-3 shrink-0" />
              {pagesLabel}
            </span>
          )}
          {doc.topicCount > 0 && (
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 shrink-0" />
              {doc.topicCount} {doc.topicCount === 1
                ? (language === 'en' ? 'section' : 'sección')
                : (language === 'en' ? 'sections' : 'secciones')}
            </span>
          )}
          {processedDate && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 shrink-0" />
              {processedDate}
            </span>
          )}
          {doc.fileSize && (
            <span>{formatSize(doc.fileSize)}</span>
          )}
          {doc.model && (
            <span className="flex items-center gap-1">
              <Cpu className="w-3 h-3 shrink-0" />
              {getModelName(doc.model)}
            </span>
          )}
          {doc.status && (
            <span className={doc.status === 'ready' ? 'text-green-400/70' : 'text-amber-400/70'}>
              {doc.status === 'ready' ? t('library.ready') : t('library.incomplete')}
            </span>
          )}
        </div>

        {/* Expiry info */}
        <div className="flex items-center gap-2 mt-2.5 ml-11 text-[10px]">
          <span className="text-text-muted">{t('library.deletedAt', { date: deletedDate })}</span>
          <span className="text-text-muted">·</span>
          <span className={daysLeft <= 1 ? 'text-red-400 font-medium' : 'text-text-muted'}>
            {daysLeft <= 0 ? t('library.expiresToday') : t('library.expiresIn', { n: daysLeft })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="border-t border-surface-light/20 px-4 py-2 flex items-center gap-2">
        <button
          onClick={() => onRestore(doc.id)}
          className="text-[11px] flex items-center gap-1 px-2 py-1 rounded text-green-400 hover:text-green-300 hover:bg-green-500/10 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          {t('library.restore')}
        </button>
        <button
          onClick={() => {
            if (confirmDelete) {
              onPermanentDelete(doc.id)
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
          {confirmDelete ? t('common.confirm') : t('library.permanentDelete')}
        </button>
      </div>
    </div>
  )
}

export default function Library({ onNewDocument }) {
  const { t } = useTranslation()
  const documents = useDocumentStore(s => s.documents)
  const trashedDocuments = useDocumentStore(s => s.trashedDocuments)
  const loading = useDocumentStore(s => s.loading)
  const setActiveDocument = useDocumentStore(s => s.setActiveDocument)
  const deleteDocument = useDocumentStore(s => s.deleteDocument)
  const restoreDocument = useDocumentStore(s => s.restoreDocument)
  const permanentlyDeleteDocument = useDocumentStore(s => s.permanentlyDeleteDocument)
  const emptyTrash = useDocumentStore(s => s.emptyTrash)
  const renameDocument = useDocumentStore(s => s.renameDocument)

  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [showTrash, setShowTrash] = useState(false)
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setUploadError(t('upload.pdfOnly'))
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setUploadError(t('upload.tooLarge'))
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
          onClick={() => fileInputRef.current?.click()}
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
          <h2 className="text-2xl font-bold mb-2">{t('upload.title')}</h2>
          <p className="text-text-dim text-sm mb-1">
            {t('upload.instructions')}
          </p>
          <p className="text-text-muted text-xs">
            {t('upload.subtext')}
          </p>
          <input
            ref={fileInputRef}
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
          <h3 className="text-sm font-semibold text-text-dim mb-3">{t('upload.howItWorks')}</h3>
          <div className="grid grid-cols-3 gap-6 text-xs text-text-muted">
            <div>
              <div className="text-2xl mb-1">1</div>
              <p>{t('upload.step1')}</p>
            </div>
            <div>
              <div className="text-2xl mb-1">2</div>
              <p>{t('upload.step2')}</p>
            </div>
            <div>
              <div className="text-2xl mb-1">3</div>
              <p>{t('upload.step3')}</p>
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
            {t('library.title')}
            <span className="text-text-muted font-normal ml-2">
              {documents.length} {documents.length === 1 ? t('library.document') : t('library.documents')}
            </span>
          </h2>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-xs text-accent hover:text-accent/80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 hover:bg-accent-glow transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          {t('library.newPdf')}
        </button>
        <input
          ref={fileInputRef}
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
          onClick={() => fileInputRef.current?.click()}
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
          <span className="text-xs text-text-muted">{t('library.uploadPdf')}</span>
        </div>

        {/* Document cards */}
        {documents.map(doc => (
          <DocumentCard
            key={doc.id}
            doc={doc}
            onOpen={setActiveDocument}
            onDelete={deleteDocument}
            onRename={renameDocument}
          />
        ))}
      </div>

      {/* Trash section */}
      {trashedDocuments.length > 0 && (
        <div className="mt-8 pt-6 border-t border-surface-light/20">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text-dim transition-colors"
            >
              <Trash className="w-4 h-4" />
              <span className="font-medium">{t('library.trash')}</span>
              <span className="text-[10px] bg-surface-light/60 text-text-muted px-1.5 py-0.5 rounded-full">
                {trashedDocuments.length}
              </span>
              <ChevronRight className={`w-3 h-3 transition-transform ${showTrash ? 'rotate-90' : ''}`} />
            </button>

            {showTrash && (
              <button
                onClick={() => {
                  if (confirmEmptyTrash) {
                    emptyTrash()
                    setConfirmEmptyTrash(false)
                    setShowTrash(false)
                  } else {
                    setConfirmEmptyTrash(true)
                    setTimeout(() => setConfirmEmptyTrash(false), 4000)
                  }
                }}
                className={`text-[11px] flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                  confirmEmptyTrash
                    ? 'text-error bg-error/10 hover:bg-error/20'
                    : 'text-text-muted hover:text-error'
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                {confirmEmptyTrash
                  ? t('library.emptyTrashConfirm', { n: trashedDocuments.length })
                  : t('library.emptyTrash')}
              </button>
            )}
          </div>

          {showTrash && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 animate-fadeIn">
              {trashedDocuments.map(doc => (
                <TrashedCard
                  key={doc.id}
                  doc={doc}
                  onRestore={restoreDocument}
                  onPermanentDelete={permanentlyDeleteDocument}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
