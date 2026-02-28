import { useState, useRef } from 'react'
import { Upload, AlertCircle } from 'lucide-react'

export default function PDFUploader({ onFileSelect, disabled }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const handleFile = (file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setError('Solo se aceptan archivos PDF')
      return
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('El archivo es demasiado grande (máx 100 MB)')
      return
    }
    setError(null)
    onFileSelect(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setDragging(true)
  }

  const handleDragLeave = () => setDragging(false)

  const handleClick = () => inputRef.current?.click()

  const handleChange = (e) => handleFile(e.target.files[0])

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          w-full max-w-lg p-16 rounded-2xl border-2 border-dashed cursor-pointer
          transition-all duration-200 text-center
          ${dragging
            ? 'border-accent bg-accent-glow scale-[1.02]'
            : 'border-surface-light hover:border-accent/50 hover:bg-accent-glow/50'}
          ${disabled ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <Upload className="w-14 h-14 mx-auto mb-5 text-accent" />
        <h2 className="text-2xl font-bold mb-2">Subí tu PDF</h2>
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
          onChange={handleChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-error text-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
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
