import { Filter } from 'lucide-react'

const FILTERS = [
  { id: 'all', label: 'Todos', color: 'text-text' },
  { id: 'core', label: 'Centrales', color: 'text-core' },
  { id: 'supporting', label: 'Soporte', color: 'text-support' },
  { id: 'detail', label: 'Detalles', color: 'text-detail' },
]

export default function RelevanceFilter({ active, onChange }) {
  return (
    <div className="flex items-center gap-1">
      <Filter className="w-3.5 h-3.5 text-text-muted mr-1" />
      {FILTERS.map(f => (
        <button
          key={f.id}
          onClick={() => onChange(f.id)}
          className={`text-xs px-2.5 py-1 rounded-full transition-all ${
            active === f.id
              ? `${f.color} bg-surface-light font-medium`
              : 'text-text-muted hover:text-text-dim'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
