import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Standalone runner for the OO-Fisher Original (originals/oo_fisher) — a 3D
// (three + @react-three/fiber) reeling game. next/dynamic + the on-chain client
// + _shared/* are shimmed.
export default defineConfig({
  plugins: [react()],
  define: {
    // The source reads process.env.NODE_ENV + a NEXT_PUBLIC_* onchain flag via a
    // computed key, so it needs the whole object. Empty → onchain off (mock path).
    // NODE_ENV pinned to production so React builds its production runtime.
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
  },
  resolve: {
    // The game source lives OUTSIDE this runner's folder, so node can't walk up
    // to our node_modules. dedupe forces these bare deps to resolve from here.
    dedupe: ['react', 'react-dom', 'three', '@react-three/fiber'],
    alias: {
      'next/dynamic': fileURLToPath(new URL('./src/shims/next-dynamic.ts', import.meta.url)),
      'next/navigation': fileURLToPath(new URL('./src/shims/next-navigation.ts', import.meta.url)),
      '../../../lib/onchain/originals-oo-fisher/client': fileURLToPath(
        new URL('./src/shims/oo-fisher-onchain-client.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5182,
    fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
  },
})
