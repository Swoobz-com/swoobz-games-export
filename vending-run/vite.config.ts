import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Standalone runner for the AUTOMAT Original (originals/vending).
// Port 5283 is this game's canonical port (assay 5182, pulse 5180, vault 5281).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5283,
    strictPort: true,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
  test: {
    environment: 'node',
    include: ['../originals/vending/**/*.test.ts'],
  },
})
