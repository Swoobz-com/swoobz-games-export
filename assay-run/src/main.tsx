import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AssayExperience } from '../../originals/assay/AssayExperience'

const el = document.getElementById('root')
if (!el) throw new Error('#root not found')

createRoot(el).render(
  <StrictMode>
    <AssayExperience />
  </StrictMode>,
)
