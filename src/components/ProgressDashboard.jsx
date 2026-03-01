import { BarChart3, Trophy, Target, TrendingUp } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { getDocumentStats, MASTERY_LEVELS } from '../lib/proficiency'

function MasteryBar({ label, count, total, color, bg }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs w-24 truncate ${color}`}>{label}</span>
      <div className="flex-1 h-2 bg-surface-light/50 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-text-muted w-8 text-right">{count}</span>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sublabel }) {
  return (
    <div className="bg-surface/50 rounded-lg p-3 border border-surface-light/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5 text-accent" />
        <span className="text-[11px] text-text-muted">{label}</span>
      </div>
      <div className="text-lg font-bold text-text">
        {value}
        {sublabel && <span className="text-xs font-normal text-text-muted ml-1">{sublabel}</span>}
      </div>
    </div>
  )
}

export default function ProgressDashboard({ topics }) {
  const progress = useProgressStore(s => s.progress)
  const stats = getDocumentStats(topics, progress)

  if (topics.length === 0) return null

  const completionPct = stats.total > 0
    ? Math.round(((stats.byMastery.dominado + stats.byMastery.experto) / stats.total) * 100)
    : 0

  // Mastery entries ordered by level
  const masteryEntries = Object.entries(MASTERY_LEVELS)
    .sort((a, b) => a[1].order - b[1].order)
    .filter(([key]) => stats.byMastery[key] > 0 || key === 'sin-empezar')

  // Color mapping for bars
  const barColors = {
    'sin-empezar': { color: 'text-text-muted/60', bg: 'bg-text-muted/30' },
    visto: { color: 'text-blue-400', bg: 'bg-blue-400' },
    aprendiendo: { color: 'text-amber-400', bg: 'bg-amber-400' },
    dominado: { color: 'text-emerald-400', bg: 'bg-emerald-400' },
    experto: { color: 'text-accent', bg: 'bg-accent' },
  }

  return (
    <div className="mb-4 rounded-xl bg-surface-alt/50 border border-surface-light/30 p-4 animate-fadeIn">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-accent" />
        <h3 className="text-sm font-semibold text-text">Progreso del documento</h3>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <StatCard
          icon={Target}
          label="Dominio"
          value={`${completionPct}%`}
        />
        <StatCard
          icon={Trophy}
          label="Proficiencia"
          value={stats.avgProficiency > 0 ? `${stats.avgProficiency}%` : '—'}
        />
        <StatCard
          icon={TrendingUp}
          label="Quizzes"
          value={stats.quizzesTaken}
          sublabel="intentos"
        />
      </div>

      {/* Mastery breakdown */}
      <div className="space-y-2">
        <span className="text-[11px] text-text-muted font-medium">Nivel de dominio por tema</span>
        {masteryEntries.map(([key, level]) => (
          <MasteryBar
            key={key}
            label={level.label}
            count={stats.byMastery[key]}
            total={stats.total}
            color={barColors[key]?.color || 'text-text-muted'}
            bg={barColors[key]?.bg || 'bg-text-muted'}
          />
        ))}
      </div>

      {/* Stacked progress bar */}
      <div className="mt-3 h-3 bg-surface-light/30 rounded-full overflow-hidden flex">
        {['experto', 'dominado', 'aprendiendo', 'visto', 'sin-empezar'].map(key => {
          const pct = stats.total > 0 ? (stats.byMastery[key] / stats.total) * 100 : 0
          if (pct === 0) return null
          return (
            <div
              key={key}
              className={`h-full ${barColors[key]?.bg || 'bg-text-muted/20'} transition-all duration-500`}
              style={{ width: `${pct}%` }}
              title={`${MASTERY_LEVELS[key].label}: ${stats.byMastery[key]} temas`}
            />
          )
        })}
      </div>
    </div>
  )
}
