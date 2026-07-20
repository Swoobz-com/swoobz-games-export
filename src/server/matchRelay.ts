// The real VS FRIEND room relay. A tiny WebSocket server embedded in the Vite dev/preview
// HTTP server: two browser tabs create/join a room by code and exchange picks + profiles.
//
// This module owns NO game logic — it is a dumb relay. Picks and profiles are forwarded to
// the peer verbatim; the engine, the provider and the wager math live on the clients. The
// server never inspects a move or a fighter id (identity-agnostic, contract §4).
//
// RECONNECT GRACE (anti rage-quit exploit): when a PAIRED member's socket closes, the room is
// NOT dropped. The survivor is told {t:'peerLost'}, frames toward the absent member are buffered
// in order, and a grace timer starts. The dropped client may {t:'resume'} on a fresh socket with
// the token it was issued at create/join; on success the member is rebound, buffered frames
// flush, and the peer gets {t:'peerBack'}. If grace expires the survivor gets {t:'peerGone'} and
// the room dies — the survivor's CLIENT then finishes the match by AUTO-PLAYING the absent
// player's picks (uniform random, Nash-neutral) to a natural KO end. No forfeit settle, no
// refunds mid-match. An UNPAIRED room (creator alone, waiting) still dies immediately on close.
// If BOTH members are gone the room dies and nobody settles (both fled, both lose their stake).
//
// MONEY NOTE (Tim's accepted trade-off, on record): if the auto-played ghost WINS the finished
// match, the survivor loses their stake and the pot goes uncollected — the leaver's tab is gone
// and its bank already persisted commit-minus-stake. Money can evaporate in that path, but a
// disconnector can never PROFIT from leaving.
//
// It shares the HTTP server with Vite's HMR websocket, so it uses `noServer: true` and its OWN
// `upgrade` listener that handles ONLY the '/fr-ws' path and leaves every other upgrade (Vite's
// HMR socket included) untouched — it never calls socket.destroy() on a request it doesn't own.

import type { Server as HttpServer } from 'http';
import type { Socket } from 'net';
import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export const MATCH_RELAY_PATH = '/fr-ws';
/** How long a dropped paired member may reconnect before the survivor's client takes over the
 *  absent player's picks (auto-play to the match's natural end). */
export const RECONNECT_GRACE_MS = 10000;

const ROOM_CODE_PREFIX = 'FRZ';
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_SUFFIX_LEN = 3;

type Move = 'strike' | 'throw' | 'block';

export interface MatchRelayOptions {
  /** Reconnect grace window override (tests use a tiny value). Default RECONNECT_GRACE_MS. */
  graceMs?: number;
}

// One member of a room: its (rebindable) socket, the resume token issued at create/join, whether
// it is currently connected, a profile buffered until the room is paired, and the ordered frames
// relayed toward it while it was absent.
interface Member {
  ws: WebSocket;
  token: string;
  present: boolean;
  bufferedProfile: string | null;
  outBuffer: string[];
}

interface Room {
  code: string;
  a: Member;
  b: Member | null;
  graceTimer: ReturnType<typeof setTimeout> | null;
}

