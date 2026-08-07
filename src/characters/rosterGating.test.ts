import { describe, expect, it } from 'vitest';
import {
  ALWAYS_AVAILABLE_FIGHTER_IDS,
  bossNodeId,
  fighterUnlockedByNode,
  isFighterSelectable,
} from './rosterGating';
import { FIGHTERS } from './index';
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
    // phase 283: gorvak + volta were DELETED. These are the three that replaced them.
    expect(bossNodeId('gargoyle-spear')).toBeNull();
    expect(bossNodeId('lich-scythe')).toBeNull();
    // ONI-TETSUBO IS node 2's in-fight body, so this is the load-bearing case: it must STILL read as
    // "not a boss" because ALWAYS_AVAILABLE_FIGHTER_IDS is checked BEFORE the CAMPAIGN_NODES lookup.
    // If that order ever flips, oni silently locks behind node 2 and this assertion is the tripwire.
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'oni-tetsubo')?.id).toBe(2);
    expect(bossNodeId('oni-tetsubo')).toBeNull();
  });
  it('the deleted placeholder fighters are gone from the registry', () => {
    // Guards against a half-revert leaving one of them resolvable again.
    expect(FIGHTERS['gorvak']).toBeUndefined();
    expect(FIGHTERS['volta']).toBeUndefined();
  });
  it('a wired boss maps to the node it is the enemy of', () => {
    expect(bossNodeId('satoshi-odachi')).toBe(5);
    expect(bossNodeId('eclipse-ofuda')).toBe(6);
    expect(bossNodeId('ir37-pink-tessen')).toBe(7);
    expect(bossNodeId('lady-kurotachi')).toBe(9);
  });
  it('an unknown / non-campaign fighter id is not gated', () => {
    expect(bossNodeId('nobody')).toBeNull();
  });
  it('the derived mapping matches the registry (no duplicated table)', () => {
    // Each boss node carries its own fighterId; the map is derived, not hand-listed.
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'satoshi-odachi')?.id).toBe(5);
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'eclipse-ofuda')?.id).toBe(6);
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'ir37-pink-tessen')?.id).toBe(7);
    expect(CAMPAIGN_NODES.find((n) => n.fighterId === 'lady-kurotachi')?.id).toBe(9);
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
    expect(isFighterSelectable('eclipse-ofuda', FRESH)).toBe(false);
    expect(isFighterSelectable('ir37-pink-tessen', FRESH)).toBe(false);
    expect(isFighterSelectable('lady-kurotachi', FRESH)).toBe(false);
  });
  it('a boss unlocks exactly when its own node is beaten', () => {
    const node5 = beatenWith(5);
    expect(isFighterSelectable('satoshi-odachi', node5)).toBe(true);
    // Beating node 5 does NOT unlock node 7's boss.
    expect(isFighterSelectable('ir37-pink-tessen', node5)).toBe(false);
    const node7 = beatenWith(7);
    expect(isFighterSelectable('ir37-pink-tessen', node7)).toBe(true);
    expect(isFighterSelectable('satoshi-odachi', node7)).toBe(false);
    // WIRE WAVE 2 bosses: eclipse (node 6), lady-kurotachi (node 9).
    const node6 = beatenWith(6);
    expect(isFighterSelectable('eclipse-ofuda', node6)).toBe(true);
    expect(isFighterSelectable('lady-kurotachi', node6)).toBe(false);
    const node9 = beatenWith(9);
    expect(isFighterSelectable('lady-kurotachi', node9)).toBe(true);
    expect(isFighterSelectable('eclipse-ofuda', node9)).toBe(false);
  });
  it('beating an unrelated node never unlocks a boss', () => {
    // Nodes 1-4 beaten but not 5 => satoshi stays locked.
    expect(isFighterSelectable('satoshi-odachi', beatenWith(1, 2, 3, 4))).toBe(false);
  });
  it('corrupt storage falls back to all-locked bosses (via parseCampaignBeaten)', () => {
    const fromGarbage = parseCampaignBeaten('not json {[');
    expect(isFighterSelectable('satoshi-odachi', fromGarbage)).toBe(false);
    expect(isFighterSelectable('eclipse-ofuda', fromGarbage)).toBe(false);
    expect(isFighterSelectable('ir37-pink-tessen', fromGarbage)).toBe(false);
    expect(isFighterSelectable('lady-kurotachi', fromGarbage)).toBe(false);
    // ...but the always-available fighters survive a corrupt read — including oni, which is a node
    // body and would otherwise be locked by an all-false beaten[].
    expect(isFighterSelectable('gargoyle-spear', fromGarbage)).toBe(true);
    expect(isFighterSelectable('lich-scythe', fromGarbage)).toBe(true);
    expect(isFighterSelectable('oni-tetsubo', fromGarbage)).toBe(true);
  });
});

