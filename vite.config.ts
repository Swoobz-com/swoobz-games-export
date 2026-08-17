import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// AUTOMAT — standalone. Everything the game needs lives inside this folder
// (src/game = the Original, public/ = its skin + room templates), so there is
// no fs.allow escape hatch here and no dependency on any sibling checkout.
// Port 5283 is this game's canonical port (assay 5182, pulse 5180, vault 5281).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5283,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/game/**/*.test.ts'],
  },
})
