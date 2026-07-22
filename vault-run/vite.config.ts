import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone runner for the Vault / "Rug or Riches" Original (originals/vault).
// `_shared/*` imports resolve to the shim folder at ../originals/_shared.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'next/navigation': fileURLToPath(new URL('./src/shims/next-navigation.ts', import.meta.url)),
    },
  },
  server: {
    port: 5281,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
})
