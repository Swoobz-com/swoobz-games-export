import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Self-contained package containing BOTH:
//   • the "Pulse — candle crash" rebuild  -> src/candle   (index.html, default)
//   • the FULL original Pulse framework   -> src/framework (full-pulse.html)
// The only framework dependency, `next/navigation`, is aliased to a local shim
// so nothing is imported from outside this folder.
export default defineConfig({
  // Relative asset paths so the built ./dist works served from any folder/host.
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      'next/navigation': fileURLToPath(new URL('./src/shims/next-navigation.ts', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      input: {
        // candle crash (default landing page)
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        // full original Pulse framework game
        pulse: fileURLToPath(new URL('./full-pulse.html', import.meta.url)),
      },
    },
  },
  server: {
    port: 5180,
    open: true,
  },
})
