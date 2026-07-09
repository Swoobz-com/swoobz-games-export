import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PulseExperience } from './framework/pulse/PulseExperience'
import './tailwind-shim.css'

// Runner for the FULL original Pulse Original — the framework game living in
// ./framework (pulse + _shared). This is the second entry point; the default
// index.html runs the "candle crash" rebuild in ./candle instead.
const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

function FullScreen() {
  return (
    <div style={{ width: '100vw', height: '100dvh', background: '#03070d', overflowX: 'hidden', overflowY: 'auto' }}>
      <PulseExperience />
    </div>
  )
}

createRoot(el).render(
  <StrictMode>
    <FullScreen />
  </StrictMode>,
)
