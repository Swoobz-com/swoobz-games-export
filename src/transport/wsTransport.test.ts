// WsTransport driven against the REAL relay server (no mocks). The transport is given an explicit
// url (node has no `location`), so importing the module never touches a browser global.
import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Move } from '../engine/fightEngine';
import { attachMatchRelay, MATCH_RELAY_PATH } from '../server/matchRelay';
import { WsTransport } from './matchTransport';

let server: Server;
let teardown: () => void;
let url: string;
const transports: WsTransport[] = [];

function make(connectTimeoutMs?: number): WsTransport {
  const t = new WsTransport(url, connectTimeoutMs);
  transports.push(t);
  return t;
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
  teardown();
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
    // RIVAL DISCONNECTED + refund while the peer stayed locked in the fight. A short injected
    // timeout (100ms) makes the stale timer window testable fast.
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
    host.sendProfile('volta');
    const code = await codePromise;

    const guest = make();
    let opponentProfile: string | null = null;
    guest.onOpponentProfile((id) => {
      opponentProfile = id;
    });
    await guest.join(code);
    await waitUntil(() => opponentProfile !== null);
    expect(opponentProfile).toBe('volta');
  });
});
