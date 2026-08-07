// Exercises the PRODUCTION entry's HTTP layer: a real server built by createStandoffServer over a
// throwaway fixture dist, with the REAL relay attached. The 19 matchRelay tests attach the relay to
// their own bare http.createServer and hand the transport an explicit ws:// url, so they prove the
// room LOGIC and nothing about the wiring, the static serving or the SPA fallback — this file is
// the other half.
//
// Requests go through raw http.request, NOT fetch: undici normalises '/../package.json' to
// '/package.json' client-side, so a fetch-based traversal probe tests nothing at all and passes.
//
// The fixture is built in a tmp dir on purpose. The real dist is 258MB and depends on a build
// having been run; a test that needs either is a test that gets skipped.
import { request, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachMatchRelay, MATCH_RELAY_PATH } from './matchRelay';
import { createStandoffServer } from './staticServer';
import { MATCH_RELAY_PATH as CLIENT_MATCH_RELAY_PATH } from '../transport/matchTransport';

const INDEX_HTML = '<!doctype html><html><head><title>STANDOFF fixture</title></head><body><div id="app"></div></body></html>\n';
const APP_JS = 'export const standoff = 1;\n';
// 256 bytes where byte i === i, so any range assertion is checkable by value, not just by length.
const CLIP = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
const SECRET_ABOVE_DIST = '{"secret":"this file lives ABOVE dist"}\n';
const SIBLING_LEAK = '{"secret":"sibling dir whose name starts with the root name"}\n';

let baseDir: string;
let distDir: string;
let server: Server;
let teardown: () => void;
let port: number;
const clients: WebSocket[] = [];

