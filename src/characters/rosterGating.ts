// PLAYABLE-AFTER-BEATEN gating (phase 23, Tim 2026-07-24). Bosses are registered fighters so the
// campaign can render them in-fight and the Experience can resolve them for RENDERING unconditionally
// (friend-mode peers, campaign fights). But in the charSelect PICK grid a boss is selectable ONLY
// after its campaign node is beaten; until then it occupies a locked mystery "?" tile. This module is
// the ONE place that maps a fighter id to its gating node — derived from the campaign registry
// (CAMPAIGN_NODES.fighterId), never a duplicated table. PURE (no DOM, no React, no storage) so it is
// unit-testable and the gate stays presentation-only (it never touches stakes/payouts/engine).

import { CAMPAIGN_NODES } from '../engine/fightCampaign';

/** The always-available roster fighters — never gated, selectable from a fresh profile.
 *  phase 283 (Tim: "gorvak and volta can't be characters so remove those 2"): the two placeholder
 *  house fighters are gone and these three replace them.
 *  ⚠ `oni-tetsubo` IS node 2's in-fight body (fightCampaign.ts), which would normally gate it. It stays
 *  selectable because this list is checked FIRST in bossNodeId() below — the same "node body that is
 *  nonetheless always selectable" role volta used to fill. Removing it from this list would silently
 *  lock it behind node 2. */
export const ALWAYS_AVAILABLE_FIGHTER_IDS: readonly string[] = [
  'gargoyle-spear',
  'lich-scythe',
  'oni-tetsubo',
];

/** The 1-based campaign node id a fighter is GATED behind, or null when the fighter is not a gated
 *  boss. Single source: it reads CAMPAIGN_NODES.fighterId. An always-available fighter is never a
 *  boss (VOLTA fills many node fighterId slots as the in-fight stand-in, but is always selectable),
 *  and a fighter that no node uses as its enemy is not gated either. */
export function bossNodeId(fighterId: string): number | null {
  if (ALWAYS_AVAILABLE_FIGHTER_IDS.includes(fighterId)) return null;
  const node = CAMPAIGN_NODES.find((n) => n.fighterId === fighterId);
  return node ? node.id : null;
}

/** Whether a fighter is selectable in the charSelect PICK grid, given campaign progress. Always-
 *  available fighters are always selectable; a gated boss is selectable only once its node is beaten.
 *  `beaten[i]` = node i+1 conquered (the same array the campaign persists, corrupt-safe upstream).
 *  A missing/false entry keeps the boss locked. */
export function isFighterSelectable(fighterId: string, beaten: readonly boolean[]): boolean {
  const nodeId = bossNodeId(fighterId);
  if (nodeId == null) return true;
  return beaten[nodeId - 1] === true;
}
