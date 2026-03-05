/**
 * EconChart — SVG economics graph renderer
 *
 * Renders 2D line/curve charts with labeled axes, intersections,
 * and shift arrows. Uses theme CSS variables for colors.
 *
 * Props:
 * - config: { title, xAxis, yAxis, curves, intersections, shifts, annotations }
 * - className: optional wrapper class
 */

const COLORS = {
  accent: 'var(--color-accent, #8b5cf6)',
  blue: '#60a5fa',
  red: '#f87171',
  green: '#34d399',
  amber: '#fbbf24',
  gray: 'var(--color-text-muted, #6b7280)',
}

// Convert normalized [0-100] coords to SVG coords within the chart area
function toSVG(point, chartArea) {
  const [nx, ny] = point
  return [
    chartArea.left + (nx / 100) * chartArea.width,
    chartArea.top + ((100 - ny) / 100) * chartArea.height,
  ]
}

// Generate smooth SVG path from points (quadratic bezier for curves)
function pointsToPath(points, chartArea, smooth = true) {
  if (points.length < 2) return ''
  const svgPoints = points.map(p => toSVG(p, chartArea))

  if (!smooth || points.length === 2) {
    return `M ${svgPoints[0][0]},${svgPoints[0][1]} ` +
      svgPoints.slice(1).map(p => `L ${p[0]},${p[1]}`).join(' ')
  }

  // Catmull-Rom to cubic bezier for smooth curves
  let d = `M ${svgPoints[0][0]},${svgPoints[0][1]}`
  for (let i = 0; i < svgPoints.length - 1; i++) {
    const p0 = svgPoints[Math.max(0, i - 1)]
    const p1 = svgPoints[i]
    const p2 = svgPoints[i + 1]
    const p3 = svgPoints[Math.min(svgPoints.length - 1, i + 2)]

    const tension = 0.3
    const cp1x = p1[0] + (p2[0] - p0[0]) * tension
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0]},${p2[1]}`
  }
  return d
}

// Grid lines
function Grid({ chartArea, steps = 5 }) {
  const lines = []
  for (let i = 1; i < steps; i++) {
    const x = chartArea.left + (i / steps) * chartArea.width
    const y = chartArea.top + (i / steps) * chartArea.height
    lines.push(
      <line key={`gx-${i}`} x1={x} y1={chartArea.top} x2={x} y2={chartArea.top + chartArea.height}
        stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />,
      <line key={`gy-${i}`} x1={chartArea.left} y1={y} x2={chartArea.left + chartArea.width} y2={y}
        stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />,
    )
  }
  return <>{lines}</>
}

// Axes with arrows and labels
function Axes({ chartArea, xAxis, yAxis }) {
  const arrowSize = 6
  return (
    <g>
      {/* X axis */}
      <line
        x1={chartArea.left} y1={chartArea.top + chartArea.height}
        x2={chartArea.left + chartArea.width + 8} y2={chartArea.top + chartArea.height}
        stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"
      />
      {/* X arrow */}
      <polygon
        points={`${chartArea.left + chartArea.width + 12},${chartArea.top + chartArea.height} ${chartArea.left + chartArea.width + 4},${chartArea.top + chartArea.height - arrowSize / 2} ${chartArea.left + chartArea.width + 4},${chartArea.top + chartArea.height + arrowSize / 2}`}
        fill="currentColor" fillOpacity="0.3"
      />
      {/* X label */}
      <text
        x={chartArea.left + chartArea.width / 2}
        y={chartArea.top + chartArea.height + 32}
        textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.5"
        fontFamily="inherit"
      >
        {xAxis?.label}
      </text>

      {/* Y axis */}
      <line
        x1={chartArea.left} y1={chartArea.top - 8}
        x2={chartArea.left} y2={chartArea.top + chartArea.height}
        stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5"
      />
      {/* Y arrow */}
      <polygon
        points={`${chartArea.left},${chartArea.top - 12} ${chartArea.left - arrowSize / 2},${chartArea.top - 4} ${chartArea.left + arrowSize / 2},${chartArea.top - 4}`}
        fill="currentColor" fillOpacity="0.3"
      />
      {/* Y label */}
      <text
        x={chartArea.left - 10}
        y={chartArea.top + chartArea.height / 2}
        textAnchor="middle" fontSize="11" fill="currentColor" fillOpacity="0.5"
        fontFamily="inherit"
        transform={`rotate(-90, ${chartArea.left - 10}, ${chartArea.top + chartArea.height / 2})`}
      >
        {yAxis?.label}
      </text>

      {/* Origin */}
      <text
        x={chartArea.left - 6} y={chartArea.top + chartArea.height + 14}
        textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.3"
        fontFamily="inherit"
      >
        0
      </text>
    </g>
  )
}

// Single curve with label
function Curve({ curve, chartArea, index }) {
  const color = COLORS[curve.color] || curve.color || COLORS.accent
  const dashArray = curve.style === 'dashed' ? '6,4' : undefined
  const path = pointsToPath(curve.points, chartArea, curve.smooth !== false)

  // Label position: end of curve
  const lastPoint = curve.points[curve.points.length - 1]
  const [lx, ly] = toSVG(lastPoint, chartArea)
  // Offset label based on curve direction
  const labelOffset = curve.labelOffset || [8, 0]

  return (
    <g>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeDasharray={dashArray}
        strokeLinecap="round"
      />
      {curve.name && (
        <text
          x={lx + labelOffset[0]}
          y={ly + labelOffset[1]}
          fontSize="12"
          fontWeight="600"
          fill={color}
          fontFamily="inherit"
          dominantBaseline="middle"
        >
          {curve.name}
        </text>
      )}
    </g>
  )
}

// Intersection point marker
function Intersection({ point, chartArea }) {
  const [cx, cy] = toSVG([point.x, point.y], chartArea)

  return (
    <g>
      {/* Dashed lines to axes */}
      <line
        x1={chartArea.left} y1={cy}
        x2={cx} y2={cy}
        stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3,3"
      />
      <line
        x1={cx} y1={cy}
        x2={cx} y2={chartArea.top + chartArea.height}
        stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="3,3"
      />

      {/* Point dot */}
      <circle cx={cx} cy={cy} r="4" fill={COLORS.accent} />
      <circle cx={cx} cy={cy} r="7" fill="none" stroke={COLORS.accent} strokeOpacity="0.3" strokeWidth="1.5" />

      {/* Label */}
      {point.label && (
        <text
          x={cx + (point.labelOffset?.[0] || 8)}
          y={cy + (point.labelOffset?.[1] || -8)}
          fontSize="12" fontWeight="700" fill={COLORS.accent}
          fontFamily="inherit"
        >
          {point.label}
        </text>
      )}

      {/* Axis value labels */}
      {point.xLabel && (
        <text
          x={cx} y={chartArea.top + chartArea.height + 14}
          textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.4"
          fontFamily="inherit"
        >
          {point.xLabel}
        </text>
      )}
      {point.yLabel && (
        <text
          x={chartArea.left - 6} y={cy + 4}
          textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.4"
          fontFamily="inherit"
        >
          {point.yLabel}
        </text>
      )}
    </g>
  )
}

// Shift arrow
function ShiftArrow({ shift, chartArea }) {
  const [x1, y1] = toSVG(shift.from, chartArea)
  const [x2, y2] = toSVG(shift.to, chartArea)
  const color = COLORS[shift.color] || COLORS.amber

  // Arrow head
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const headLen = 8
  const ax1 = x2 - headLen * Math.cos(angle - Math.PI / 6)
  const ay1 = y2 - headLen * Math.sin(angle - Math.PI / 6)
  const ax2 = x2 - headLen * Math.cos(angle + Math.PI / 6)
  const ay2 = y2 - headLen * Math.sin(angle + Math.PI / 6)

  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeWidth="2" strokeDasharray="4,3" />
      <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={color} />
      {shift.label && (
        <text
          x={(x1 + x2) / 2 + (shift.labelOffset?.[0] || 0)}
          y={(y1 + y2) / 2 + (shift.labelOffset?.[1] || -10)}
          textAnchor="middle" fontSize="10" fontWeight="600" fill={color}
          fontFamily="inherit"
        >
          {shift.label}
        </text>
      )}
    </g>
  )
}

export default function EconChart({ config, className = '' }) {
  if (!config) return null

  const viewBox = '0 0 400 280'
  const chartArea = { left: 50, top: 20, width: 310, height: 210 }

  return (
    <div className={`rounded-xl border border-surface-light/40 bg-surface-alt/50 p-4 ${className}`}>
      {/* Title */}
      {config.title && (
        <p className="text-xs font-semibold text-text-dim mb-3 text-center tracking-wide uppercase">
          {config.title}
        </p>
      )}

      {/* SVG */}
      <svg
        viewBox={viewBox}
        className="w-full"
        style={{ maxHeight: '260px' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <Grid chartArea={chartArea} />
        <Axes chartArea={chartArea} xAxis={config.xAxis} yAxis={config.yAxis} />

        {/* Curves */}
        {(config.curves || []).map((curve, i) => (
          <Curve key={i} curve={curve} chartArea={chartArea} index={i} />
        ))}

        {/* Shifted curves (rendered with lower opacity) */}
        {(config.shiftedCurves || []).map((curve, i) => (
          <g key={`shifted-${i}`} opacity="0.5">
            <Curve curve={curve} chartArea={chartArea} index={i} />
          </g>
        ))}

        {/* Shift arrows */}
        {(config.shifts || []).map((shift, i) => (
          <ShiftArrow key={i} shift={shift} chartArea={chartArea} />
        ))}

        {/* Intersections */}
        {(config.intersections || []).map((pt, i) => (
          <Intersection key={i} point={pt} chartArea={chartArea} />
        ))}
      </svg>

      {/* Annotation */}
      {config.annotation && (
        <p className="text-[11px] text-text-muted mt-2 text-center leading-snug">
          {config.annotation}
        </p>
      )}
    </div>
  )
}
