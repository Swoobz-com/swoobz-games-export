// The VS FRIEND seam. Two implementations sit behind one interface:
//   - LocalSimTransport: the CPU-less mockup opponent (a fake remote with human-like delays).
//     NOTE: friend mode no longer uses this at runtime; it survives for tests/sim injection.
//   - WsTransport: the REAL relay client — one WebSocket to the dev/preview server's /fr-ws
//     room relay (src/server/matchRelay.ts). Neither the engine nor the provider changes.

import type { Move } from '../engine/fightEngine';
import { mulberry32, randomMove } from '../engine/fightEngine';

export interface MatchTransport {
  createRoom(): Promise<string>;
  join(code: string): Promise<boolean>;
  sendPick(move: Move, exchange: number): void;
  onOpponentPick(cb: (move: Move, exchange: number) => void): () => void;
  sendProfile(fighterId: string): void;
  onOpponentProfile(cb: (fighterId: string) => void): () => void;
  onPresence(cb: (connected: boolean) => void): () => void;
  dispose(): void;
}

const ROOM_CODE_PREFIX = 'FRZ';
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_SUFFIX_LEN = 3;

const JOIN_DELAY_MIN_MS = 400;
const JOIN_DELAY_MAX_MS = 900;
const PRESENCE_DELAY_MS = 150;
const OPPONENT_REPLY_MIN_MS = 600;
const OPPONENT_REPLY_MAX_MS = 2200;

function randomInRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randomRoomCode(rng: () => number): string {
  let suffix = '';
  for (let i = 0; i < ROOM_CODE_SUFFIX_LEN; i += 1) {
    const idx = Math.floor(rng() * ROOM_CODE_CHARS.length);
    suffix += ROOM_CODE_CHARS[Math.min(idx, ROOM_CODE_CHARS.length - 1)];
  }
  return ROOM_CODE_PREFIX + suffix;
}

export class LocalSimTransport implements MatchTransport {
  private rng: () => number;
  private pickListeners: Array<(move: Move, exchange: number) => void> = [];
  private presenceListeners: Array<(connected: boolean) => void> = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private disposed = false;

  constructor(seed: number = Date.now() ^ 0x9e3779b9) {
    this.rng = mulberry32(seed);
  }

  private schedule(fn: () => void, ms: number): void {
    const handle = setTimeout(() => {
      if (!this.disposed) {
        fn();
      }
    }, ms);
    this.timers.push(handle);
  }

  private emitPresence(connected: boolean): void {
    for (const cb of this.presenceListeners) {
      cb(connected);
    }
  }

  async createRoom(): Promise<string> {
    const code = randomRoomCode(this.rng);
    this.schedule(() => this.emitPresence(true), PRESENCE_DELAY_MS);
    return code;
  }

  async join(_code: string): Promise<boolean> {
    const delay = randomInRange(this.rng, JOIN_DELAY_MIN_MS, JOIN_DELAY_MAX_MS);
    return new Promise((resolve) => {
      this.schedule(() => {
        this.emitPresence(true);
        resolve(true);
      }, delay);
    });
  }

  // Echo a random reply tagged with the SAME exchange number the caller passed, so the
  // provider's exchange-sequencing buffer matches it to the right round.
  sendPick(_move: Move, exchange: number): void {
    const delay = randomInRange(this.rng, OPPONENT_REPLY_MIN_MS, OPPONENT_REPLY_MAX_MS);
    this.schedule(() => {
      const opponentMove = randomMove(this.rng);
      for (const cb of this.pickListeners) {
        cb(opponentMove, exchange);
      }
    }, delay);
  }

  onOpponentPick(cb: (move: Move, exchange: number) => void): () => void {
    this.pickListeners.push(cb);
    return () => {
      this.pickListeners = this.pickListeners.filter((l) => l !== cb);
    };
  }

  // The sim has no opaque identity to relay.
  sendProfile(_fighterId: string): void {
    /* no-op: the simulated opponent has no profile */
  }

  onOpponentProfile(_cb: (fighterId: string) => void): () => void {
    return () => {
      /* never fires */
    };
  }

  onPresence(cb: (connected: boolean) => void): () => void {
    this.presenceListeners.push(cb);
    return () => {
      this.presenceListeners = this.presenceListeners.filter((l) => l !== cb);
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const handle of this.timers) {
      clearTimeout(handle);
    }
    this.timers = [];
    this.pickListeners = [];
    this.presenceListeners = [];
  }
}

// ── The real relay client ────────────────────────────────────────────────────────────────
export const MATCH_RELAY_PATH = '/fr-ws';
// createRoom/join resolve within this budget no matter what: on socket error or timeout they
// resolve to failure ('' / false) rather than hanging the UI forever.
const CONNECT_TIMEOUT_MS = 5000;

