import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARENAS, getArena } from './arenas';
import { CAMPAIGN_NODES } from '../engine/fightCampaign';

// Repo root, resolved from this file (src/arenas/ -> ../../).
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PUBLIC = join(ROOT, 'public');

// Phase 21: Tim's 10 clean per-node arenas are wired into the ARENA registry AND assigned per
// campaign node. This suite pins that wiring (ids unique + exist, node arenas distinct + on disk).
describe('phase-21 arena wiring', () => {
  it('ARENAS ids are all unique', () => {
    const ids = ARENAS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('LANTERN JETTY is the first / default arena, and the cathedral is GONE', () => {
    // FROZEN CATHEDRAL removed (Tim, 2026-08-07). docks inherits first-entry duty.
    expect(ARENAS[0].id).toBe('docks');
    // getArena falls back to the first entry for an unknown id — including the retired 'cathedral',
    // which is what a profile that stored it before the removal will ask for.
    expect(getArena('no-such-arena').id).toBe('docks');
    expect(getArena('cathedral').id).toBe('docks');
    expect(ARENAS.some((a) => a.id === 'cathedral')).toBe(false);
  });

  it('the roster is now a UNIFORM aspect (the cathedral was the only outlier)', () => {
    // Every remaining arena is 2752x1536. This matters because .fr-stage takes the ART's aspect so
    // the background never crops; a second aspect in the list means a second stage shape.
    for (const a of ARENAS) {
      expect(a.width, a.id).toBe(2752);
      expect(a.height, a.id).toBe(1536);
    }
  });

  it('every ARENAS file exists on disk under public/', () => {
    for (const a of ARENAS) {
      const f = join(PUBLIC, a.file);
      expect(existsSync(f), f).toBe(true);
    }
  });

  it('all 10 campaign nodes have DISTINCT arenaIds that exist in ARENAS', () => {
    const nodeArenas = CAMPAIGN_NODES.map((n) => n.arenaId);
    expect(nodeArenas).toHaveLength(10);
    // Distinct across the 10 nodes (each node gets its own arena).
    expect(new Set(nodeArenas).size).toBe(10);
    const known = new Set(ARENAS.map((a) => a.id));
    for (const node of CAMPAIGN_NODES) {
      expect(known.has(node.arenaId), `node ${node.id} arenaId ${node.arenaId}`).toBe(true);
    }
  });

  it('every campaign-node arena webp exists on disk', () => {
    for (const node of CAMPAIGN_NODES) {
      const f = join(PUBLIC, getArena(node.arenaId).file);
      expect(existsSync(f), `node ${node.id} -> ${f}`).toBe(true);
    }
  });
});

// Phase 22: the 10 per-node arenas gained ambient video loops (assets/arenas/<id>-loop.mp4), layered
// under the fight as living backgrounds. Since the cathedral's removal (2026-08-07) that is EVERY
// arena — there is no loop-less entry left.
describe('phase-22 arena loops', () => {
  const LOOPED = ['docks', 'torii', 'bamboo', 'snowfang', 'kawa', 'shrine', 'pagoda', 'gorge', 'moat', 'sanctum'];

  it('every arena with a loop field points at an mp4 that exists on disk', () => {
    for (const a of ARENAS) {
      if (a.loop === undefined) continue;
      expect(a.loop, a.id).toMatch(/^assets\/arenas\/.+-loop\.mp4$/);
      const f = join(PUBLIC, a.loop);
      expect(existsSync(f), f).toBe(true);
    }
  });

  it('EVERY arena has a loop now (no loop-less entry survives the cathedral removal)', () => {
    for (const id of LOOPED) {
      const loop = getArena(id).loop;
      expect(loop, `${id} loop`).toBe(`assets/arenas/${id}-loop.mp4`);
    }
    expect(ARENAS.every((a) => a.loop !== undefined)).toBe(true);
    expect(ARENAS).toHaveLength(LOOPED.length);
  });

  it('exactly the 10 expected ids carry a loop (no more, no fewer)', () => {
    const withLoop = ARENAS.filter((a) => a.loop !== undefined).map((a) => a.id).sort();
    expect(withLoop).toEqual([...LOOPED].sort());
  });
});
