/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { attachMatchRelay } from './src/server/matchRelay';

// Embed the VS FRIEND room relay in the dev AND preview HTTP servers. It shares the server with
// Vite's HMR socket but only ever handles upgrades on '/fr-ws' (see attachMatchRelay), so HMR is
// untouched. `server.httpServer` exists for both hooks in non-middleware mode.
function matchRelayPlugin(): Plugin {
  return {
    name: 'frozen-requiem-match-relay',
    configureServer(server) {
      if (server.httpServer) attachMatchRelay(server.httpServer);
    },
    configurePreviewServer(server) {
      if (server.httpServer) attachMatchRelay(server.httpServer);
    },
  };
}

export default defineConfig({
  plugins: [react(), matchRelayPlugin()],
  server: {
    port: 5340,
    strictPort: true,
  },
  preview: {
    port: 5340,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Serial test files: the two live-WebSocket suites (matchRelay/wsTransport) intermittently
    // trip a tinypool "Worker exited unexpectedly" crash on Windows when run in PARALLEL
    // workers (~1 in 10 full runs; never reproduced solo in 8+ runs each). The whole suite is
    // ~1.3s, so serial costs nothing and makes the gate deterministic.
    fileParallelism: false,
  },
});