// Derived lazily (INSIDE the ctor, only when no url is injected) so importing this module in a
// node test never touches `location`.
function defaultRelayUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${MATCH_RELAY_PATH}`;
}

interface RelayMessage {
  t?: string;
  code?: string;
  exchange?: number;
  move?: Move;
  fighterId?: string;
  connected?: boolean;
}

export class WsTransport implements MatchTransport {
  private url: string;
  private connectTimeoutMs: number;
  private ws: WebSocket | null = null;
  private open = false;
  private disposed = false;
  private sendQueue: string[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];

  private pickListeners: Array<(move: Move, exchange: number) => void> = [];
  private presenceListeners: Array<(connected: boolean) => void> = [];
  private profileListeners: Array<(fighterId: string) => void> = [];

  private pendingCreate: ((code: string) => void) | null = null;
  private pendingJoin: ((ok: boolean) => void) | null = null;

  // Both params exist for node tests: `url` because node has no `location`, `connectTimeoutMs`
  // so the timeout paths are testable without a 5s wait. Runtime callers use the defaults.
  constructor(url?: string, connectTimeoutMs: number = CONNECT_TIMEOUT_MS) {
    this.url = url ?? defaultRelayUrl();
    this.connectTimeoutMs = connectTimeoutMs;
  }

  private emitPresence(connected: boolean): void {
    for (const cb of this.presenceListeners) cb(connected);
  }

  private ensureSocket(): WebSocket {
    if (this.ws) return this.ws;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.addEventListener('open', () => {
      this.open = true;
      const queued = this.sendQueue;
      this.sendQueue = [];
      for (const frame of queued) ws.send(frame);
    });
    ws.addEventListener('message', (ev: MessageEvent) => {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
      this.onMessage(raw);
    });
    ws.addEventListener('close', () => {
      this.open = false;
    });
    ws.addEventListener('error', () => {
      // Connection-level failure. Any in-flight create/join resolves to failure; a live match
      // learns of a dropped peer via a {t:'peer',connected:false} message, not this event.
      this.pendingCreate?.('');
      this.pendingCreate = null;
      this.pendingJoin?.(false);
      this.pendingJoin = null;
      this.emitPresence(false);
    });
    return ws;
  }

  private onMessage(raw: string): void {
    let msg: RelayMessage;
    try {
      msg = JSON.parse(raw) as RelayMessage;
    } catch {
      return;
    }
    switch (msg.t) {
      case 'room':
        this.pendingCreate?.(msg.code ?? '');
        this.pendingCreate = null;
        break;
      case 'joined':
        this.pendingJoin?.(true);
        this.pendingJoin = null;
        break;
      case 'joinFail':
        this.pendingJoin?.(false);
        this.pendingJoin = null;
        break;
      case 'peer':
        this.emitPresence(Boolean(msg.connected));
        break;
      case 'pick':
        if (msg.move != null && typeof msg.exchange === 'number') {
          for (const cb of this.pickListeners) cb(msg.move, msg.exchange);
        }
        break;
      case 'profile':
        if (typeof msg.fighterId === 'string') {
          for (const cb of this.profileListeners) cb(msg.fighterId);
        }
        break;
      default:
        break;
    }
  }

  private rawSend(frame: string): void {
    if (this.disposed) return;
    const ws = this.ensureSocket();
    if (this.open && ws.readyState === WebSocket.OPEN) {
      ws.send(frame);
    } else {
      this.sendQueue.push(frame);
    }
  }

  createRoom(): Promise<string> {
    return new Promise((resolve) => {
      // The timeout timer is cleared the moment the create settles (success OR failure), and its
      // callback bails if already settled — a resolved createRoom can NEVER emit anything later.
      // (Regression: the stale timer once fired an unguarded presence(false) 5s after a
      // successful create, aborting the creator's live match with a phantom disconnect.)
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const done = (code: string): void => {
        if (settled) return;
        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        resolve(code);
      };
      this.pendingCreate = done;
      this.ensureSocket();
      timer = setTimeout(() => {
        if (settled) return;
        this.emitPresence(false);
        done('');
      }, this.connectTimeoutMs);
      this.timers.push(timer);
      this.rawSend(JSON.stringify({ t: 'create' }));
    });
  }

  join(code: string): Promise<boolean> {
    return new Promise((resolve) => {
      // Same timer hygiene as createRoom: settle clears the timer, the callback bails if settled.
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const done = (ok: boolean): void => {
        if (settled) return;
        settled = true;
        if (timer !== null) {
          clearTimeout(timer);
          timer = null;
        }
        resolve(ok);
      };
      this.pendingJoin = done;
      this.ensureSocket();
      timer = setTimeout(() => {
        if (settled) return;
        done(false);
      }, this.connectTimeoutMs);
      this.timers.push(timer);
      this.rawSend(JSON.stringify({ t: 'join', code }));
    });
  }

  sendPick(move: Move, exchange: number): void {
    this.rawSend(JSON.stringify({ t: 'pick', exchange, move }));
  }

  onOpponentPick(cb: (move: Move, exchange: number) => void): () => void {
    this.pickListeners.push(cb);
    return () => {
      this.pickListeners = this.pickListeners.filter((l) => l !== cb);
    };
  }

  sendProfile(fighterId: string): void {
    this.rawSend(JSON.stringify({ t: 'profile', fighterId }));
  }

  onOpponentProfile(cb: (fighterId: string) => void): () => void {
    this.profileListeners.push(cb);
    return () => {
      this.profileListeners = this.profileListeners.filter((l) => l !== cb);
    };
  }

  onPresence(cb: (connected: boolean) => void): () => void {
    this.presenceListeners.push(cb);
    return () => {
      this.presenceListeners = this.presenceListeners.filter((l) => l !== cb);
    };
  }

  dispose(): void {
    this.disposed = true;
    for (const handle of this.timers) clearTimeout(handle);
    this.timers = [];
    this.pendingCreate = null;
    this.pendingJoin = null;
    this.pickListeners = [];
    this.presenceListeners = [];
    this.profileListeners = [];
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* already closing */
      }
      this.ws = null;
    }
    this.open = false;
    this.sendQueue = [];
  }
}
