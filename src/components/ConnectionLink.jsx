import { ArrowUpRight, ExternalLink } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'

export default function ConnectionLink({ connection, onNavigate, onNavigateToDocument }) {
  const { t } = useTranslation()
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
            title={`${t('connection.goToTopic')}: ${targetTitle}`}
          >
            <ExternalLink className="w-3 h-3" />
            <span>{t('connection.otherImport')}</span>
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
            title={`${t('connection.goToTopic')}: ${targetTitle}`}
          >
            <ArrowUpRight className="w-3 h-3" />
            <span>{t('connection.goToTopic')}</span>
          </button>
        )}
      </span>
    </li>
  )
}
