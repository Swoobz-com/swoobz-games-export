// The character registry (contract §4). The Experience resolves FighterDefs by id from here
// and NEVER hardcodes character assets. Swapping a fighter is a data change (a new manifest +
// a registry entry), not a code change.
import type { Move } from '../engine/fightEngine';
import type { FighterDef, FighterState } from './types';
import { GORVAK } from './gorvak';
import { VOLTA } from './volta';

export type { ClipCal, FighterClip, FighterDef, FighterFxImpact, FighterPortrait, FighterState } from './types';

export const FIGHTERS: Record<string, FighterDef> = {
  gorvak: GORVAK,
  volta: VOLTA,
};

/** Resolve a fighter by id. THROWS on an unknown id — no silent fallback (contract §4): a
 *  bad id is a bug, not a fighter. */
export function getFighter(id: string): FighterDef {
  const def = FIGHTERS[id];
  if (!def) {
    throw new Error(`Unknown fighter id: "${id}". Known ids: ${Object.keys(FIGHTERS).join(', ')}.`);
  }
  return def;
}

/** The winning move maps to the attacker's attack state (exact-match; a typo is a compile
 *  error because it is keyed by the Move union and returns a FighterState). */
export const ATTACK_STATE: Record<Move, FighterState> = {
  strike: 'attack_strike',
  throw: 'attack_throw',
  block: 'attack_block',
};
