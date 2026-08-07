// The production HTTP layer: serve the built `dist` AND carry the VS FRIEND relay on the SAME
// server. Until this file existed the relay was reachable only through vite.config.ts's
// configureServer/configurePreviewServer, so a static `dist` deploy served a game whose VS FRIEND
// button could never open a room (AGENTS.md records that gap). `npm run preview` already worked;
// the hole was specifically "a production entry that does not depend on Vite".
//
// WHY THE ATTACH FUNCTION IS INJECTED INSTEAD OF IMPORTED. `server.mjs` boots this module through
// node's built-in type stripping, and that loader only resolves a relative specifier carrying its
// real extension. Measured on node v24.15.0:
//     './matchRelay'    -> ERR_MODULE_NOT_FOUND
//     './matchRelay.js' -> ERR_MODULE_NOT_FOUND  (node does NOT rewrite .js -> .ts)
//     './matchRelay.ts' -> runs, but `tsc --noEmit` rejects it: TS5097, unless
//                          allowImportingTsExtensions is switched on for the whole repo.
// There is therefore no spelling of a RUNTIME import of ./matchRelay that satisfies both gates
// without editing tsconfig.json. The import below is `import type` — erased before node ever
// resolves it — and the one real binding is passed in. It is a REQUIRED parameter and not a
// default: a defaulted relay is one a caller can silently omit and still ship a server that serves
// the game perfectly while no room can ever be created, which is the exact bug this file closes.

