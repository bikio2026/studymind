import { useMemo } from 'react'
import { useTranslation } from '../lib/useTranslation'

/**
 * BookCoverageBar — Torrent-style coverage visualization
 *
 * Shows which sections of a book are processed (green) vs pending (gray).
 * Each section's width is proportional to its page count.
 *
 * Variants:
 * - compact: thin bar for Library card (8px height, no labels)
 * - expanded: with percentage and tooltips for StudyGuide header
 * - interactive: clickable sections for range selector
 */

function getSectionPages(section, totalPages) {
  const start = section.pageStart || section.bookPage || 0
  const end = section.pageEnd || section.bookPage || start
  return Math.max(end - start + 1, 1)
}

export default function BookCoverageBar({
  bookStructure,
  processedSectionIds = new Set(),
  variant = 'compact',
  totalPages = 0,
  onSectionClick,
}) {
  const { t } = useTranslation()
  // Only show level 1-2 sections (chapters/sections, not subsections)
  const sections = useMemo(() => {
    if (!bookStructure?.sections) return []
    return bookStructure.sections.filter(s => (s.level || 1) <= 2)
  }, [bookStructure])

  const stats = useMemo(() => {
    if (!sections.length) return { processed: 0, total: 0, percent: 0 }
    const processed = sections.filter(s => processedSectionIds.has(s.id)).length
    return {
      processed,
      total: sections.length,
      percent: Math.round((processed / sections.length) * 100),
    }
  }, [sections, processedSectionIds])

  // Calculate total page span for proportional widths
  const totalSpan = useMemo(() => {
    if (totalPages > 0) return totalPages
    return sections.reduce((sum, s) => sum + getSectionPages(s, 0), 0)
  }, [sections, totalPages])

  if (!sections.length) return null

  const barHeight = variant === 'compact' ? 'h-2' : 'h-4'
  const isInteractive = variant === 'interactive'
  const showLabel = variant !== 'compact'

  return (
    <div className="w-full">
      {/* Header with percentage (expanded/interactive only) */}
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-muted">
            {t('coverage.label', { n: stats.processed, total: stats.total })}
          </span>
          <span className="text-xs font-medium text-accent">{stats.percent}%</span>
        </div>
      )}

      {/* Bar */}
      <div className={`w-full ${barHeight} rounded-full overflow-hidden flex bg-surface-light/30`}>
        {sections.map((section, i) => {
          const pages = getSectionPages(section, totalPages)
          const widthPercent = totalSpan > 0 ? (pages / totalSpan) * 100 : (100 / sections.length)
          const isProcessed = processedSectionIds.has(section.id)
          const isLevel1 = (section.level || 1) === 1

          return (
            <div
              key={section.id || i}
              className={`
                ${isProcessed ? 'bg-accent' : 'bg-surface-light/60'}
                ${isInteractive && !isProcessed ? 'hover:bg-accent/30 cursor-pointer' : ''}
                ${isInteractive && isProcessed ? 'cursor-default' : ''}
                ${i > 0 && isLevel1 ? 'border-l border-surface/50' : ''}
                transition-colors relative group
              `}
              style={{ width: `${Math.max(widthPercent, 0.5)}%` }}
              onClick={() => {
                if (isInteractive && !isProcessed && onSectionClick) {
                  onSectionClick(section)
                }
              }}
              title={variant !== 'compact' ? `${section.title}${section.bookPage ? ` (p.${section.bookPage})` : ''} — ${isProcessed ? t('coverage.processed') : t('coverage.pending')}` : undefined}
            >
              {/* Tooltip for interactive variant */}
              {isInteractive && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                  <div className="bg-surface border border-surface-light rounded-lg px-2 py-1 text-[10px] text-text-dim whitespace-nowrap shadow-lg">
                    {section.title}
                    {!isProcessed && <span className="text-accent ml-1">{t('coverage.clickToProcess')}</span>}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Compact percentage below */}
      {variant === 'compact' && stats.percent > 0 && stats.percent < 100 && (
        <span className="text-[10px] text-text-muted mt-0.5 block">{stats.percent}%</span>
      )}
    </div>
  )
}
