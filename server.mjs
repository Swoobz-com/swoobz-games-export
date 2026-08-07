// Production entry: `npm start`. Serves ./dist and carries the VS FRIEND relay on the same port,
// with no Vite in the process. Before this file the relay existed only inside vite.config.ts's
// dev/preview hooks, so a static dist deploy shipped a VS FRIEND button that could never open a room.
//
// TYPE STRIPPING, AND WHY THE '.ts' EXTENSIONS ARE MANDATORY. node runs these TypeScript modules
// directly (measured on v24.15.0; unflagged since 22.18, which is the floor package.json now
// declares). Its loader does NOT resolve an extensionless specifier and does NOT rewrite '.js' to
// '.ts' — both were measured to throw ERR_MODULE_NOT_FOUND — so the real extension is written out.
// staticServer.ts cannot spell its own import of matchRelay that way without failing `tsc`
// (TS5097), which is why attachMatchRelay is injected here instead: this is the ONE wiring line
// that decides whether the deployed game can open a room at all.
import { fileURLToPath } from 'node:url';
import { createStandoffServer } from './src/server/staticServer.ts';
import { attachMatchRelay, MATCH_RELAY_PATH } from './src/server/matchRelay.ts';

// Every PaaS hands the port in the environment. 5340 is the repo's pinned local port (vite.config.ts).
const port = Number(process.env.PORT ?? 5340);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`[standoff] refusing to start: PORT=${process.env.PORT} is not a valid port`);
  process.exit(1);
}
const host = process.env.HOST ?? '0.0.0.0';
const distDir = fileURLToPath(new URL('./dist', import.meta.url));

const { server, teardown } = createStandoffServer(distDir, attachMatchRelay);

server.on('error', (err) => {
  console.error('[standoff] server error:', err);
  process.exit(1);
});

server.listen(port, host, () => {
  console.log(`[standoff] serving ${distDir} on http://${host}:${port}  (relay ${MATCH_RELAY_PATH})`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    teardown();
    process.exit(0);
  });
}
