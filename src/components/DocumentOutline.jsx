import { useState, useMemo } from 'react'
import { BookOpen, ChevronRight, ChevronDown, HelpCircle } from 'lucide-react'
import { useProgressStore } from '../stores/progressStore'
import { getMasteryLevel, MASTERY_LEVELS, getDocumentStats } from '../lib/proficiency'

// Mini SVG ring to show mastery level
function MasteryRing({ mastery, size = 14 }) {
  const info = MASTERY_LEVELS[mastery]
  const r = (size - 2) / 2
  const circumference = 2 * Math.PI * r
  const fillPct = info.order / 4

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={2}
        className={info.ring}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        strokeWidth={2}
        className={info.fill}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fillPct)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  )
}

// Build tree from flat sections using parentId
function buildTree(sections) {
  const map = {}
  const roots = []

  // Create nodes
  for (const s of sections) {
    map[s.id] = { ...s, children: [] }
  }

  // Assign children
  for (const s of sections) {
    if (s.parentId && map[s.parentId]) {
      map[s.parentId].children.push(map[s.id])
    } else {
      roots.push(map[s.id])
    }
  }

  return roots
}

// Compute aggregate mastery for a container node
function getAggregatedMastery(node, topics, progress) {
  const allLeaves = []
  const collectLeaves = (n) => {
    if (n.children.length === 0) {
      allLeaves.push(n)
    } else {
      n.children.forEach(collectLeaves)
    }
  }
  collectLeaves(node)

  if (allLeaves.length === 0) return 'sin-empezar'

  const masteries = allLeaves.map(leaf => {
    const topic = topics.find(t => t.id === leaf.id)
    if (!topic) return 'sin-empezar'
    return getMasteryLevel(progress[leaf.id])
  })

  // Return the lowest mastery (weakest link)
  const order = ['sin-empezar', 'visto', 'aprendiendo', 'dominado', 'experto']
  let minIdx = 4
  for (const m of masteries) {
    const idx = order.indexOf(m)
    if (idx < minIdx) minIdx = idx
  }
  return order[minIdx]
}

