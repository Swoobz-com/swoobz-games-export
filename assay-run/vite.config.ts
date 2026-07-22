import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Standalone runner for The Assay Line Original (originals/assay).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5182,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
  test: {
    environment: 'node',
    // Tests live in the sibling game folder; forward-slash glob relative to root.
    include: ['../originals/assay/**/*.test.ts'],
  },
})
