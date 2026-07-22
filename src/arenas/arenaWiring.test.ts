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

  it('the cathedral stays the first / default arena', () => {
    expect(ARENAS[0].id).toBe('cathedral');
    // getArena falls back to the first entry for an unknown id — that fallback must be cathedral.
    expect(getArena('no-such-arena').id).toBe('cathedral');
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

// Phase 22: the 10 non-cathedral arenas gained ambient video loops (assets/arenas/<id>-loop.mp4),
// layered under the fight as living backgrounds. The cathedral (baked-HUD default) stays loop-less.
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

  it('the 10 non-cathedral arenas each have a loop; cathedral has none', () => {
    for (const id of LOOPED) {
      const loop = getArena(id).loop;
      expect(loop, `${id} loop`).toBe(`assets/arenas/${id}-loop.mp4`);
    }
    expect(getArena('cathedral').loop).toBeUndefined();
  });

  it('exactly the 10 expected ids carry a loop (no more, no fewer)', () => {
    const withLoop = ARENAS.filter((a) => a.loop !== undefined).map((a) => a.id).sort();
    expect(withLoop).toEqual([...LOOPED].sort());
  });
});
