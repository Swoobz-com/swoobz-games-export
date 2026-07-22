import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { OoFisherExperience } from '../../originals/oo_fisher/OoFisherExperience'
import './tailwind-shim.css'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

createRoot(el).render(
  <StrictMode>
    <div style={{ width: '100vw', height: '100dvh', background: '#03070d', overflow: 'hidden' }}>
      <OoFisherExperience />
    </div>
  </StrictMode>,
)
