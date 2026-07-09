import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone runner for the OO-Rei Original (originals/oo_rei) — the cinematic
// myth slot. next/navigation, the @/ user-settings store, and _shared/* are
// shimmed; process.env is defined for the dev/prod NODE_ENV branches.
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      'next/navigation': fileURLToPath(new URL('./src/shims/next-navigation.ts', import.meta.url)),
      '@/lib/userSettings/userSettingsStore': fileURLToPath(
        new URL('./src/shims/userSettingsStore.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5183,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
})
