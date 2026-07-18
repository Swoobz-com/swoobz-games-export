import type { FighterDef } from './types';

// GORVAK — orc, serrated cleaver + parry dagger. Slot is a RUNTIME assignment (whichever slot
// the match puts him in), not baked here. Only the idle clip exists today; attack_strike /
// attack_throw / attack_block / hit / ko / victory arrive per the production pipeline
// (contract §6) and drop in here as pure data — no Experience edits. The cal below is the value
// emitted by scripts/key-idle-clips.mjs for the idle clip.
export const GORVAK: FighterDef = {
  id: 'gorvak',
  name: 'GORVAK',
  still: 'assets/fighter-1-keyed.png',
  faces: 'right', // head + stance point right: no mirror in the left slot; mirrors in the right slot
  // Head-crop for the HUD medallion + select tile (was CAL.portraitP1; now travels with him).
  portrait: { headX: 0.45, headY: 0.12, zoom: 4.6 },
  clips: {
    idle: {
      url: 'assets/fighter-1-idle.webm',
      cal: { h: 93.46, bottom: 2.23, left: 41.54 },
    },
    attack_strike: {
      url: 'assets/fighter-1-attack-strike.webm',
      cal: { h: 97.49, bottom: 2.47, left: 49.94 },
      // Cleaver arc lands just before halfway through the 4s clip (QA read: frame ~42-44 @24fps).
      contactMs: 1750,
    },
    attack_throw: {
      url: 'assets/fighter-1-attack-throw.webm',
      cal: { h: 106.56, bottom: 1.23, left: 50 },
      // Collar grab-yank -> knee-down ground slam (slam lands at the f45 motion peak; the
      // knee-down frames after are the hold). Clean-plate regeneration, 2026-07-18.
      contacts: [1208, 1875],
    },
    attack_block: {
      url: 'assets/fighter-1-attack-block.webm',
      cal: { h: 105.64, bottom: 2.15, left: 48.77 },
      // Dagger deflect (no damage beat) -> low backhand strike -> overhead cleaver chop.
      contacts: [2000, 2417],
    },
    hit: {
      url: 'assets/fighter-1-hit.webm',
      cal: { h: 98.04, bottom: 1.99, left: 50.23 },
    },
  },
  // fxImpact intentionally omitted. The generated ember-and-bone burst was reviewed and REJECTED:
  // it read as noise against the frost palette, so it is removed from presentation. Contract §7
  // impact bursts stay legal for FUTURE characters (the FighterFxImpact type + ImpactLayer machinery
  // remain wired, and scheduleImpactClear already guards with `?.`), but GORVAK's contact beat is now
  // carried entirely by the CSS contact fx (frost impact ring + tighter echo ripple, swelling glow,
  // "-1" floater) and the block parry — the smoothness-and-clean language Tim asked for.
  quotes: [
    'The cathedral keeps only the standing.',
    'Steel bends. Bone breaks. I do neither.',
    'You picked wrong. That was the whole fight.',
  ],
};