import { createServer, type IncomingMessage, type Server as HttpServer, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import type { attachMatchRelay } from './matchRelay';

/** The relay attacher, structurally pinned to the real one so a signature drift is a type error. */
export type AttachRelay = typeof attachMatchRelay;

// Everything dist actually ships. `.mjs` is here because vite can emit it for workers; unknown
// extensions fall to octet-stream rather than guessing — a wrong content-type on a video is worse
// than no opinion.
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
const FALLBACK_MIME = 'application/octet-stream';

interface ByteRange {
  start: number;
  end: number;
}

/**
 * Parse a `Range: bytes=` header against a known entity size.
 * Returns a range, `null` when the header is absent or should be ignored (answer the full 200), or
 * `'unsatisfiable'` (answer 416).
 *
 * Multi-range is deliberately in the IGNORE bucket: answering it needs a multipart/byteranges body,
 * and RFC 9110 §14.2 explicitly allows a server to respond with the whole entity instead. No
 * browser media element asks for one.
 */
export function parseRange(header: string | undefined, size: number): ByteRange | null | 'unsatisfiable' {
  if (header === undefined) return null;
  const unit = /^bytes=(.+)$/.exec(header.trim());
  if (!unit) return null;
  if (unit[1].includes(',')) return null;
  const parts = /^(\d*)-(\d*)$/.exec(unit[1].trim());
  if (!parts) return null;
  const [, rawStart, rawEnd] = parts;
  if (rawStart === '' && rawEnd === '') return null;
  let start: number;
  let end: number;
  if (rawStart === '') {
    // Suffix form `bytes=-N`: the LAST N bytes. N === 0 asks for nothing and is unsatisfiable.
    const suffix = Number(rawEnd);
    if (suffix === 0) return 'unsatisfiable';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    // Open-ended `bytes=N-` runs to the end; an end past the entity clamps rather than 416s.
    end = rawEnd === '' ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (size === 0 || start >= size || start > end) return 'unsatisfiable';
  return { start, end };
}

function sendText(res: ServerResponse, method: string, status: number, body: string): void {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  if (method === 'HEAD') res.end();
  else res.end(body);
}

function sendFile(req: IncomingMessage, res: ServerResponse, filePath: string, size: number): void {
  const type = MIME[extname(filePath).toLowerCase()] ?? FALLBACK_MIME;
  // RANGE SUPPORT IS NOT OPTIONAL HERE. dist/assets carries the whole character-clip tree
  // (.webm/.mp4) and iOS Safari refuses to play a <video> from a server that answers a Range
  // request with a full 200. `Accept-Ranges` goes on EVERY response for the entity, because that
  // first 200 is where a client learns it may seek at all.
  res.setHeader('accept-ranges', 'bytes');
  res.setHeader('content-type', type);
  // index.html names hash-stamped bundles; a cached copy pointing at deleted hashes is a white
  // screen on the next deploy. The hashed assets themselves are safe to cache, so only html opts out.
  if (type.startsWith('text/html')) res.setHeader('cache-control', 'no-cache');

  const range = parseRange(req.headers.range, size);
  if (range === 'unsatisfiable') {
    res.writeHead(416, { 'content-range': `bytes */${size}`, 'content-length': 0 });
    res.end();
    return;
  }
  const start = range ? range.start : 0;
  const end = range ? range.end : size - 1;
  const length = size === 0 ? 0 : end - start + 1;
  if (range) res.setHeader('content-range', `bytes ${start}-${end}/${size}`);
  res.setHeader('content-length', length);
  res.writeHead(range ? 206 : 200);
  if (req.method === 'HEAD' || length === 0) {
    res.end();
    return;
  }
  const stream = createReadStream(filePath, { start, end });
  // A seeking player or a closed tab aborts mid-stream. Without both of these the ECONNRESET
  // arrives as an unhandled stream 'error' and kills the whole process — one leaving player would
  // take the server down for everyone.
  stream.on('error', () => {
    res.destroy();
  });
  res.on('close', () => {
    stream.destroy();
  });
  stream.pipe(res);
}

async function serve(
  req: IncomingMessage,
  res: ServerResponse,
  target: string,
  indexPath: string,
  hasExtension: boolean,
): Promise<void> {
  try {
    const info = await stat(target);
    if (info.isFile()) {
      sendFile(req, res, target, info.size);
      return;
    }
  } catch {
    /* miss — fall through to the gated SPA decision */
  }
  // THE SPA FALLBACK IS GATED ON THE EXTENSION. Falling back to index.html on every miss is how a
  // missing .webm becomes a 200 text/html inside a <video>: nothing throws, nothing logs, and the
  // fighter renders a still forever (AGENTS.md, clip lookup). A path that names a file type must 404.
  if (hasExtension) {
    sendText(res, req.method ?? 'GET', 404, 'not found\n');
    return;
  }
  try {
    const info = await stat(indexPath);
    sendFile(req, res, indexPath, info.size);
  } catch {
    sendText(res, req.method ?? 'GET', 404, 'not found\n');
  }
}

/** The bare request handler, exported so it can be tested without binding a port. */
export function createStandoffRequestHandler(distDir: string): (req: IncomingMessage, res: ServerResponse) => void {
  const root = resolve(distDir);
  const indexPath = join(root, 'index.html');

  return (req, res) => {
    const method = req.method ?? 'GET';
    if (method !== 'GET' && method !== 'HEAD') {
      res.setHeader('allow', 'GET, HEAD');
      sendText(res, method, 405, 'method not allowed\n');
      return;
    }
    let pathname: string;
    try {
      // The WHATWG parser strips the query/hash and removes dot segments (including their '%2e'
      // spellings). decodeURIComponent then turns '%2f'/'%5c' back into separators — which is
      // exactly the traversal the resolve-guard below exists for, so it must happen BEFORE the
      // guard or the guard inspects a path the filesystem will never see.
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://standoff.invalid').pathname);
    } catch {
      sendText(res, method, 400, 'bad request\n');
      return;
    }
    const rel = pathname.replace(/^[/\\]+/, '');
    const target = rel === '' ? indexPath : resolve(root, rel);
    // A bare startsWith(root) is WRONG: '<root>-old/leak.json' starts with root and is a SIBLING
    // directory. The separator — or exact equality with root — is the entire guard.
    if (target !== root && !target.startsWith(root + sep)) {
      sendText(res, method, 403, 'forbidden\n');
      return;
    }
    void serve(req, res, target, indexPath, extname(pathname) !== '');
  };
}

/**
 * Build the production server: dist over HTTP plus the VS FRIEND relay on the same port, attached
 * exactly the way vite.config.ts:13 does. `teardown` is idempotent: it detaches the relay, closes
 * the listener and drops live sockets (a websocket never goes idle, so `close()` alone would hang).
 */
export function createStandoffServer(
  distDir: string,
  attachRelay: AttachRelay,
): { server: HttpServer; teardown: () => void } {
  const server = createServer(createStandoffRequestHandler(distDir));
  const detachRelay = attachRelay(server);
  let tornDown = false;
  return {
    server,
    teardown: () => {
      if (tornDown) return;
      tornDown = true;
      detachRelay();
      if (server.listening) server.close();
      server.closeAllConnections();
    },
  };
}
