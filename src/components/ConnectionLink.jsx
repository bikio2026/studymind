import { ArrowUpRight } from 'lucide-react'

export default function ConnectionLink({ connection, onNavigate }) {
  const { text, targetTopicId, targetTitle } = connection

  if (!targetTopicId || !onNavigate) {
    // No match found — render as plain text
    return (
      <li className="text-text-dim text-sm flex items-start gap-2">
        <span className="text-accent mt-0.5 shrink-0">&bull;</span>
        <span>{text}</span>
      </li>
    )
  }

  return (
    <li className="text-text-dim text-sm flex items-start gap-2">
      <span className="text-accent mt-0.5 shrink-0">&bull;</span>
      <span>
        {text}
        <button
          onClick={() => onNavigate(targetTopicId)}
          className="inline-flex items-center gap-0.5 ml-1.5 text-accent hover:text-accent/80
            hover:underline underline-offset-2 transition-colors text-xs font-medium"
          title={`Ir a: ${targetTitle}`}
        >
          <ArrowUpRight className="w-3 h-3" />
          <span>Ir al tema</span>
        </button>
      </span>
    </li>
  )
}
