// The VS FRIEND seam. Two implementations sit behind one interface:
//   - LocalSimTransport: the CPU-less mockup opponent (a fake remote with human-like delays).
//     NOTE: friend mode no longer uses this at runtime; it survives for tests/sim injection.
//   - WsTransport: the REAL relay client — one WebSocket to the dev/preview server's /fr-ws
//     room relay (src/server/matchRelay.ts), with auto-reconnect + resume inside the server's
//     grace window. Neither the engine nor the provider changes shape for CPU mode.

import type { Move } from '../engine/fightEngine';
import { mulberry32, randomMove } from '../engine/fightEngine';

/**
 * Match lifecycle events beyond pairing (the reconnect-grace / auto-play layer):
 * - 'peerLost': the opponent's socket dropped; the server holds the room open for grace.
 * - 'peerBack': the opponent resumed within grace (or OUR own dropped socket resumed).
 * - 'peerGone': the opponent is unreachable for good — either the server's grace expired on
 *   them, or OUR own reconnect attempts were exhausted/rejected (symmetric: from this client's
 *   view the opponent cannot be reached either way). The provider then finishes the match by
 *   auto-playing the absent player's picks; it never settles early.
 */
export type MatchEvent = 'peerLost' | 'peerBack' | 'peerGone';

export interface MatchTransport {
  createRoom(): Promise<string>;
  join(code: string): Promise<boolean>;
  sendPick(move: Move, exchange: number): void;
  onOpponentPick(cb: (move: Move, exchange: number) => void): () => void;
  sendProfile(fighterId: string): void;
  onOpponentProfile(cb: (fighterId: string) => void): () => void;
  onPresence(cb: (connected: boolean) => void): () => void;
  onMatchEvent(cb: (ev: MatchEvent) => void): () => void;
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

