// Exercises the REAL relay: a live http.Server + attachMatchRelay, driven by real `ws` clients.
// No mocks — the room logic runs exactly as it does under Vite.
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { WebSocket } from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachMatchRelay, MATCH_RELAY_PATH } from './matchRelay';

let server: Server;
let teardown: () => void;
let baseUrl: string;
const clients: WebSocket[] = [];

// A per-socket message queue: a permanent listener buffers frames so a message arriving between
// two `next()` awaits is never dropped.
class Inbox {
  private queue: Array<Record<string, unknown>> = [];
  private waiters: Array<(m: Record<string, unknown>) => void> = [];
  constructor(ws: WebSocket) {
    ws.on('message', (data: Buffer) => {
      const msg = JSON.parse(data.toString()) as Record<string, unknown>;
      const w = this.waiters.shift();
      if (w) w(msg);
      else this.queue.push(msg);
    });
  }
  private next(): Promise<Record<string, unknown>> {
    const queued = this.queue.shift();
    if (queued) return Promise.resolve(queued);
    return new Promise((res) => this.waiters.push(res));
  }
  async waitFor(pred: (m: Record<string, unknown>) => boolean): Promise<Record<string, unknown>> {
    for (;;) {
      const m = await this.next();
      if (pred(m)) return m;
    }
  }
}

function connect(): Promise<WebSocket> {
  const ws = new WebSocket(baseUrl);
  clients.push(ws);
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

function send(ws: WebSocket, obj: unknown): void {
  ws.send(JSON.stringify(obj));
}

async function createRoom(): Promise<{ ws: WebSocket; inbox: Inbox; code: string }> {
  const ws = await connect();
  const inbox = new Inbox(ws);
  send(ws, { t: 'create' });
  const room = await inbox.waitFor((m) => m.t === 'room');
  return { ws, inbox, code: room.code as string };
}

beforeEach(async () => {
  server = createServer();
  teardown = attachMatchRelay(server);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', () => res()));
  const { port } = server.address() as AddressInfo;
  baseUrl = `ws://127.0.0.1:${port}${MATCH_RELAY_PATH}`;
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
  teardown();
  await new Promise<void>((res) => server.close(() => res()));
});

describe('attachMatchRelay', () => {
  it('create returns an FRZxxx room code', async () => {
    const { code } = await createRoom();
    expect(code).toMatch(/^FRZ[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}$/);
  });

  it('join with an unknown code returns joinFail', async () => {
    const ws = await connect();
    const inbox = new Inbox(ws);
    send(ws, { t: 'join', code: 'FRZZZZ' });
    const res = await inbox.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(res.t).toBe('joinFail');
  });

  it('a valid join pairs the room: both sides get peer:true', async () => {
    const { code, inbox: inA } = await createRoom();
    const b = await connect();
    const inB = new Inbox(b);
    send(b, { t: 'join', code });
    const joined = await inB.waitFor((m) => m.t === 'joined' || m.t === 'joinFail');
    expect(joined.t).toBe('joined');
    const peerA = await inA.waitFor((m) => m.t === 'peer');
    const peerB = await inB.waitFor((m) => m.t === 'peer');
    expect(peerA.connected).toBe(true);
    expect(peerB.connected).toBe(true);
  });

  it('relays a pick to the peer with the exchange index intact', async () => {
    const { code, ws: a, inbox: inA } = await createRoom();
    const b = await connect();
    const inB = new Inbox(b);
    send(b, { t: 'join', code });
    await inB.waitFor((m) => m.t === 'joined');
    await inA.waitFor((m) => m.t === 'peer');
    await inB.waitFor((m) => m.t === 'peer');

    send(a, { t: 'pick', exchange: 4, move: 'throw' });
    const pick = await inB.waitFor((m) => m.t === 'pick');
    expect(pick.move).toBe('throw');
    expect(pick.exchange).toBe(4);
  });

  it('buffers a profile sent before pairing and delivers it on pairing', async () => {
    const { code, ws: a } = await createRoom();
    // Creator announces its fighter BEFORE anyone joins: the server must buffer it.
    send(a, { t: 'profile', fighterId: 'volta' });
    const b = await connect();
    const inB = new Inbox(b);
    send(b, { t: 'join', code });
    const profile = await inB.waitFor((m) => m.t === 'profile');
    expect(profile.fighterId).toBe('volta');
  });

  it('a third client joining a full room gets joinFail', async () => {
    const { code } = await createRoom();
    const b = await connect();
    const inB = new Inbox(b);
    send(b, { t: 'join', code });
    await inB.waitFor((m) => m.t === 'joined');

    const c = await connect();
    const inC = new Inbox(c);
    send(c, { t: 'join', code });
    const res = await inC.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(res.t).toBe('joinFail');
  });

  it('on disconnect the survivor gets peer:false and the room is no longer joinable', async () => {
    const { code, ws: a, inbox: inA } = await createRoom();
    const b = await connect();
    const inB = new Inbox(b);
    send(b, { t: 'join', code });
    await inB.waitFor((m) => m.t === 'joined');
    await inA.waitFor((m) => m.t === 'peer');
    await inB.waitFor((m) => m.t === 'peer');

    a.close();
    const gone = await inB.waitFor((m) => m.t === 'peer');
    expect(gone.connected).toBe(false);

    // Room is dropped: a fresh client cannot join the old code.
    const c = await connect();
    const inC = new Inbox(c);
    send(c, { t: 'join', code });
    const res = await inC.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(res.t).toBe('joinFail');
  });
});
