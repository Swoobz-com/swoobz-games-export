import type { FighterDef } from './types';

// GORVAK — orc, serrated cleaver + parry dagger. Slot is a RUNTIME assignment (whichever slot
// the match puts him in), not baked here. Only the idle clip exists today; attack_strike /
// attack_throw / attack_block / hit / ko / victory + fxImpact arrive per the production
// pipeline (contract §6) and drop in here as pure data — no Experience edits. The cal below is
// the value emitted by scripts/key-idle-clips.mjs for the idle clip.
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
  },
  fxImpact: {
    // Ember-and-bone iron burst (contract §7), trimmed to the detonation window.
    url: 'assets/fighter-1-impact.mp4',
    durationMs: 700,
  },
  quotes: [
    'The cathedral keeps only the standing.',
    'Steel bends. Bone breaks. I do neither.',
    'You picked wrong. That was the whole fight.',
  ],
};
