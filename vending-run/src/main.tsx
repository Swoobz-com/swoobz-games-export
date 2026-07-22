import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VendingExperience } from '../../originals/vending/VendingExperience'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

createRoot(el).render(
  <StrictMode>
    <VendingExperience />
  </StrictMode>,
)