function randomRoomCode(): string {
  let suffix = '';
  for (let i = 0; i < ROOM_CODE_SUFFIX_LEN; i += 1) {
    suffix += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return ROOM_CODE_PREFIX + suffix;
}

// Resume token. Math.random hex is fine for the mockup (not a security boundary).
function randomToken(): string {
  return Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Attach the match relay to a live HTTP server. Returns an idempotent teardown function that
 * removes the upgrade listener, closes the WebSocketServer, cancels grace timers and drops all
 * rooms. Safe to call once per server (configureServer + configurePreviewServer each get their
 * own httpServer).
 */
export function attachMatchRelay(httpServer: HttpServer, options: MatchRelayOptions = {}): () => void {
  const graceMs = options.graceMs ?? RECONNECT_GRACE_MS;
  const wss = new WebSocketServer({ noServer: true });

  // code -> Room. Also a reverse map socket -> Room so message/close handlers find the room in O(1).
  const rooms = new Map<string, Room>();
  const roomOf = new WeakMap<WebSocket, Room>();

  // The member whose CURRENT socket is `ws` (a stale, already-replaced socket matches nobody).
  const memberFor = (room: Room, ws: WebSocket): Member | null => {
    if (room.a.ws === ws) return room.a;
    if (room.b && room.b.ws === ws) return room.b;
    return null;
  };

  const peerOf = (room: Room, member: Member): Member | null => {
    if (member === room.a) return room.b;
    return room.a;
  };

  const clearGrace = (room: Room): void => {
    if (room.graceTimer !== null) {
      clearTimeout(room.graceTimer);
      room.graceTimer = null;
    }
  };

  const dropRoom = (room: Room): void => {
    clearGrace(room);
    rooms.delete(room.code);
  };

  // Deliver a frame toward a member: live sockets get it now, absent members get it buffered in
  // order and flushed on resume.
  const deliver = (member: Member, payload: unknown): void => {
    const frame = JSON.stringify(payload);
    if (member.present && member.ws.readyState === WebSocket.OPEN) {
      member.ws.send(frame);
    } else {
      member.outBuffer.push(frame);
    }
  };

  const handleCreate = (ws: WebSocket): void => {
    if (roomOf.has(ws)) return; // one room per socket
    let code = randomRoomCode();
    while (rooms.has(code)) code = randomRoomCode();
    const token = randomToken();
    const room: Room = {
      code,
      a: { ws, token, present: true, bufferedProfile: null, outBuffer: [] },
      b: null,
      graceTimer: null,
    };
    rooms.set(code, room);
    roomOf.set(ws, room);
    send(ws, { t: 'room', code, token });
  };

  const handleJoin = (ws: WebSocket, code: unknown): void => {
    if (roomOf.has(ws)) return; // already in a room
    const room = typeof code === 'string' ? rooms.get(code) : undefined;
    if (!room || room.b) {
      send(ws, { t: 'joinFail' });
      return;
    }
    const token = randomToken();
    room.b = { ws, token, present: true, bufferedProfile: null, outBuffer: [] };
    roomOf.set(ws, room);
    send(ws, { t: 'joined', token });
    // Pair both sides, then flush any profile each side buffered before pairing.
    send(room.a.ws, { t: 'peer', connected: true });
    send(room.b.ws, { t: 'peer', connected: true });
    if (room.a.bufferedProfile != null) {
      send(room.b.ws, { t: 'profile', fighterId: room.a.bufferedProfile });
      room.a.bufferedProfile = null;
    }
    if (room.b.bufferedProfile != null) {
      send(room.a.ws, { t: 'profile', fighterId: room.b.bufferedProfile });
      room.b.bufferedProfile = null;
    }
  };

  const handleResume = (ws: WebSocket, code: unknown, token: unknown): void => {
    if (roomOf.has(ws)) return; // socket already bound to a room
    const room = typeof code === 'string' ? rooms.get(code) : undefined;
    if (!room || !room.b || typeof token !== 'string') {
      send(ws, { t: 'resumeFail' });
      return;
    }
    const member = [room.a, room.b].find((m) => m.token === token && !m.present) ?? null;
    if (!member) {
      send(ws, { t: 'resumeFail' });
      return;
    }
    member.ws = ws;
    member.present = true;
    roomOf.set(ws, room);
    clearGrace(room);
    send(ws, { t: 'resumed' });
    // Flush the frames that were relayed toward this member while it was gone, in order.
    for (const frame of member.outBuffer) {
      if (ws.readyState === WebSocket.OPEN) ws.send(frame);
    }
    member.outBuffer = [];
    const peer = peerOf(room, member);
    if (peer) send(peer.ws, { t: 'peerBack' });
  };

  const handlePick = (ws: WebSocket, exchange: unknown, move: unknown): void => {
    const room = roomOf.get(ws);
    if (!room) return;
    const self = memberFor(room, ws);
    if (!self) return;
    const peer = peerOf(room, self);
    if (!peer) return;
    deliver(peer, { t: 'pick', exchange: exchange as number, move: move as Move });
  };

  const handleProfile = (ws: WebSocket, fighterId: unknown): void => {
    const room = roomOf.get(ws);
    if (!room || typeof fighterId !== 'string') return;
    const self = memberFor(room, ws);
    if (!self) return;
    const peer = peerOf(room, self);
    if (peer) {
      deliver(peer, { t: 'profile', fighterId });
    } else {
      // Not paired yet: buffer on this member, delivered on pairing.
      self.bufferedProfile = fighterId;
    }
  };

  const handleClose = (ws: WebSocket): void => {
    const room = roomOf.get(ws);
    roomOf.delete(ws);
    if (!room || !rooms.has(room.code)) return;
    const member = memberFor(room, ws);
    if (!member) return; // stale socket (already replaced by a resume)
    if (!room.b) {
      // Unpaired room: the waiting creator left — the room dies immediately (their client
      // refunds the never-started stake itself).
      dropRoom(room);
      return;
    }
    const peer = peerOf(room, member);
    if (!peer || !peer.present) {
      // Both members gone: the room dies, nobody settles (both fled, both lose their stake).
      dropRoom(room);
      return;
    }
    // Paired member dropped: enter grace instead of dropping the room.
    member.present = false;
    send(peer.ws, { t: 'peerLost', graceMs });
    clearGrace(room);
    room.graceTimer = setTimeout(() => {
      room.graceTimer = null;
      if (!rooms.has(room.code)) return; // room already resolved/torn down
      if (member.present) return; // resumed meanwhile (timer is cleared on resume; belt+braces)
      send(peer.ws, { t: 'peerGone' });
      dropRoom(room);
    }, graceMs);
  };

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data) => {
      let msg: {
        t?: string;
        code?: unknown;
        token?: unknown;
        exchange?: unknown;
        move?: unknown;
        fighterId?: unknown;
      };
      try {
        msg = JSON.parse(typeof data === 'string' ? data : data.toString());
      } catch {
        return; // malformed JSON: ignore the frame
      }
      switch (msg.t) {
        case 'create':
          handleCreate(ws);
          break;
        case 'join':
          handleJoin(ws, msg.code);
          break;
        case 'resume':
          handleResume(ws, msg.code, msg.token);
          break;
        case 'pick':
          handlePick(ws, msg.exchange, msg.move);
          break;
        case 'profile':
          handleProfile(ws, msg.fighterId);
          break;
        default:
          break;
      }
    });
    ws.on('close', () => {
      handleClose(ws);
    });
    ws.on('error', () => {
      /* transport-level error: the 'close' that follows tears the member down */
    });
  });

  const onUpgrade = (req: IncomingMessage, socket: Socket, head: Buffer): void => {
    // Only OUR path. Every other upgrade (Vite HMR included) is left entirely alone — we never
    // touch or destroy it, so the shared server keeps working.
    const path = (req.url ?? '').split('?')[0];
    if (path !== MATCH_RELAY_PATH) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  };
  httpServer.on('upgrade', onUpgrade);

  let tornDown = false;
  return () => {
    if (tornDown) return;
    tornDown = true;
    httpServer.removeListener('upgrade', onUpgrade);
    for (const room of rooms.values()) {
      clearGrace(room);
    }
    for (const client of wss.clients) {
      try {
        client.close();
      } catch {
        /* ignore */
      }
    }
    rooms.clear();
    wss.close();
  };
}