  // The simulated opponent never drops, resumes, or goes away.
  onMatchEvent(_cb: (ev: MatchEvent) => void): () => void {
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
// Auto-reconnect (resume) after an unexpected socket drop while roomed: retry cadence and the
// total budget before giving up ('peerGone': auto-play). Mirrors the server's RECONNECT_GRACE_MS.
const RECONNECT_RETRY_MS = 1000;
const RECONNECT_GRACE_MS = 10000;

// Derived lazily (INSIDE the ctor, only when no url is injected) so importing this module in a
// node test never touches `location`.
function defaultRelayUrl(): string {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}${MATCH_RELAY_PATH}`;
}

interface RelayMessage {
  t?: string;
  code?: string;
  token?: string;
  exchange?: number;
  move?: Move;
  fighterId?: string;
  connected?: boolean;
}

export class WsTransport implements MatchTransport {
  private url: string;
  private connectTimeoutMs: number;
  private reconnectRetryMs: number;
  private reconnectGraceMs: number;

  private ws: WebSocket | null = null;
  private open = false;
  private disposed = false;
  private sendQueue: string[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];

  // Room identity for resume: issued by the server at create ({t:'room',code,token}) / join
  // ({t:'joined',token}). Cleared on peerGone / failed resume / dispose.
  private roomCode: string | null = null;
  private token: string | null = null;
  private pendingJoinCode: string | null = null;

  // Reconnect state. Every reconnect timer lives in a NAMED field, is cleared on settle/dispose,
  // and its callback is guarded (phase-13 timer law: a settled path can never fire later).
  private reconnecting = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;

  private pickListeners: Array<(move: Move, exchange: number) => void> = [];
  private presenceListeners: Array<(connected: boolean) => void> = [];
  private profileListeners: Array<(fighterId: string) => void> = [];
  private matchEventListeners: Array<(ev: MatchEvent) => void> = [];

  private pendingCreate: ((code: string) => void) | null = null;
  private pendingJoin: ((ok: boolean) => void) | null = null;

  // All params exist for node tests: `url` because node has no `location`; the three timings so
  // timeout/reconnect paths are testable without multi-second waits. Runtime uses the defaults.
  constructor(
    url?: string,
    connectTimeoutMs: number = CONNECT_TIMEOUT_MS,
    reconnectRetryMs: number = RECONNECT_RETRY_MS,
    reconnectGraceMs: number = RECONNECT_GRACE_MS,
  ) {
    this.url = url ?? defaultRelayUrl();
    this.connectTimeoutMs = connectTimeoutMs;
    this.reconnectRetryMs = reconnectRetryMs;
    this.reconnectGraceMs = reconnectGraceMs;
  }

  private emitPresence(connected: boolean): void {
    for (const cb of this.presenceListeners) cb(connected);
  }

  private emitMatchEvent(ev: MatchEvent): void {
    for (const cb of this.matchEventListeners) cb(ev);
  }

  private ensureSocket(): WebSocket {
    if (this.ws) return this.ws;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.addEventListener('open', () => {
      if (ws !== this.ws || this.disposed) return;
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
      if (ws !== this.ws) return; // stale socket (already replaced)
      this.open = false;
      // Unexpected drop while roomed: try to resume within the server's grace window. A close
      // after dispose, or before we ever had a room, reconnects nothing.
      if (!this.disposed && this.roomCode !== null && this.token !== null && !this.reconnecting) {
        this.startReconnect();
      }
    });
    ws.addEventListener('error', () => {
      // Connection-level failure. Any in-flight create/join resolves to failure; a live match
      // learns of a dropped peer via the grace events ('peerLost'/'peerGone'), never this event.
      this.pendingCreate?.('');
      this.pendingCreate = null;
      this.pendingJoin?.(false);
      this.pendingJoin = null;
      this.emitPresence(false);
    });
    return ws;
  }

  // ── Auto-reconnect (resume) ──────────────────────────────────────────────────────────
  private startReconnect(): void {
    this.reconnecting = true;
    // Overall budget: when it expires we give up (peerGone). Cleared on success/dispose;
    // callback guarded by the reconnecting flag inside failReconnect.
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      this.failReconnect();
    }, this.reconnectGraceMs);
    this.attemptResume();
  }

  private attemptResume(): void {
    if (this.disposed || !this.reconnecting || this.roomCode === null || this.token === null) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    this.open = false;
    ws.addEventListener('open', () => {
      if (ws !== this.ws || this.disposed || !this.reconnecting) return;
      // Resume FIRST; queued gameplay frames flush only after {t:'resumed'} so the server has
      // rebound this socket to the room before any of them arrive.
      ws.send(JSON.stringify({ t: 'resume', code: this.roomCode, token: this.token }));
    });
    ws.addEventListener('message', (ev: MessageEvent) => {
      const raw = typeof ev.data === 'string' ? ev.data : String(ev.data);
      this.onMessage(raw);
    });
    ws.addEventListener('close', () => {
      if (ws !== this.ws || this.disposed || !this.reconnecting) return;
      this.open = false;
      // Attempt failed: retry after the cadence delay (guarded; cleared on settle/dispose).
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        if (this.disposed || !this.reconnecting) return;
        this.attemptResume();
      }, this.reconnectRetryMs);
    });
    ws.addEventListener('error', () => {
      /* the 'close' that follows drives the retry */
    });
  }

  private clearReconnectTimers(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.graceTimer !== null) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
  }

  private finishResume(): void {
    if (!this.reconnecting) return;
    this.reconnecting = false;
    this.clearReconnectTimers();
    this.open = true;
    const ws = this.ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const queued = this.sendQueue;
      this.sendQueue = [];
      for (const frame of queued) ws.send(frame);
    }
    // Our side of the link is whole again (mirrors the peer's 'peerBack').
    this.emitMatchEvent('peerBack');
  }

  private failReconnect(): void {
    if (!this.reconnecting) return;
    this.reconnecting = false;
    this.clearReconnectTimers();
    const wasRoomed = this.roomCode !== null && this.token !== null;
    this.roomCode = null;
    this.token = null;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* already closing */
      }
    }
    if (wasRoomed && !this.disposed) {
      // Symmetric peerGone: we cannot reach the room anymore, so from this client's view the
      // opponent is unreachable — auto-play takes over exactly as on the survivor's side.
      this.emitMatchEvent('peerGone');
    }
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
        this.roomCode = msg.code ?? null;
        this.token = msg.token ?? null;
        this.pendingCreate?.(msg.code ?? '');
        this.pendingCreate = null;
        break;
      case 'joined':
        this.roomCode = this.pendingJoinCode;
        this.token = msg.token ?? null;
        this.pendingJoinCode = null;
        this.pendingJoin?.(true);
        this.pendingJoin = null;
        break;
      case 'joinFail':
        this.pendingJoinCode = null;
        this.pendingJoin?.(false);
        this.pendingJoin = null;
        break;
      case 'peer':
        this.emitPresence(Boolean(msg.connected));
        break;
      case 'peerLost':
        this.emitMatchEvent('peerLost');
        break;
      case 'peerBack':
        this.emitMatchEvent('peerBack');
        break;
      case 'peerGone':
        // The room is gone server-side: forget it so a later socket drop never tries to resume.
        this.roomCode = null;
        this.token = null;
        this.emitMatchEvent('peerGone');
        break;
      case 'resumed':
        this.finishResume();
        break;
      case 'resumeFail':
        this.failReconnect();
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
      this.pendingJoinCode = code;
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

  onMatchEvent(cb: (ev: MatchEvent) => void): () => void {
    this.matchEventListeners.push(cb);
    return () => {
      this.matchEventListeners = this.matchEventListeners.filter((l) => l !== cb);
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
    this.reconnecting = false;
    this.clearReconnectTimers();
    for (const handle of this.timers) clearTimeout(handle);
    this.timers = [];
    this.pendingCreate = null;
    this.pendingJoin = null;
    this.pendingJoinCode = null;
    this.roomCode = null;
    this.token = null;
    this.pickListeners = [];
    this.presenceListeners = [];
    this.profileListeners = [];
    this.matchEventListeners = [];
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
