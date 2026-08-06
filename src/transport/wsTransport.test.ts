// WsTransport driven against the REAL relay server (no mocks). The transport is given an explicit
// url (node has no `location`), so importing the module never touches a browser global. Reconnect
// timings are ctor-injected tiny so the grace paths run fast.
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Move } from '../engine/fightEngine';
import { attachMatchRelay, MATCH_RELAY_PATH } from '../server/matchRelay';
import type { MatchEvent } from './matchTransport';
import { WsTransport } from './matchTransport';

let server: Server;
let teardown: () => void;
let url: string;
const transports: WsTransport[] = [];

function make(connectTimeoutMs?: number, reconnectRetryMs?: number, reconnectGraceMs?: number): WsTransport {
  const t = new WsTransport(url, connectTimeoutMs, reconnectRetryMs, reconnectGraceMs);
  transports.push(t);
  return t;
}

// Test-only reach into the private socket: the cleanest way to simulate an unexpected mid-match
// socket drop without touching the transport's public surface.
function killSocket(t: WsTransport): void {
  const ws = (t as unknown as { ws: { close(): void } | null }).ws;
  ws?.close();
}

function waitUntil(pred: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = (): void => {
      if (pred()) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error('waitUntil timed out'));
      setTimeout(tick, 5);
    };
    tick();
  });
}

beforeEach(async () => {
  server = createServer();
  teardown = attachMatchRelay(server);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', () => res()));
  const { port } = server.address() as AddressInfo;
  url = `ws://127.0.0.1:${port}${MATCH_RELAY_PATH}`;
});

afterEach(async () => {
  for (const t of transports) t.dispose();
  transports.length = 0;
  teardown(); // idempotent: some tests tear the relay down themselves
  await new Promise<void>((res) => server.close(() => res()));
});

describe('WsTransport against a live relay', () => {
  it('createRoom yields a code and join succeeds; presence fires on pairing', async () => {
    const host = make();
    let hostPresence = false;
    host.onPresence((c) => {
      if (c) hostPresence = true;
    });
    const code = await host.createRoom();
    expect(code).toMatch(/^FRZ/);

    const guest = make();
    const ok = await guest.join(code);
    expect(ok).toBe(true);
    await waitUntil(() => hostPresence);
  });

  it('join with an unknown code resolves false', async () => {
    const guest = make();
    const ok = await guest.join('FRZZZZ');
    expect(ok).toBe(false);
  });

  it('sendPick(move, exchange) arrives at the peer with the exchange intact', async () => {
    const host = make();
    const code = await host.createRoom();
    const guest = make();

    const received: Array<[Move, number]> = [];
    host.onOpponentPick((move, exchange) => received.push([move, exchange]));
    await guest.join(code);

    guest.sendPick('strike', 3);
    await waitUntil(() => received.length > 0);
    expect(received[0]).toEqual(['strike', 3]);
  });

  it('a successful createRoom never fires a phantom presence(false) after the connect timeout', async () => {
    // Regression: the CONNECT_TIMEOUT_MS timer used to survive a successful create and fire an
    // unguarded emitPresence(false) 5s later, aborting the creator's live match with a fake
    // disconnect. A short injected timeout (100ms) makes the stale timer window testable fast.
    const host = make(100);
    const presenceEvents: boolean[] = [];
    host.onPresence((c) => presenceEvents.push(c));
    const code = await host.createRoom();
    expect(code).toMatch(/^FRZ/);

    // Wait well past the injected connect timeout: no presence(false) may arrive.
    await new Promise((res) => setTimeout(res, 300));
    expect(presenceEvents).not.toContain(false);
  });

  it('a profile sent before the socket is open is queued and delivered on pairing', async () => {
    const host = make();
    // Do NOT await createRoom: send the profile immediately so it is queued before the socket
    // opens (flushed right after the create frame), then buffered server-side until pairing.
    const codePromise = host.createRoom();
    host.sendProfile('gargoyle-spear');
    const code = await codePromise;

    const guest = make();
    let opponentProfile: string | null = null;
    guest.onOpponentProfile((id) => {
      opponentProfile = id;
    });
    await guest.join(code);
    await waitUntil(() => opponentProfile !== null);
    expect(opponentProfile).toBe('gargoyle-spear');
  });

  it('auto-reconnects after an unexpected socket drop: peer sees peerLost then peerBack, and a pick sent during the gap arrives after resume', async () => {
    const host = make();
    const code = await host.createRoom();
    const guest = make();

    const hostEvents: MatchEvent[] = [];
    host.onMatchEvent((ev) => hostEvents.push(ev));
    const guestPicks: Array<[Move, number]> = [];
    guest.onOpponentPick((move, exchange) => guestPicks.push([move, exchange]));

    await guest.join(code);

    // Simulate the guest's connection dropping unexpectedly mid-match.
    killSocket(guest);
    await waitUntil(() => hostEvents.includes('peerLost'));

    // The host keeps playing: this pick lands in the server's buffer toward the absent guest.
    host.sendPick('block', 2);

    // The guest's transport resumes on its own (immediate first attempt) and the buffered pick
    // flushes through to it; the host is told the peer is back.
    await waitUntil(() => hostEvents.includes('peerBack'));
    await waitUntil(() => guestPicks.length > 0);
    expect(guestPicks[0]).toEqual(['block', 2]);
  });

  it('reconnect exhausted (relay gone) fires peerGone', async () => {
    const host = make();
    const code = await host.createRoom();
    // Tight client-side reconnect budget: retry every 50ms, give up after 300ms.
    const guest = make(undefined, 50, 300);
    const guestEvents: MatchEvent[] = [];
    guest.onMatchEvent((ev) => guestEvents.push(ev));
    await guest.join(code);

    // Kill the relay first so every resume attempt fails, then drop the guest's socket.
    teardown();
    killSocket(guest);

    await waitUntil(() => guestEvents.includes('peerGone'), 3000);
    expect(guestEvents).toContain('peerGone');
  });

  it('server grace expiry delivers peerGone to the surviving transport', async () => {
    // A dedicated relay with a tiny grace window so expiry happens fast.
    const localServer = createServer();
    const localTeardown = attachMatchRelay(localServer, { graceMs: 120 });
    await new Promise<void>((res) => localServer.listen(0, '127.0.0.1', () => res()));
    const { port } = localServer.address() as AddressInfo;
    const localUrl = `ws://127.0.0.1:${port}${MATCH_RELAY_PATH}`;
    try {
      const host = new WsTransport(localUrl);
      const guest = new WsTransport(localUrl);
      transports.push(host, guest);

      const hostEvents: MatchEvent[] = [];
      host.onMatchEvent((ev) => hostEvents.push(ev));
      const code = await host.createRoom();
      await guest.join(code);

      // Dispose the guest: its socket closes AND it will never resume — grace must expire.
      guest.dispose();
      await waitUntil(() => hostEvents.includes('peerLost'));
      await waitUntil(() => hostEvents.includes('peerGone'), 3000);
      // The survivor's link was never lost itself: no own-resume 'peerBack' should appear.
      expect(hostEvents).toContain('peerGone');
    } finally {
      localTeardown();
      await new Promise<void>((res) => localServer.close(() => res()));
    }
  });
});
