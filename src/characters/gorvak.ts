import type { FighterDef } from './types';

// GORVAK — orc, serrated cleaver + parry dagger. Slot is a RUNTIME assignment (whichever slot
// the match puts him in), not baked here. FULL KIT as of 2026-07-18: idle + two takes of every
// non-idle state (contract §10) + the special finisher (§11). All cals emitted by
// scripts/key-idle-clips.mjs; all contacts measured (motion peaks confirmed on frame sheets).
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
    // Contract 10: every non-idle state ships >= 2 interchangeable takes (own cal + contacts,
    // uniform-random per exchange). Take A keeps the original filename; takes B+ add -b/-c.
    attack_strike: [
      {
        url: 'assets/fighter-1-attack-strike.webm',
        cal: { h: 97.49, bottom: 2.47, left: 49.94 },
        // Cleaver arc lands just before halfway through the 4s clip (QA read: frame ~42-44 @24fps).
        contactMs: 1750,
      },
      {
        url: 'assets/fighter-1-attack-strike-b.webm',
        cal: { h: 105.64, bottom: 2.15, left: 50 },
        // Rising diagonal slash -> short dagger stab (sheet frames f38 / f57).
        contacts: [1583, 2375],
      },
    ],
    attack_throw: [
      {
        url: 'assets/fighter-1-attack-throw.webm',
        cal: { h: 106.56, bottom: 1.23, left: 50 },
        // Collar grab-yank -> knee-down ground slam (slam lands at the f45 motion peak; the
        // knee-down frames after are the hold). Clean-plate regeneration, 2026-07-18.
        contacts: [1208, 1875],
      },
      {
        url: 'assets/fighter-1-attack-throw-b.webm',
        cal: { h: 105.79, bottom: 2, left: 50.84 },
        // Two-handed hoist over the shoulder -> violent forward hurl (motion peaks f48 / f66).
        contacts: [2000, 2750],
      },
    ],
    attack_block: [
      {
        url: 'assets/fighter-1-attack-block.webm',
        cal: { h: 105.64, bottom: 2.15, left: 48.77 },
        // Dagger deflect (no damage beat) -> low backhand strike -> overhead cleaver chop.
        contacts: [2000, 2417],
      },
      {
        url: 'assets/fighter-1-attack-block-b.webm',
        cal: { h: 105.64, bottom: 2.15, left: 50 },
        // Vambrace absorb (no damage beat) -> rising pommel uppercut -> stomping cleaver thrust.
        contacts: [2250, 2917],
      },
    ],
    hit: [
      {
        url: 'assets/fighter-1-hit.webm',
        cal: { h: 98.04, bottom: 1.99, left: 50.23 },
      },
      {
        url: 'assets/fighter-1-hit-b.webm',
        cal: { h: 103.64, bottom: 0.62, left: 43.31 },
        // Gut-fold take: doubles over at the waist (distinct family from the head-whip A take).
      },
    ],
    // Contract 11: the signature FINISHER - plays automatically on round-ending wins. The flame
    // ribbon is BAKED IN (the sanctioned effect exception, Scorpion bar). Charge -> igniting
    // full-circle cleaver sweep; the ring blow is the final contact the KO beat lands on.
    special: {
      url: 'assets/fighter-1-special.webm',
      cal: { h: 107.2, bottom: 0.77, left: 50.09 },
      // Charge -> cleaver rip -> igniting full-circle sweep (wide-framed regeneration so the
      // whole flame ring lives inside the canvas; motion peaks f38 / f47 / f62).
      contacts: [1583, 1958, 2583],
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
