// Pulse theme tokens (from the asset-pulse README). cyan = up / player action,
// red = down / danger, gold = value markers (balance, ATH, crash line).
export const T = {
  bg: '#060b12',
  bgDeep: '#03070d',
  panel: 'rgba(13,20,30,.93)',
  panelBorder: '#1e3346',
  text: '#dcecf2',
  textMuted: '#7b93a6',
  textFaint: '#8199ad', // ≥4.5:1 on the dark panels (WCAG AA)
  up: '#35e0d2',
  upDeep: '#0d3c38',
  upText: '#8ff2e8',
  upBorder: '#1e5a4f',
  down: '#ff5d5d',
  downBg: '#2a1414',
  downBorder: '#5a2222',
  value: '#f0b542', // balance, ATH, peaks
  grid: '#12202e',
} as const
