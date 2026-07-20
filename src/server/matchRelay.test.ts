// Exercises the REAL relay: a live http.Server + attachMatchRelay, driven by real `ws` clients.
// No mocks — the room logic runs exactly as it does under Vite. The reconnect grace window is
// injected tiny (TEST_GRACE_MS) so grace-expiry tests run fast.
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { WebSocket } from 'ws';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { attachMatchRelay, MATCH_RELAY_PATH } from './matchRelay';

const TEST_GRACE_MS = 150;

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

async function createRoom(): Promise<{ ws: WebSocket; inbox: Inbox; code: string; token: string }> {
  const ws = await connect();
  const inbox = new Inbox(ws);
  send(ws, { t: 'create' });
  const room = await inbox.waitFor((m) => m.t === 'room');
  return { ws, inbox, code: room.code as string, token: room.token as string };
}

// Create + join: a fully paired room with both inboxes drained past the pairing frames.
async function pairedRoom(): Promise<{
  code: string;
  a: { ws: WebSocket; inbox: Inbox; token: string };
  b: { ws: WebSocket; inbox: Inbox; token: string };
}> {
  const { ws: aWs, inbox: inA, code, token: aToken } = await createRoom();
  const bWs = await connect();
  const inB = new Inbox(bWs);
  send(bWs, { t: 'join', code });
  const joined = await inB.waitFor((m) => m.t === 'joined' || m.t === 'joinFail');
  expect(joined.t).toBe('joined');
  await inA.waitFor((m) => m.t === 'peer');
  await inB.waitFor((m) => m.t === 'peer');
  return {
    code,
    a: { ws: aWs, inbox: inA, token: aToken },
    b: { ws: bWs, inbox: inB, token: joined.token as string },
  };
}

beforeEach(async () => {
  server = createServer();
  teardown = attachMatchRelay(server, { graceMs: TEST_GRACE_MS });
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
  it('create returns an FRZxxx room code and a resume token', async () => {
    const { code, token } = await createRoom();
    expect(code).toMatch(/^FRZ[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{3}$/);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  it('join with an unknown code returns joinFail', async () => {
    const ws = await connect();
    const inbox = new Inbox(ws);
    send(ws, { t: 'join', code: 'FRZZZZ' });
    const res = await inbox.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(res.t).toBe('joinFail');
  });

  it('a valid join pairs the room: joined carries a token, both sides get peer:true', async () => {
    const { b } = await pairedRoom();
    expect(typeof b.token).toBe('string');
    expect(b.token.length).toBeGreaterThan(0);
  });

  it('relays a pick to the peer with the exchange index intact', async () => {
    const { a, b } = await pairedRoom();
    send(a.ws, { t: 'pick', exchange: 4, move: 'throw' });
    const pick = await b.inbox.waitFor((m) => m.t === 'pick');
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
    const { code } = await pairedRoom();
    const c = await connect();
    const inC = new Inbox(c);
    send(c, { t: 'join', code });
    const res = await inC.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(res.t).toBe('joinFail');
  });

  it('an unpaired room (creator waiting alone) still dies immediately on close', async () => {
    const { code, ws: a } = await createRoom();
    a.close();
    await new Promise((res) => setTimeout(res, 50));
    const b = await connect();
    const inB = new Inbox(b);
    send(b, { t: 'join', code });
    const res = await inB.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(res.t).toBe('joinFail');
  });

  it('a paired member close does NOT drop the room: survivor gets peerLost with graceMs', async () => {
    const { a, b } = await pairedRoom();
    b.ws.close();
    const lost = await a.inbox.waitFor((m) => m.t === 'peerLost');
    expect(lost.graceMs).toBe(TEST_GRACE_MS);
  });

  it('resume with the token rebinds the member, notifies peerBack, and flushes buffered picks in order', async () => {
    const { code, a, b } = await pairedRoom();
    b.ws.close();
    await a.inbox.waitFor((m) => m.t === 'peerLost');

    // Picks relayed toward the absent member during the gap must buffer in order.
    send(a.ws, { t: 'pick', exchange: 0, move: 'strike' });
    send(a.ws, { t: 'pick', exchange: 1, move: 'block' });

    const b2 = await connect();
    const inB2 = new Inbox(b2);
    send(b2, { t: 'resume', code, token: b.token });
    const resumed = await inB2.waitFor((m) => m.t === 'resumed' || m.t === 'resumeFail');
    expect(resumed.t).toBe('resumed');

    const pick0 = await inB2.waitFor((m) => m.t === 'pick');
    const pick1 = await inB2.waitFor((m) => m.t === 'pick');
    expect([pick0.move, pick0.exchange]).toEqual(['strike', 0]);
    expect([pick1.move, pick1.exchange]).toEqual(['block', 1]);

    const back = await a.inbox.waitFor((m) => m.t === 'peerBack');
    expect(back.t).toBe('peerBack');
  });

  it('resume with a bad token gets resumeFail (room stays resumable with the real token)', async () => {
    const { code, a, b } = await pairedRoom();
    b.ws.close();
    await a.inbox.waitFor((m) => m.t === 'peerLost');

    const intruder = await connect();
    const inIntruder = new Inbox(intruder);
    send(intruder, { t: 'resume', code, token: 'not-the-token' });
    const res = await inIntruder.waitFor((m) => m.t === 'resumeFail' || m.t === 'resumed');
    expect(res.t).toBe('resumeFail');

    // The real token still works: the bad attempt must not have burned the room.
    const b2 = await connect();
    const inB2 = new Inbox(b2);
    send(b2, { t: 'resume', code, token: b.token });
    const resumed = await inB2.waitFor((m) => m.t === 'resumed' || m.t === 'resumeFail');
    expect(resumed.t).toBe('resumed');
  });

  it('grace expiry sends the survivor peerGone and kills the room (resume and join then fail)', async () => {
    const { code, a, b } = await pairedRoom();
    b.ws.close();
    await a.inbox.waitFor((m) => m.t === 'peerLost');

    // Let the grace window lapse: the survivor's client takes over with auto-play.
    const gone = await a.inbox.waitFor((m) => m.t === 'peerGone');
    expect(gone.t).toBe('peerGone');

    // The room is gone: the leaver can neither resume nor can anyone join the code.
    const b2 = await connect();
    const inB2 = new Inbox(b2);
    send(b2, { t: 'resume', code, token: b.token });
    const res = await inB2.waitFor((m) => m.t === 'resumeFail' || m.t === 'resumed');
    expect(res.t).toBe('resumeFail');

    const c = await connect();
    const inC = new Inbox(c);
    send(c, { t: 'join', code });
    const joinRes = await inC.waitFor((m) => m.t === 'joinFail' || m.t === 'joined');
    expect(joinRes.t).toBe('joinFail');
  });
});