describe('fighterUnlockedByNode — node -> the fighter it makes newly playable (phase 294)', () => {
  it('every node but 2 unlocks exactly one fighter, and node 2 unlocks nothing', () => {
    // Node 2's fighterId is oni-tetsubo, which is ALWAYS_AVAILABLE — so winning it genuinely grants
    // no new pick. That is a real property of the roster, not a gap to paper over: the receipt must
    // stay SILENT on node 2 rather than announce an unlock the select grid will not show.
    expect(fighterUnlockedByNode(2)).toBeNull();
    const unlockers = CAMPAIGN_NODES.filter((n) => fighterUnlockedByNode(n.id) !== null);
    expect(unlockers.map((n) => n.id)).toEqual([1, 3, 4, 5, 6, 7, 8, 9, 10]);
    // 9 unlockable bosses + the 3 always-available = the whole 12-fighter registry, no orphans.
    expect(unlockers.length + ALWAYS_AVAILABLE_FIGHTER_IDS.length).toBe(Object.keys(FIGHTERS).length);
  });

  it('never returns an id that getFighter would throw on', () => {
    // The receipt renders getFighter(id).name. getFighter THROWS on an unknown id by contract, and it
    // would throw INSIDE the victory render — a white screen at the exact moment of winning. Node 2 is
    // the live tripwire: its enemy.id is 'kitsune-tanto', which is NOT in the registry.
    expect(FIGHTERS['kitsune-tanto']).toBeUndefined();
    for (const node of CAMPAIGN_NODES) {
      const id = fighterUnlockedByNode(node.id);
      if (id !== null) expect(FIGHTERS[id]).toBeDefined();
    }
  });

  it('reads fighterId, not enemy.id, wherever the two disagree', () => {
    const node2 = CAMPAIGN_NODES.find((n) => n.id === 2)!;
    expect(node2.fighterId).toBe('oni-tetsubo');
    expect(node2.enemy.id).toBe('kitsune-tanto');
    // If this ever starts returning the enemy id, the assertion above about getFighter fires too.
    expect(fighterUnlockedByNode(2)).not.toBe(node2.enemy.id);
  });

  it('the announced fighter is exactly the one the select grid then offers', () => {
    // The whole point: the receipt must not promise a pick the gate does not grant. For every node,
    // the unlocked id is locked on a fresh profile and selectable once THAT node is beaten.
    for (const node of CAMPAIGN_NODES) {
      const id = fighterUnlockedByNode(node.id);
      if (id === null) continue;
      expect(isFighterSelectable(id, FRESH)).toBe(false);
      expect(isFighterSelectable(id, beatenWith(node.id))).toBe(true);
    }
  });

  it('an out-of-range node id is null, never a throw', () => {
    expect(fighterUnlockedByNode(0)).toBeNull();
    expect(fighterUnlockedByNode(CAMPAIGN_NODE_COUNT + 1)).toBeNull();
    expect(fighterUnlockedByNode(-1)).toBeNull();
  });
});
