/**
 * graphCatalog — Pre-defined economics graphs for StudyMind
 *
 * Maps topic titles to SVG chart configurations.
 * Each config is rendered by EconChart.jsx.
 *
 * Coordinates are normalized [0-100] where (0,0) is bottom-left.
 */

const CATALOG = [
  // ── IS Curve ──
  {
    match: /curva\s*is|is\s*curve|mercado\s*de\s*productos/i,
    config: {
      title: 'Curva IS — Equilibrio en el Mercado de Bienes',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'IS',
          points: [[10, 85], [30, 60], [55, 38], [85, 15]],
          color: 'accent',
          labelOffset: [8, 4],
        },
      ],
      intersections: [
        { x: 45, y: 45, label: 'A', xLabel: 'Y₀', yLabel: 'r₀', labelOffset: [10, -8] },
      ],
      annotation: 'La IS muestra combinaciones de Y y r donde el mercado de bienes está en equilibrio (I = S). Pendiente negativa: mayor r → menor I → menor Y.',
    },
  },

  // ── LM Curve ──
  {
    match: /curva\s*lm|lm\s*curve|mercado\s*de\s*dinero/i,
    config: {
      title: 'Curva LM — Equilibrio en el Mercado de Dinero',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'LM',
          points: [[10, 15], [35, 30], [60, 50], [85, 80]],
          color: 'blue',
          labelOffset: [8, -4],
        },
      ],
      intersections: [
        { x: 50, y: 42, label: 'A', xLabel: 'Y₀', yLabel: 'r₀', labelOffset: [10, -8] },
      ],
      annotation: 'La LM muestra combinaciones de Y y r donde el mercado de dinero está en equilibrio (Md = Ms). Pendiente positiva: mayor Y → mayor Md → mayor r.',
    },
  },

  // ── IS-LM (Equilibrio Estático Básico) ──
  {
    match: /equilibrio.*modelo\s*est[aá]tico|is[\s-]*lm|modelo\s*est[aá]tico\s*b[aá]sico/i,
    config: {
      title: 'Modelo IS-LM — Equilibrio General',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'IS',
          points: [[10, 85], [30, 60], [55, 38], [85, 15]],
          color: 'accent',
          labelOffset: [8, 4],
        },
        {
          name: 'LM',
          points: [[10, 15], [35, 30], [60, 50], [85, 80]],
          color: 'blue',
          labelOffset: [8, -4],
        },
      ],
      intersections: [
        { x: 45, y: 43, label: 'E', xLabel: 'Y*', yLabel: 'r*', labelOffset: [10, -10] },
      ],
      annotation: 'El punto E es el equilibrio simultáneo en los mercados de bienes (IS) y dinero (LM). Determina Y* y r* de equilibrio.',
    },
  },

  // ── Política Monetaria y Fiscal ──
  {
    match: /pol[ií]tica\s*(monetaria|fiscal)|monetary.*fiscal\s*policy/i,
    config: {
      title: 'Efectos de Política Monetaria y Fiscal',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'IS',
          points: [[10, 85], [30, 60], [55, 38], [85, 15]],
          color: 'accent',
          labelOffset: [8, 4],
        },
        {
          name: 'LM',
          points: [[10, 15], [35, 30], [60, 50], [85, 80]],
          color: 'blue',
          labelOffset: [8, -4],
        },
      ],
      shiftedCurves: [
        {
          name: "IS'",
          points: [[25, 85], [45, 60], [70, 38], [95, 15]],
          color: 'accent',
          style: 'dashed',
          labelOffset: [6, 4],
        },
        {
          name: "LM'",
          points: [[10, 5], [35, 20], [60, 40], [85, 70]],
          color: 'blue',
          style: 'dashed',
          labelOffset: [6, -4],
        },
      ],
      shifts: [
        { from: [40, 55], to: [55, 55], color: 'amber', label: 'G↑', labelOffset: [0, -12] },
        { from: [50, 55], to: [50, 42], color: 'green', label: 'Ms↑', labelOffset: [14, 0] },
      ],
      intersections: [
        { x: 45, y: 43, label: 'E₀', labelOffset: [-22, -10] },
        { x: 60, y: 48, label: 'E₁', xLabel: 'Y₁', labelOffset: [8, -10] },
      ],
      annotation: 'Fiscal expansiva (G↑): IS→derecha, sube Y y r. Monetaria expansiva (Ms↑): LM→abajo, sube Y y baja r.',
    },
  },

  // ── Función de Consumo ──
  {
    match: /funci[oó]n\s*de\s*consumo|consumption\s*function/i,
    config: {
      title: 'Función de Consumo Keynesiana',
      xAxis: { label: 'Y (Ingreso disponible)' },
      yAxis: { label: 'C (Consumo)' },
      curves: [
        {
          name: '45°',
          points: [[0, 0], [90, 90]],
          color: 'gray',
          style: 'dashed',
          smooth: false,
          labelOffset: [4, -8],
        },
        {
          name: 'C = a + bY',
          points: [[0, 20], [90, 74]],
          color: 'accent',
          smooth: false,
          labelOffset: [-10, -12],
        },
      ],
      intersections: [
        { x: 33, y: 33, label: 'E', xLabel: 'Yₑ', labelOffset: [-16, -10] },
      ],
      annotation: 'C = a + bY donde a = consumo autónomo, b = PMgC (0 < b < 1). Debajo de 45° el consumo supera el ingreso (desahorro).',
    },
  },

  // ── Función de Inversión ──
  {
    match: /funci[oó]n\s*de\s*inversi[oó]n|investment\s*function/i,
    config: {
      title: 'Función de Inversión',
      xAxis: { label: 'I (Inversión)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'I(r)',
          points: [[10, 85], [25, 65], [45, 45], [70, 28], [90, 18]],
          color: 'accent',
          labelOffset: [6, -10],
        },
      ],
      intersections: [
        { x: 45, y: 45, label: '', xLabel: 'I₀', yLabel: 'r₀' },
      ],
      annotation: 'La inversión depende negativamente de r: mayor tasa de interés → menor inversión (mayor costo del capital).',
    },
  },

  // ── Demanda de Dinero ──
  {
    match: /demanda\s*de\s*dinero|money\s*demand/i,
    config: {
      title: 'Demanda de Dinero',
      xAxis: { label: 'M/P (Saldos reales)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'L(Y,r)',
          points: [[10, 90], [20, 65], [35, 42], [55, 28], [80, 18], [95, 14]],
          color: 'accent',
          labelOffset: [4, -10],
        },
        {
          name: 'Ms/P',
          points: [[50, 5], [50, 95]],
          color: 'blue',
          smooth: false,
          labelOffset: [6, 0],
        },
      ],
      intersections: [
        { x: 50, y: 30, label: 'E', yLabel: 'r*', labelOffset: [10, -8] },
      ],
      annotation: 'La demanda de dinero L(Y,r) es decreciente en r (motivo especulativo). Ms/P es fija (política del banco central). Equilibrio en E.',
    },
  },

  // ── Curva de Phillips ──
  {
    match: /phillips|inflaci[oó]n.*desempleo/i,
    config: {
      title: 'Curva de Phillips',
      xAxis: { label: 'u (Tasa de desempleo)' },
      yAxis: { label: 'π (Tasa de inflación)' },
      curves: [
        {
          name: 'Phillips',
          points: [[10, 88], [20, 65], [35, 42], [50, 28], [70, 18], [90, 12]],
          color: 'accent',
          labelOffset: [4, -10],
        },
      ],
      intersections: [
        { x: 50, y: 28, label: '', xLabel: 'uₙ', yLabel: 'πₑ' },
      ],
      annotation: 'Trade-off entre inflación y desempleo: menor desempleo → mayor inflación. La curva se desplaza con cambios en expectativas inflacionarias.',
    },
  },

  // ── Mercado de Trabajo ──
  {
    match: /mercado\s*de\s*trabajo|labor\s*market/i,
    config: {
      title: 'Equilibrio en el Mercado de Trabajo',
      xAxis: { label: 'N (Empleo)' },
      yAxis: { label: 'W/P (Salario real)' },
      curves: [
        {
          name: 'Nˢ',
          points: [[15, 15], [35, 35], [60, 55], [85, 80]],
          color: 'blue',
          labelOffset: [6, -6],
        },
        {
          name: 'Nᵈ',
          points: [[10, 85], [30, 62], [55, 40], [85, 18]],
          color: 'accent',
          labelOffset: [6, 6],
        },
      ],
      intersections: [
        { x: 48, y: 46, label: 'E', xLabel: 'N*', yLabel: '(W/P)*', labelOffset: [10, -10] },
      ],
      annotation: 'Nᵈ = demanda de trabajo (PMgL decreciente). Nˢ = oferta de trabajo. En E se determina empleo y salario real de equilibrio.',
    },
  },

  // ── Sector Externo ──
  {
    match: /sector\s*externo|external\s*sector|balanza\s*de\s*pagos/i,
    config: {
      title: 'IS-LM con Sector Externo (Economía Abierta)',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'IS',
          points: [[10, 80], [30, 58], [55, 36], [80, 18]],
          color: 'accent',
          labelOffset: [8, 4],
        },
        {
          name: 'LM',
          points: [[10, 18], [35, 32], [60, 50], [85, 75]],
          color: 'blue',
          labelOffset: [8, -4],
        },
        {
          name: 'BP',
          points: [[10, 30], [90, 55]],
          color: 'green',
          smooth: false,
          labelOffset: [6, -8],
        },
      ],
      intersections: [
        { x: 43, y: 42, label: 'E', labelOffset: [10, -10] },
      ],
      annotation: 'BP = equilibrio en balanza de pagos. Sobre BP: superávit (entrada de K). Bajo BP: déficit. Triple equilibrio en E.',
    },
  },

  // ── Función de Producción ──
  {
    match: /funci[oó]n\s*de\s*producci[oó]n|modelos?\s*de\s*crecimiento|production\s*function/i,
    config: {
      title: 'Función de Producción — Y = f(K, L)',
      xAxis: { label: 'K (Capital por trabajador)' },
      yAxis: { label: 'Y (Producto por trabajador)' },
      curves: [
        {
          name: 'Y = f(K)',
          points: [[5, 10], [15, 30], [30, 50], [50, 65], [70, 75], [90, 82]],
          color: 'accent',
          labelOffset: [4, -10],
        },
      ],
      annotation: 'Rendimientos decrecientes del capital: a medida que K/L aumenta, cada unidad adicional de capital contribuye menos al producto.',
    },
  },

  // ── Crecimiento / Modelo de Solow ──
  {
    match: /crecimiento.*[oó]ptimo|equilibrio\s*din[aá]mico|solow|steady\s*state/i,
    config: {
      title: 'Modelo de Crecimiento — Estado Estacionario',
      xAxis: { label: 'k (Capital por trabajador)' },
      yAxis: { label: 'y, sf(k), (n+δ)k' },
      curves: [
        {
          name: 'f(k)',
          points: [[5, 10], [15, 30], [30, 52], [50, 68], [70, 78], [90, 84]],
          color: 'accent',
          labelOffset: [4, -10],
        },
        {
          name: 'sf(k)',
          points: [[5, 5], [15, 16], [30, 28], [50, 37], [70, 42], [90, 45]],
          color: 'blue',
          labelOffset: [4, -10],
        },
        {
          name: '(n+δ)k',
          points: [[0, 0], [90, 54]],
          color: 'red',
          smooth: false,
          labelOffset: [2, -10],
        },
      ],
      intersections: [
        { x: 55, y: 33, label: 'k*', xLabel: 'k*', labelOffset: [8, -12] },
      ],
      annotation: 'Estado estacionario en k* donde sf(k) = (n+δ)k. La economía converge a k* independientemente del punto inicial.',
    },
  },

  // ── Multiplicador ──
  {
    match: /multiplicador|multiplier/i,
    config: {
      title: 'Efecto Multiplicador',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'DA (Demanda Agregada)' },
      curves: [
        {
          name: '45°',
          points: [[0, 0], [90, 90]],
          color: 'gray',
          style: 'dashed',
          smooth: false,
          labelOffset: [4, -8],
        },
        {
          name: 'DA₀',
          points: [[0, 25], [90, 67]],
          color: 'accent',
          smooth: false,
          labelOffset: [4, -10],
        },
        {
          name: 'DA₁',
          points: [[0, 35], [90, 77]],
          color: 'blue',
          smooth: false,
          labelOffset: [4, -10],
        },
      ],
      shifts: [
        { from: [25, 37], to: [25, 47], color: 'amber', label: 'ΔG', labelOffset: [12, 0] },
      ],
      intersections: [
        { x: 38, y: 38, label: 'E₀', xLabel: 'Y₀', labelOffset: [-20, -10] },
        { x: 55, y: 55, label: 'E₁', xLabel: 'Y₁', labelOffset: [8, -10] },
      ],
      annotation: 'Un aumento ΔG desplaza DA arriba. El ingreso sube ΔY = ΔG × 1/(1-b) donde b = PMgC. El multiplicador amplifica el impulso inicial.',
    },
  },

  // ── Combinación Monetaria-Fiscal y Tendencia ──
  {
    match: /combinaci[oó]n.*monetaria.*fiscal.*tendencia|policy\s*mix.*trend/i,
    config: {
      title: 'Política Monetaria-Fiscal a lo Largo de la Tendencia',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'r (Tasa de interés)' },
      curves: [
        {
          name: 'IS',
          points: [[10, 80], [30, 58], [55, 36], [80, 18]],
          color: 'accent',
          labelOffset: [8, 4],
        },
        {
          name: 'LM₀',
          points: [[10, 18], [35, 32], [60, 50], [85, 75]],
          color: 'blue',
          labelOffset: [8, -4],
        },
      ],
      shiftedCurves: [
        {
          name: 'LM₁',
          points: [[25, 18], [50, 32], [75, 50], [95, 70]],
          color: 'blue',
          style: 'dashed',
          labelOffset: [6, -4],
        },
      ],
      shifts: [
        { from: [55, 55], to: [70, 45], color: 'green', label: 'Ms↑', labelOffset: [8, -8] },
      ],
      intersections: [
        { x: 43, y: 42, label: 'E₀', labelOffset: [-22, -8] },
        { x: 58, y: 33, label: 'E₁', xLabel: 'Yₜ', labelOffset: [8, -10] },
      ],
      annotation: 'Para mantener el crecimiento a lo largo de la tendencia, la política monetaria debe expandir Ms gradualmente, desplazando LM a la derecha.',
    },
  },

  // ── Cuentas del Ingreso Nacional ──
  {
    match: /cuentas.*ingreso\s*nacional|national\s*income\s*accounts/i,
    config: {
      title: 'Flujo Circular del Ingreso',
      xAxis: { label: 'Y (Ingreso / Producto)' },
      yAxis: { label: 'DA (Demanda Agregada)' },
      curves: [
        {
          name: '45°',
          points: [[0, 0], [90, 90]],
          color: 'gray',
          style: 'dashed',
          smooth: false,
          labelOffset: [4, -8],
        },
        {
          name: 'C + I + G',
          points: [[0, 30], [90, 72]],
          color: 'accent',
          smooth: false,
          labelOffset: [-4, -12],
        },
      ],
      intersections: [
        { x: 50, y: 50, label: 'E', xLabel: 'Y*', labelOffset: [10, -10] },
      ],
      annotation: 'Y = C + I + G: el ingreso de equilibrio se determina donde la demanda agregada (C+I+G) iguala al producto (línea 45°).',
    },
  },
]

/**
 * Find a matching graph configuration for a topic
 * @param {object} topic - Topic with sectionTitle, title, etc.
 * @returns {object|null} Chart config or null
 */
export function getGraphForTopic(topic) {
  if (!topic) return null
  const title = topic.sectionTitle || topic.title || ''

  for (const entry of CATALOG) {
    if (entry.match.test(title)) {
      return entry.config
    }
  }
  return null
}
