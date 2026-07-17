// The VS FRIEND seam. A real WebSocket/WebRTC transport can implement this interface
// later without touching the engine or provider. LocalSimTransport is the mockup stand-in:
// a fake remote opponent with human-like response delays.

import type { Move } from '../engine/fightEngine';
import { mulberry32, randomMove } from '../engine/fightEngine';

export interface MatchTransport {
  createRoom(): Promise<string>;
  join(code: string): Promise<boolean>;
  sendPick(move: Move): void;
  onOpponentPick(cb: (move: Move) => void): () => void;
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
  private pickListeners: Array<(move: Move) => void> = [];
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

  sendPick(_move: Move): void {
    const delay = randomInRange(this.rng, OPPONENT_REPLY_MIN_MS, OPPONENT_REPLY_MAX_MS);
    this.schedule(() => {
      const opponentMove = randomMove(this.rng);
      for (const cb of this.pickListeners) {
        cb(opponentMove);
      }
    }, delay);
  }

  onOpponentPick(cb: (move: Move) => void): () => void {
    this.pickListeners.push(cb);
    return () => {
      this.pickListeners = this.pickListeners.filter((l) => l !== cb);
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
