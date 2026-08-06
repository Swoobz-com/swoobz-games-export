import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIGHTERS, getFighter } from './index';
import { clipVariants } from './types';
import { isFighterSelectable, bossNodeId } from './rosterGating';
import { CAMPAIGN_NODE_COUNT } from '../engine/fightCampaign';
import type { FighterDef, FighterState } from './types';

// PHASE 282 — the three free-roster fighters wired on Tim's ruling (2026-08-06): they take NO campaign
// node, so they are selectable from a fresh profile alongside gorvak/volta.
//
// This file exists because every defect it guards is SILENT. A clip filed under a state the engine
// never emits, or a url pointing at a file that is not on disk, throws nothing and logs nothing — the
// fighter just renders a still forever (types.ts:101-105 is a bare `def.clips[state]` index with no
// normalisation and no aliasing). Likewise a wrong `faces:` does not crash; the fighter simply fights
// facing away from its opponent.
const FREE_ROSTER = ['gargoyle-spear', 'lich-scythe', 'oni-tetsubo'] as const;
const FRESH = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);
const PUBLIC = join(__dirname, '..', '..', 'public');

/** The FACING RULE, replicated from src/ui/FightExperience.tsx:919 (the function there is module-private,
 *  so it cannot be imported — this mirrors it verbatim and the test below pins the behaviour). */
function isMirrored(def: FighterDef, slot: 'p1' | 'p2'): boolean {
  return def.faces !== (slot === 'p1' ? 'right' : 'left');
}

describe('free-roster fighters — registered and selectable from a fresh profile', () => {
  it.each(FREE_ROSTER)('%s is in the FIGHTERS registry', (id) => {
    expect(FIGHTERS[id]).toBeDefined();
    expect(getFighter(id).id).toBe(id);
  });

  it.each(FREE_ROSTER)('%s takes no campaign node, so it is never gated', (id) => {
    expect(bossNodeId(id)).toBeNull();
  });

  it.each(FREE_ROSTER)('%s is selectable with ZERO nodes beaten', (id) => {
    expect(isFighterSelectable(id, FRESH)).toBe(true);
  });
});

describe('the FACING RULE resolves to the correct on-screen direction in BOTH slots', () => {
  // Roster convention: every wired fighter is faces:'right'. A lone exception is how this defect class
  // survives (see .claude/skills/standoff-clip-facing), so the convention is asserted, not assumed.
  it.each(Object.keys(FIGHTERS))('%s declares a valid faces', (id) => {
    expect(['left', 'right']).toContain(getFighter(id).faces);
  });

  it.each(FREE_ROSTER)('%s faces right, so p1 renders unmirrored and p2 renders mirrored', (id) => {
    const def = getFighter(id);
    expect(def.faces).toBe('right');
    // p1 occupies the LEFT slot and must face right -> no mirror.
    expect(isMirrored(def, 'p1')).toBe(false);
    // p2 occupies the RIGHT slot and must face left -> exactly one mirror (scaleX(-1)).
    expect(isMirrored(def, 'p2')).toBe(true);
  });

  it('the rule is slot-symmetric for every registered fighter (never mirrored in both slots)', () => {
    for (const id of Object.keys(FIGHTERS)) {
      const def = getFighter(id);
      expect(isMirrored(def, 'p1')).not.toBe(isMirrored(def, 'p2'));
    }
  });
});

describe('free-roster fighters — every declared asset actually exists on disk', () => {
  it.each(FREE_ROSTER)('%s still resolves to a real file', (id) => {
    const def = getFighter(id);
    expect(def.still).toBeTruthy();
    // `still` is MANDATORY: the fighter box, select tile, select preview and both HUD medallions read
    // it unguarded, and it is the ENTIRE character under prefers-reduced-motion.
    expect(existsSync(join(PUBLIC, def.still))).toBe(true);
  });

  it.each(FREE_ROSTER)('%s every clip url resolves to a real file', (id) => {
    const def = getFighter(id);
    const urls = Object.keys(def.clips).flatMap((s) =>
      clipVariants(def, s as FighterState).map((c) => c.url));
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url.startsWith(`assets/characters/${id}/`), `${id}: ${url} is not under its own dir`).toBe(true);
      expect(existsSync(join(PUBLIC, url)), `${id}: MISSING ${url}`).toBe(true);
    }
  });
});

describe('free-roster fighters — the two states the engine cannot degrade past', () => {
  it.each(FREE_ROSTER)('%s ships idle (the only fallback in the ladder)', (id) => {
    // FightExperience.tsx:1012-1016 falls back to idle; with no idle a missing state mounts NO video.
    expect(clipVariants(getFighter(id), 'idle').length).toBeGreaterThan(0);
  });

  it.each(FREE_ROSTER)('%s ships hit (it gates the whole clip beat as a defender)', (id) => {
    // FightExperience.tsx:1775-1778 useClipChoreo = attackerHasClip && defenderHasHit. Without `hit`
    // this fighter never triggers clip choreography as a defender, against ANY opponent.
    expect(clipVariants(getFighter(id), 'hit').length).toBeGreaterThan(0);
  });
});
