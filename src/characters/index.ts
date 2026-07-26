// The character registry (contract §4). The Experience resolves FighterDefs by id from here
// and NEVER hardcodes character assets. Swapping a fighter is a data change (a new manifest +
// a registry entry), not a code change.
import type { Move } from '../engine/fightEngine';
import type { FighterDef, FighterState } from './types';
import { ECLIPSE_OFUDA } from './eclipse-ofuda';
import { GORVAK } from './gorvak';
import { HOLLOW_PALE } from './hollow-pale';
import { IR37_PINK_TESSEN } from './ir37-pink-tessen';
import { LADY_KUROTACHI } from './lady-kurotachi';
import { SATOSHI_ODACHI } from './satoshi-odachi';
import { SORA_YARI } from './sora-yari';
import { THORN_WARDEN } from './thorn-warden';
import { VOLTA } from './volta';

export type { ClipCal, FighterClip, FighterDef, FighterFxImpact, FighterPortrait, FighterState } from './types';

// GORVAK + VOLTA are the always-available roster fighters. The boss fighters (satoshi-odachi,
// ir37-pink-tessen, eclipse-ofuda, lady-kurotachi, ...) are ALSO registered here so the campaign can
// render them in-fight by `fighterId` and the Experience can resolve them for RENDERING
// unconditionally — but they are GATED in the charSelect PICK grid: a boss becomes a selectable tile
// only after its campaign node is beaten (see rosterGating.ts). The gate is UI-side only; this
// registry stays identity-agnostic.
export const FIGHTERS: Record<string, FighterDef> = {
  gorvak: GORVAK,
  volta: VOLTA,
  'satoshi-odachi': SATOSHI_ODACHI,
  'ir37-pink-tessen': IR37_PINK_TESSEN,
  'eclipse-ofuda': ECLIPSE_OFUDA,
  'lady-kurotachi': LADY_KUROTACHI,
  'hollow-pale': HOLLOW_PALE,
  'sora-yari': SORA_YARI,
  'thorn-warden': THORN_WARDEN,
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
