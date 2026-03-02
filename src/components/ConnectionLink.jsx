import { ArrowUpRight, ExternalLink } from 'lucide-react'

export default function ConnectionLink({ connection, onNavigate, onNavigateToDocument }) {
  const { text, targetTopicId, targetTitle, crossImport, targetDocumentId } = connection

  if (!targetTopicId) {
    // No match found — render as plain text
    return (
      <li className="text-text-dim text-sm flex items-start gap-2">
        <span className="text-accent mt-0.5 shrink-0">&bull;</span>
        <span>{text}</span>
      </li>
    )
  }

  // Cross-import connection — links to a different document
  if (crossImport && targetDocumentId && onNavigateToDocument) {
    return (
      <li className="text-text-dim text-sm flex items-start gap-2">
        <span className="text-amber-500 mt-0.5 shrink-0">&bull;</span>
        <span>
          {text}
          <button
            onClick={() => onNavigateToDocument(targetDocumentId)}
            className="inline-flex items-center gap-0.5 ml-1.5 text-amber-500 hover:text-amber-400
              hover:underline underline-offset-2 transition-colors text-xs font-medium"
            title={`Ir a: ${targetTitle} (otro import)`}
          >
            <ExternalLink className="w-3 h-3" />
            <span>Otro import</span>
          </button>
        </span>
      </li>
    )
  }

  // Same-document connection
  return (
    <li className="text-text-dim text-sm flex items-start gap-2">
      <span className="text-accent mt-0.5 shrink-0">&bull;</span>
      <span>
        {text}
        {onNavigate && (
          <button
            onClick={() => onNavigate(targetTopicId)}
            className="inline-flex items-center gap-0.5 ml-1.5 text-accent hover:text-accent/80
              hover:underline underline-offset-2 transition-colors text-xs font-medium"
            title={`Ir a: ${targetTitle}`}
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>Ir al tema</span>
          </button>
        )}
      </span>
    </li>
  )
}
