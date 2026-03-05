import { useState, useMemo, useRef, useCallback } from 'react'
import { enrichConnections } from '../lib/connectionParser'
import { useTranslation } from '../lib/useTranslation'

const RELEVANCE_COLORS = {
  core: { fill: '#f59e0b', stroke: '#d97706', label: 'Core' },
  supporting: { fill: '#3b82f6', stroke: '#2563eb', label: 'Supporting' },
  detail: { fill: '#6b7280', stroke: '#4b5563', label: 'Detail' },
}

function truncate(str, max = 18) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export default function ConnectionGraph({ topics, sections, activeTopic, onSelectTopic, allBookTopics, fullscreen }) {
  const { t } = useTranslation()
  const [hovered, setHovered] = useState(null)
  const svgRef = useRef(null)

  // Build edges from all topics' connections
  const { nodes, edges } = useMemo(() => {
    if (!topics?.length || !sections?.length) return { nodes: [], edges: [] }

    // Sort: core first, then supporting, then detail (within each, by section order)
    const order = { core: 0, supporting: 1, detail: 2 }
    const sectionIndex = {}
    sections.forEach((s, i) => { sectionIndex[s.id] = i })

    const sorted = [...topics].sort((a, b) => {
      const relDiff = (order[a.relevance] ?? 1) - (order[b.relevance] ?? 1)
      if (relDiff !== 0) return relDiff
      return (sectionIndex[a.id] ?? 0) - (sectionIndex[b.id] ?? 0)
    })

    const topicIds = new Set(sorted.map(t => t.id))

    // Build nodes with circular positions
    const count = sorted.length
    const base = fullscreen ? 400 : 250
    const cx = base, cy = base
    const maxR = fullscreen ? 350 : 200
    const minR = fullscreen ? 150 : 100
    const radius = Math.min(maxR, Math.max(minR, count * (fullscreen ? 20 : 12)))

    const nodeList = sorted.map((topic, i) => {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2
      const section = sections.find(s => s.id === topic.id)
      return {
        id: topic.id,
        title: section?.title || topic.sectionTitle || `Topic ${i + 1}`,
        relevance: topic.relevance || 'supporting',
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
      }
    })

    const nodeMap = {}
    nodeList.forEach(n => { nodeMap[n.id] = n })

    // Build edges
    const edgeList = []
    const edgeSet = new Set()
    for (const topic of sorted) {
      const enriched = enrichConnections(topic.connections, sections, sorted, allBookTopics || [])
      for (const conn of enriched) {
        if (conn.targetTopicId && topicIds.has(conn.targetTopicId) && conn.targetTopicId !== topic.id) {
          // Deduplicate bidirectional edges
          const key = [topic.id, conn.targetTopicId].sort().join('::')
          if (!edgeSet.has(key)) {
            edgeSet.add(key)
            edgeList.push({ from: topic.id, to: conn.targetTopicId })
          }
        }
      }
    }

    return { nodes: nodeList, edges: edgeList }
  }, [topics, sections, allBookTopics])

  // Edges connected to hovered or active node
  const highlightedEdges = useMemo(() => {
    const target = hovered || activeTopic
    if (!target) return null
    const set = new Set()
    for (const e of edges) {
      if (e.from === target || e.to === target) {
        set.add(e.from)
        set.add(e.to)
      }
    }
    return set.size > 0 ? set : null
  }, [hovered, activeTopic, edges])

  const handleClick = useCallback((nodeId) => {
    if (onSelectTopic) onSelectTopic(nodeId)
  }, [onSelectTopic])

  if (!nodes.length) {
    return (
      <div className="text-center text-text-muted text-xs py-8">
        {t('graph.noConnections')}
      </div>
    )
  }

  // Dynamic viewBox based on node positions
  const padding = 60
  const minX = Math.min(...nodes.map(n => n.x)) - padding
  const minY = Math.min(...nodes.map(n => n.y)) - padding
  const maxX = Math.max(...nodes.map(n => n.x)) + padding
  const maxY = Math.max(...nodes.map(n => n.y)) + padding
  const vw = maxX - minX
  const vh = maxY - minY

  return (
    <div className="flex flex-col h-full">
      {/* Legend */}
      <div className="flex items-center gap-3 px-2 pb-2 shrink-0">
        {Object.entries(RELEVANCE_COLORS).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.fill }} />
            <span className="text-[9px] text-text-muted uppercase">{t(`relevance.${key}`)}</span>
          </div>
        ))}
        <span className="text-[9px] text-text-muted/50 ml-auto">{nodes.length} {t('graph.topics')}</span>
      </div>

      {/* SVG */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-lg bg-surface-alt/50">
        <svg
          ref={svgRef}
          viewBox={`${minX} ${minY} ${vw} ${vh}`}
          className="w-full h-full"
          style={{ minHeight: fullscreen ? 500 : 200 }}
        >
          {/* Edges */}
          {edges.map((edge, i) => {
            const from = nodes.find(n => n.id === edge.from)
            const to = nodes.find(n => n.id === edge.to)
            if (!from || !to) return null

            const isHighlighted = highlightedEdges
              ? highlightedEdges.has(edge.from) && highlightedEdges.has(edge.to)
              : true
            const opacity = highlightedEdges ? (isHighlighted ? 0.6 : 0.06) : 0.2

            // Curved path via center offset
            const mx = (from.x + to.x) / 2 + (from.y - to.y) * 0.15
            const my = (from.y + to.y) / 2 + (to.x - from.x) * 0.15

            return (
              <path
                key={i}
                d={`M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={isHighlighted ? 1.5 : 0.8}
                opacity={opacity}
                className="text-text-muted transition-opacity duration-200"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const colors = RELEVANCE_COLORS[node.relevance] || RELEVANCE_COLORS.supporting
            const isActive = node.id === activeTopic
            const isHovered = node.id === hovered
            const isDimmed = highlightedEdges && !highlightedEdges.has(node.id) && node.id !== (hovered || activeTopic)
            const r = isActive ? 10 : isHovered ? 9 : 7

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => handleClick(node.id)}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Node circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={colors.fill}
                  stroke={isActive ? '#fff' : colors.stroke}
                  strokeWidth={isActive ? 2.5 : 1}
                  opacity={isDimmed ? 0.15 : 1}
                  className="transition-all duration-200"
                />

                {/* Label */}
                <text
                  x={node.x}
                  y={node.y + r + 12}
                  textAnchor="middle"
                  fontSize="8"
                  fill="currentColor"
                  opacity={isDimmed ? 0.1 : 0.7}
                  className="text-text-dim pointer-events-none select-none transition-opacity duration-200"
                >
                  {truncate(node.title)}
                </text>

                {/* Hover tooltip — bigger label */}
                {isHovered && (
                  <text
                    x={node.x}
                    y={node.y - r - 6}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="currentColor"
                    className="text-text pointer-events-none select-none"
                  >
                    {truncate(node.title, 40)}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
