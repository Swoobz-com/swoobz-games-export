import { describe, expect, it } from 'vitest';
import { ALWAYS_AVAILABLE_FIGHTER_IDS, bossNodeId, isFighterSelectable } from './rosterGating';
import { parseCampaignBeaten } from '../provider/fightProvider';
import { CAMPAIGN_NODES, CAMPAIGN_NODE_COUNT } from '../engine/fightCampaign';

const FRESH = new Array<boolean>(CAMPAIGN_NODE_COUNT).fill(false);

// A beaten[] with the given 1-based node ids conquered.
function beatenWith(...nodeIds: number[]): boolean[] {
  const b = FRESH.slice();
  for (const id of nodeIds) b[id - 1] = true;
  return b;
}

describe('bossNodeId — fighter id -> gating node (single source: CAMPAIGN_NODES)', () => {
  it('always-available fighters are never bosses', () => {
    expect(bossNodeId('gorvak')).toBeNull();
    // VOLTA fills many node fighterId slots as the in-fight stand-in but is always selectable.
    expect(bossNodeId('volta')).toBeNull();
  });
  it('a wired boss maps to the node it is the enemy of', () => {
    expect(bossNodeId('satoshi-odachi')).toBe(5);
    expect(bossNodeId('ir37-pink-tessen')).toBe(7);
  });
  it('an unknown / non-campaign fighter id is not gated', () => {
    expect(bossNodeId('nobody')).toBeNull();
  });
  it('the derived mapping matches the registry (no duplicated table)', () => {
    // satoshi/ir37 nodes carry their own fighterId; the map is derived, not hand-listed.
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'satoshi-odachi')?.id).toBe(5);
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'ir37-pink-tessen')?.id).toBe(7);
  });
});

describe('isFighterSelectable — playable-after-beaten gate', () => {
  it('always-available fighters selectable from a fresh profile', () => {
    for (const id of ALWAYS_AVAILABLE_FIGHTER_IDS) {
      expect(isFighterSelectable(id, FRESH)).toBe(true);
    }
  });
  it('bosses locked on a fresh profile', () => {
    expect(isFighterSelectable('satoshi-odachi', FRESH)).toBe(false);
    expect(isFighterSelectable('ir37-pink-tessen', FRESH)).toBe(false);
  });
  it('a boss unlocks exactly when its own node is beaten', () => {
    const node5 = beatenWith(5);
    expect(isFighterSelectable('satoshi-odachi', node5)).toBe(true);
    // Beating node 5 does NOT unlock node 7's boss.
    expect(isFighterSelectable('ir37-pink-tessen', node5)).toBe(false);
    const node7 = beatenWith(7);
    expect(isFighterSelectable('ir37-pink-tessen', node7)).toBe(true);
    expect(isFighterSelectable('satoshi-odachi', node7)).toBe(false);
  });
  it('beating an unrelated node never unlocks a boss', () => {
    // Nodes 1-4 (VOLTA stand-in enemies) beaten but not 5 => satoshi stays locked.
    expect(isFighterSelectable('satoshi-odachi', beatenWith(1, 2, 3, 4))).toBe(false);
  });
  it('corrupt storage falls back to all-locked bosses (via parseCampaignBeaten)', () => {
    const fromGarbage = parseCampaignBeaten('not json {[');
    expect(isFighterSelectable('satoshi-odachi', fromGarbage)).toBe(false);
    expect(isFighterSelectable('ir37-pink-tessen', fromGarbage)).toBe(false);
    // ...but the always-available fighters survive a corrupt read.
    expect(isFighterSelectable('gorvak', fromGarbage)).toBe(true);
    expect(isFighterSelectable('volta', fromGarbage)).toBe(true);
  });
});