interface RawResponse {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

function raw(path: string, opts: { method?: string; headers?: Record<string, string> } = {}): Promise<RawResponse> {
  return new Promise((res, rej) => {
    // agent:false — no keep-alive pool, so teardown never waits on a socket this test opened.
    const req = request(
      { host: '127.0.0.1', port, path, method: opts.method ?? 'GET', headers: opts.headers, agent: false },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (c: Buffer) => chunks.push(c));
        response.on('end', () =>
          res({ status: response.statusCode ?? 0, headers: response.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('error', rej);
    req.end();
  });
}

beforeEach(async () => {
  // baseDir/dist        <- what we serve
  // baseDir/secret.json <- must never be reachable
  // baseDir/dist-old/   <- the sibling a bare startsWith(root) would admit
  baseDir = await mkdtemp(join(tmpdir(), 'standoff-srv-'));
  distDir = join(baseDir, 'dist');
  await mkdir(join(distDir, 'assets'), { recursive: true });
  await mkdir(join(baseDir, 'dist-old'), { recursive: true });
  await writeFile(join(distDir, 'index.html'), INDEX_HTML);
  await writeFile(join(distDir, 'assets', 'index-TEST1234.js'), APP_JS);
  await writeFile(join(distDir, 'assets', 'clip.webm'), CLIP);
  await writeFile(join(baseDir, 'secret.json'), SECRET_ABOVE_DIST);
  await writeFile(join(baseDir, 'dist-old', 'leak.json'), SIBLING_LEAK);

  const created = createStandoffServer(distDir, attachMatchRelay);
  server = created.server;
  teardown = created.teardown;
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', () => res()));
  port = (server.address() as AddressInfo).port;
});

afterEach(async () => {
  for (const c of clients) {
    try {
      c.close();
    } catch {
      /* ignore */
    }
  }
  clients.length = 0;
  const closed = new Promise<void>((res) => server.once('close', () => res()));
  teardown();
  await closed;
  await rm(baseDir, { recursive: true, force: true });
});

describe('createStandoffServer — static serving', () => {
  it('GET / serves the index.html bytes as html and advertises range support', async () => {
    const res = await raw('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.headers['accept-ranges']).toBe('bytes');
    expect(res.body.toString()).toBe(INDEX_HTML);
  });

  it('GET a hashed bundle serves it as text/javascript', async () => {
    const res = await raw('/assets/index-TEST1234.js');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/javascript');
    expect(res.body.toString()).toBe(APP_JS);
  });

  it('an extensionless deep route falls back to index.html', async () => {
    const res = await raw('/deep/spa/route');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body.toString()).toBe(INDEX_HTML);
  });

  // THE REGRESSION GUARD. An ungated SPA fallback answers a missing clip with 200 text/html, the
  // <video> mounts nothing, and the fighter renders a still forever with no error anywhere.
  it('a MISSING file WITH an extension is a 404 — never a 200 index.html', async () => {
    const res = await raw('/assets/missing.webm');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).not.toContain('text/html');
    expect(res.body.toString()).not.toContain('<div id="app">');
  });

  it('an unknown extension falls back to application/octet-stream, not html', async () => {
    await writeFile(join(distDir, 'assets', 'thing.bin'), Buffer.from([1, 2, 3]));
    const res = await raw('/assets/thing.bin');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/octet-stream');
  });

  it('HEAD returns the headers with no body', async () => {
    const res = await raw('/assets/clip.webm', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('video/webm');
    expect(res.headers['content-length']).toBe('256');
    expect(res.body.length).toBe(0);
  });

  it('a method other than GET/HEAD is 405 with an Allow header', async () => {
    const res = await raw('/', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers['allow']).toBe('GET, HEAD');
  });
});

describe('createStandoffServer — path traversal', () => {
  // Every spelling must fail. '/../secret.json' is collapsed by the URL parser before we ever see
  // it; '/..%2fsecret.json' survives the parser and is what actually reaches the resolve-guard.
  const escapes = ['/../secret.json', '/%2e%2e/secret.json', '/..%2fsecret.json', '/..%5csecret.json'];
  for (const path of escapes) {
    it(`never leaks a file above dist: ${path}`, async () => {
      const res = await raw(path);
      expect([403, 404]).toContain(res.status);
      expect(res.body.toString()).not.toContain('lives ABOVE dist');
    });
  }

  // The case a bare startsWith(root) admits: a SIBLING directory whose name begins with the root's.
  it('never leaks a sibling directory whose name merely starts with the root name', async () => {
    const res = await raw('/..%2fdist-old%2fleak.json');
    expect([403, 404]).toContain(res.status);
    expect(res.body.toString()).not.toContain('sibling dir');
  });
});

describe('createStandoffServer — range requests', () => {
  it('bytes=0-99 is a 206 with the right Content-Range and the right bytes', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'bytes=0-99' } });
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 0-99/256');
    expect(res.headers['content-length']).toBe('100');
    expect(res.body.length).toBe(100);
    expect(res.body[0]).toBe(0);
    expect(res.body[99]).toBe(99);
  });

  it('open-ended bytes=100- runs to the end of the entity', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'bytes=100-' } });
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 100-255/256');
    expect(res.body.length).toBe(156);
    expect(res.body[0]).toBe(100);
    expect(res.body[155]).toBe(255);
  });

  it('suffix bytes=-10 returns the last ten bytes', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'bytes=-10' } });
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 246-255/256');
    expect(res.body.length).toBe(10);
    expect(res.body[0]).toBe(246);
  });

  it('an end past the entity clamps instead of failing', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'bytes=250-999' } });
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 250-255/256');
    expect(res.body.length).toBe(6);
  });

  it('a multi-range request is answered with the full 200 body (spec-legal)', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'bytes=0-1,5-6' } });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(256);
  });

  it('an unsatisfiable range is 416 with Content-Range: bytes */size', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'bytes=999-1200' } });
    expect(res.status).toBe(416);
    expect(res.headers['content-range']).toBe('bytes */256');
    expect(res.body.length).toBe(0);
  });

  it('a malformed range header is ignored and the full 200 is served', async () => {
    const res = await raw('/assets/clip.webm', { headers: { Range: 'octets=0-99' } });
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(256);
  });
});

describe('createStandoffServer — the relay rides the same server', () => {
  // The whole point of the change: without this the suite proves the static server works and says
  // nothing about whether a deployed dist can open a room.
  it('a real ws client connects to /fr-ws on THIS server and gets a room code', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}${MATCH_RELAY_PATH}`);
    clients.push(ws);
    await new Promise<void>((res, rej) => {
      ws.once('open', () => res());
      ws.once('error', rej);
    });
    const first = new Promise<Record<string, unknown>>((res) => {
      ws.once('message', (data: Buffer) => res(JSON.parse(data.toString()) as Record<string, unknown>));
    });
    ws.send(JSON.stringify({ t: 'create' }));
    const msg = await first;
    expect(msg.t).toBe('room');
    expect(msg.code).toMatch(/^FRZ[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}$/);
    expect(typeof msg.token).toBe('string');
  });

  // Two independent literals with no test between them: changing one breaks production while all
  // the relay tests stay green, because they inject their own url.
  it('the server and the client transport agree on the relay path', () => {
    expect(CLIENT_MATCH_RELAY_PATH).toBe(MATCH_RELAY_PATH);
  });
});
