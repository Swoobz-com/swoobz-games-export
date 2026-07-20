// The real VS FRIEND room relay. A tiny WebSocket server embedded in the Vite dev/preview
// HTTP server: two browser tabs create/join a room by code and exchange picks + profiles.
//
// This module owns NO game logic — it is a dumb relay. Picks and profiles are forwarded to
// the peer verbatim; the engine, the provider and the wager math live on the clients. The
// server never inspects a move or a fighter id (identity-agnostic, contract §4).
//
// It shares the HTTP server with Vite's HMR websocket, so it uses `noServer: true` and its OWN
// `upgrade` listener that handles ONLY the '/fr-ws' path and leaves every other upgrade (Vite's
// HMR socket included) untouched — it never calls socket.destroy() on a request it doesn't own.

import type { Server as HttpServer } from 'http';
import type { Socket } from 'net';
import type { IncomingMessage } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

export const MATCH_RELAY_PATH = '/fr-ws';

const ROOM_CODE_PREFIX = 'FRZ';
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_SUFFIX_LEN = 3;

type Move = 'strike' | 'throw' | 'block';

// One member of a room: its socket plus a profile buffered until the room is paired.
interface Member {
  ws: WebSocket;
  bufferedProfile: string | null;
}

interface Room {
  code: string;
  a: Member;
  b: Member | null;
}

function randomRoomCode(): string {
  let suffix = '';
  for (let i = 0; i < ROOM_CODE_SUFFIX_LEN; i += 1) {
    suffix += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return ROOM_CODE_PREFIX + suffix;
}

function send(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

/**
 * Attach the match relay to a live HTTP server. Returns a teardown function that removes the
 * upgrade listener, closes the WebSocketServer and drops all rooms. Safe to call once per
 * server (configureServer + configurePreviewServer each get their own httpServer).
 */
export function attachMatchRelay(httpServer: HttpServer): () => void {
  const wss = new WebSocketServer({ noServer: true });

  // code -> Room. Also a reverse map socket -> Room so message/close handlers find the room in O(1).
  const rooms = new Map<string, Room>();
  const roomOf = new WeakMap<WebSocket, Room>();

  const peerOf = (room: Room, ws: WebSocket): Member | null => {
    if (room.a.ws === ws) return room.b;
    if (room.b && room.b.ws === ws) return room.a;
    return null;
  };

  const dropRoom = (room: Room, closedBy: WebSocket): void => {
    if (!rooms.has(room.code)) return; // already torn down
    rooms.delete(room.code);
    const survivor = peerOf(room, closedBy);
    if (survivor) {
      send(survivor.ws, { t: 'peer', connected: false });
    }
  };

  const handleCreate = (ws: WebSocket): void => {
    if (roomOf.has(ws)) return; // one room per socket
    let code = randomRoomCode();
    while (rooms.has(code)) code = randomRoomCode();
    const room: Room = { code, a: { ws, bufferedProfile: null }, b: null };
    rooms.set(code, room);
    roomOf.set(ws, room);
    send(ws, { t: 'room', code });
  };

  const handleJoin = (ws: WebSocket, code: unknown): void => {
    if (roomOf.has(ws)) return; // already in a room
    const room = typeof code === 'string' ? rooms.get(code) : undefined;
    if (!room || room.b) {
      send(ws, { t: 'joinFail' });
      return;
    }
    room.b = { ws, bufferedProfile: null };
    roomOf.set(ws, room);
    send(ws, { t: 'joined' });
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

  const handlePick = (ws: WebSocket, exchange: unknown, move: unknown): void => {
    const room = roomOf.get(ws);
    if (!room) return;
    const peer = peerOf(room, ws);
    if (!peer) return;
    send(peer.ws, { t: 'pick', exchange: exchange as number, move: move as Move });
  };

  const handleProfile = (ws: WebSocket, fighterId: unknown): void => {
    const room = roomOf.get(ws);
    if (!room || typeof fighterId !== 'string') return;
    const peer = peerOf(room, ws);
    if (peer) {
      send(peer.ws, { t: 'profile', fighterId });
    } else {
      // Not paired yet: buffer on this member, delivered on pairing.
      const self = room.a.ws === ws ? room.a : room.b && room.b.ws === ws ? room.b : null;
      if (self) self.bufferedProfile = fighterId;
    }
  };

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (data) => {
      let msg: { t?: string; code?: unknown; exchange?: unknown; move?: unknown; fighterId?: unknown };
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
      const room = roomOf.get(ws);
      if (room) dropRoom(room, ws);
      roomOf.delete(ws);
    });
    ws.on('error', () => {
      /* transport-level error: the 'close' that follows tears the room down */
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

  return () => {
    httpServer.removeListener('upgrade', onUpgrade);
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
