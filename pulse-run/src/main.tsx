import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PulseCandle } from './candle/PulseCandle'
import './tailwind-shim.css'

// Standalone runner for the "Pulse — candle crash" rebuild, built from the
// `input/asset pulse` package (README + spec + mockups). The older curve-based
// experience still lives at ../../originals/pulse and is left untouched.
const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

function FullScreen() {
  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#03070d', overflowX: 'hidden', overflowY: 'auto' }}>
      <PulseCandle />
    </div>
  )
}

createRoot(el).render(
  <StrictMode>
    <FullScreen />
  </StrictMode>,
)
