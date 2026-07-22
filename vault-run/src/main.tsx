import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VaultExperience } from '../../originals/vault/VaultExperience'
import './tailwind-shim.css'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

createRoot(el).render(
  <StrictMode>
    <div style={{ width: '100vw', minHeight: '100dvh', background: '#03070d' }}>
      <VaultExperience />
    </div>
  </StrictMode>,
)
