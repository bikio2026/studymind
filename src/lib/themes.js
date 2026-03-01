// 4 visual themes for StudyMind
// Each theme overrides the CSS custom properties defined in @theme (index.css)

export const THEMES = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    description: 'Azul oscuro con acentos cyan',
    preview: { bg: '#0f172a', accent: '#06b6d4', text: '#f1f5f9' },
    vars: {
      '--color-surface': '#0f172a',
      '--color-surface-alt': '#1e293b',
      '--color-surface-light': '#334155',
      '--color-accent': '#06b6d4',
      '--color-accent-soft': '#0e7490',
      '--color-accent-glow': 'rgba(6, 182, 212, 0.12)',
      '--color-text': '#f1f5f9',
      '--color-text-dim': '#94a3b8',
      '--color-text-muted': '#64748b',
    },
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    description: 'Verde esmeralda sobre oscuro',
    preview: { bg: '#0c1a14', accent: '#10b981', text: '#ecfdf5' },
    vars: {
      '--color-surface': '#0c1a14',
      '--color-surface-alt': '#162822',
      '--color-surface-light': '#1f3d32',
      '--color-accent': '#10b981',
      '--color-accent-soft': '#059669',
      '--color-accent-glow': 'rgba(16, 185, 129, 0.12)',
      '--color-text': '#ecfdf5',
      '--color-text-dim': '#86efac',
      '--color-text-muted': '#4ade80',
    },
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    description: 'Tonos amber y naranja cálido',
    preview: { bg: '#1a1008', accent: '#f59e0b', text: '#fef3c7' },
    vars: {
      '--color-surface': '#1a1008',
      '--color-surface-alt': '#292014',
      '--color-surface-light': '#3d3020',
      '--color-accent': '#f59e0b',
      '--color-accent-soft': '#d97706',
      '--color-accent-glow': 'rgba(245, 158, 11, 0.12)',
      '--color-text': '#fef3c7',
      '--color-text-dim': '#c8a97a',
      '--color-text-muted': '#92734d',
    },
  },
  academic: {
    id: 'academic',
    name: 'Academic',
    description: 'Tema claro con tonos crema y sepia',
    preview: { bg: '#faf8f1', accent: '#92400e', text: '#292524' },
    vars: {
      '--color-surface': '#faf8f1',
      '--color-surface-alt': '#f0ece1',
      '--color-surface-light': '#d6d0c4',
      '--color-accent': '#92400e',
      '--color-accent-soft': '#b45309',
      '--color-accent-glow': 'rgba(146, 64, 14, 0.08)',
      '--color-text': '#292524',
      '--color-text-dim': '#57534e',
      '--color-text-muted': '#a8a29e',
    },
  },
}

export const THEME_IDS = Object.keys(THEMES)
export const DEFAULT_THEME = 'midnight'
