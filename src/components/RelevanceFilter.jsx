import { Filter } from 'lucide-react'
import { useTranslation } from '../lib/useTranslation'

const FILTERS = [
  { id: 'all', labelKey: 'filter.all', color: 'text-text' },
  { id: 'core', labelKey: 'filter.core', color: 'text-core' },
  { id: 'supporting', labelKey: 'filter.supporting', color: 'text-support' },
  { id: 'detail', labelKey: 'filter.detail', color: 'text-detail' },
]

export default function RelevanceFilter({ active, onChange }) {
  const { t } = useTranslation()
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
          {t(f.labelKey)}
        </button>
      ))}
    </div>
  )
}