// Recursive tree node
function TreeNode({ node, topics, progress, activeTopic, onSelectTopic, level = 0, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = node.children.length > 0
  const topic = topics.find(t => t.id === node.id)
  const isActive = activeTopic === node.id
  const isGenerated = !!topic
  const isContainer = hasChildren

  const mastery = isContainer
    ? getAggregatedMastery(node, topics, progress)
    : (isGenerated ? getMasteryLevel(progress[node.id]) : 'sin-empezar')

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded)
    }
    if (isGenerated) {
      onSelectTopic(node.id)
    }
  }

  // Indentation and styling per level
  const indent = level === 0 ? '' : level === 1 ? 'pl-5' : 'pl-9'
  const textSize = level === 0 ? 'text-sm' : level === 1 ? 'text-[13px]' : 'text-xs'
  const fontWeight = level === 0 ? 'font-semibold' : ''

  return (
    <div>
      {/* Level 0 separator */}
      {level === 0 && (
        <div className="border-t border-surface-light/30 first:border-t-0" />
      )}

      <button
        onClick={handleClick}
        className={`
          w-full text-left px-3 py-2 rounded-lg transition-all flex items-center gap-2
          ${indent} ${textSize} ${fontWeight}
          ${isActive
            ? 'bg-accent/15 text-accent'
            : isGenerated || isContainer
              ? 'hover:bg-surface-light/50 text-text-dim hover:text-text'
              : 'text-text-muted/40 cursor-default'}
        `}
      >
        {/* Expand/collapse chevron for containers */}
        {hasChildren ? (
          <span className={`transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
          </span>
        ) : (
          <span className="w-3.5" /> // spacer
        )}

        {/* Mastery ring */}
        {isGenerated || isContainer ? (
          <MasteryRing mastery={mastery} />
        ) : (
          <svg width={14} height={14} className="shrink-0">
            <circle cx={7} cy={7} r={6} fill="none" strokeWidth={2} className="stroke-text-muted/20" />
          </svg>
        )}

        {/* Title */}
        <span className="truncate flex-1">{node.title}</span>

        {/* Book page */}
        {node.bookPage && (
          <span className="text-[10px] text-text-muted/50 shrink-0 font-mono" title={`Página ${node.bookPage} del libro`}>
            p.{node.bookPage}
          </span>
        )}

        {/* Help icon for non-generated leaves */}
        {!isGenerated && !isContainer && (
          <span className="shrink-0 relative group/tip">
            <HelpCircle className="w-3 h-3 text-text-muted/40 cursor-help" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1
              text-[10px] leading-tight bg-surface border border-surface-light rounded-md shadow-lg
              whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity
              pointer-events-none z-30 text-text-muted">
              Sin texto suficiente para generar guía
            </span>
          </span>
        )}

        {/* Active indicator */}
        {isActive && <ChevronRight className="w-3 h-3 shrink-0 text-accent" />}
      </button>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="animate-fadeIn">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              topics={topics}
              progress={progress}
              activeTopic={activeTopic}
              onSelectTopic={onSelectTopic}
              level={level + 1}
              defaultExpanded={level === 0} // auto-expand first level
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function DocumentOutline({ structure, topics, activeTopic, onSelectTopic, documentId }) {
  if (!structure) return null

  const progress = useProgressStore(s => s.progress)
  const stats = getDocumentStats(topics, progress)

  // Build tree from flat sections
  const tree = useMemo(() => {
    const filteredSections = structure.sections.filter(s => s.level <= 3)
    return buildTree(filteredSections)
  }, [structure.sections])

  // Mastery stats
  const masteredCount = stats.byMastery.dominado + stats.byMastery.experto
  const masteryPct = stats.total > 0 ? Math.round((masteredCount / stats.total) * 100) : 0

  return (
    <div className="w-72 shrink-0 bg-surface-alt rounded-xl p-4 overflow-y-auto max-h-[calc(100vh-120px)]">
      {/* Document title */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-surface-light">
        <BookOpen className="w-4 h-4 text-accent shrink-0" />
        <h2 className="text-sm font-semibold truncate" title={structure.title}>
          {structure.title}
        </h2>
      </div>

      {/* Tree navigation */}
      <nav className="space-y-0.5">
        {tree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            topics={topics}
            progress={progress}
            activeTopic={activeTopic}
            onSelectTopic={onSelectTopic}
            level={0}
            defaultExpanded={true} // top level always expanded
          />
        ))}
      </nav>

      {/* Stats */}
      {topics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-light space-y-1.5 text-xs text-text-muted">
          <div className="flex justify-between">
            <span>Temas</span>
            <span className="text-text-dim">{topics.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Dominados</span>
            <span className="text-text-dim">{masteredCount} / {topics.length}</span>
          </div>
          {stats.avgProficiency > 0 && (
            <div className="flex justify-between">
              <span>Proficiencia</span>
              <span className="text-text-dim">{stats.avgProficiency}%</span>
            </div>
          )}
          {stats.quizzesTaken > 0 && (
            <div className="flex justify-between">
              <span>Quizzes</span>
              <span className="text-text-dim">{stats.quizzesTaken} intentos</span>
            </div>
          )}
          {/* Mastery stacked bar */}
          <div className="w-full h-2 bg-surface-light rounded-full overflow-hidden mt-2 flex">
            {['experto', 'dominado', 'aprendiendo', 'visto'].map(key => {
              const pct = stats.total > 0 ? (stats.byMastery[key] / stats.total) * 100 : 0
              if (pct === 0) return null
              const bgMap = {
                experto: 'bg-accent',
                dominado: 'bg-emerald-400',
                aprendiendo: 'bg-amber-400',
                visto: 'bg-blue-400',
              }
              return (
                <div
                  key={key}
                  className={`h-full ${bgMap[key]} transition-all duration-300`}
                  style={{ width: `${pct}%` }}
                  title={`${MASTERY_LEVELS[key].label}: ${stats.byMastery[key]}`}
                />
              )
            })}
          </div>
          <div className="text-[10px] text-text-muted/60 text-center mt-1">
            {masteryPct}% dominado
          </div>
        </div>
      )}
    </div>
  )
}
