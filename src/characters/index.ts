// The character registry (contract §4). The Experience resolves FighterDefs by id from here
// and NEVER hardcodes character assets. Swapping a fighter is a data change (a new manifest +
// a registry entry), not a code change.
import type { Move } from '../engine/fightEngine';
import type { FighterDef, FighterState } from './types';
import { ECLIPSE_OFUDA } from './eclipse-ofuda';
import { GARGOYLE_SPEAR } from './gargoyle-spear';
import { HOLLOW_PALE } from './hollow-pale';
import { IR37_PINK_TESSEN } from './ir37-pink-tessen';
import { IR48_HEX_PAPER_LORD } from './ir48-hex-paper-lord';
import { IR56_LION_SERPENT } from './ir56-lion-serpent';
import { LADY_KUROTACHI } from './lady-kurotachi';
import { LICH_SCYTHE } from './lich-scythe';
import { ONI_TETSUBO } from './oni-tetsubo';
import { SATOSHI_ODACHI } from './satoshi-odachi';
import { SORA_YARI } from './sora-yari';
import { THORN_WARDEN } from './thorn-warden';

export type { ClipCal, FighterClip, FighterDef, FighterFxImpact, FighterPortrait, FighterState } from './types';

// THE ALWAYS-AVAILABLE ROSTER IS gargoyle-spear + lich-scythe + oni-tetsubo (phase 283, Tim's ruling
// 2026-08-07: "gorvak and volta can't be characters so remove those 2"). GORVAK and VOLTA were the two
// placeholder house fighters; both are GONE — manifests deleted, not merely unregistered.
//
// The boss fighters (satoshi-odachi, ir37-pink-tessen, eclipse-ofuda, lady-kurotachi, ...) are ALSO
// registered here so the campaign can render them in-fight by `fighterId` and the Experience can
// resolve them for RENDERING unconditionally — but they are GATED in the charSelect PICK grid: a boss
// becomes a selectable tile only after its campaign node is beaten (see rosterGating.ts). The gate is
// UI-side only; this registry stays identity-agnostic.
//
// ⚠ REMOVING A FIGHTER FROM THIS REGISTRY IS A BREAKING CHANGE, not a cosmetic one, because getFighter()
// THROWS on an unknown id by contract (no silent fallback). Two things pointed at the deleted pair and
// both were repointed in the same commit:
//   · src/engine/fightCampaign.ts node 2 ASHEN TORII had fighterId:'volta' as its in-fight body
//     -> now 'oni-tetsubo' (its enemy identity stays KITSUNE TANTO — name and map art unchanged).
//   · src/ui/FightExperience.tsx's default playerId was 'gorvak' -> now 'gargoyle-spear'.
// oni-tetsubo consequently HAS a campaign node, which would normally gate it. It stays selectable
// because ALWAYS_AVAILABLE_FIGHTER_IDS is checked FIRST in bossNodeId() — exactly the role volta used
// to fill ("a node body that is nonetheless always selectable").
export const FIGHTERS: Record<string, FighterDef> = {
  'gargoyle-spear': GARGOYLE_SPEAR,
  'lich-scythe': LICH_SCYTHE,
  'oni-tetsubo': ONI_TETSUBO,
  'satoshi-odachi': SATOSHI_ODACHI,
  'ir37-pink-tessen': IR37_PINK_TESSEN,
  'ir48-hex-paper-lord': IR48_HEX_PAPER_LORD,
  'ir56-lion-serpent': IR56_LION_SERPENT,
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
