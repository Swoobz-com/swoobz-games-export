import type { FighterDef } from './types';

// VOLTA — cyber-brawler, powered gauntlets + spark wick. Slot is a RUNTIME assignment (she is
// the right-slot opponent when the player picks GORVAK, the left-slot fighter when the player
// picks her). Full kit as of the 2026-07-18 batch: idle + all three attack combo strings + the
// re-rolled hit (directional acting corrected in ART space: the blow arrives from her facing
// side and she whips away). No fxImpact by design (contract §7 deprecation - contact fx are
// CSS-authored). Cals emitted by scripts/key-idle-clips.mjs; contacts MEASURED (motion-energy
// peaks confirmed frame-by-frame on the QA sheet, contract §9) - never guessed.
export const VOLTA: FighterDef = {
  id: 'volta',
  name: 'VOLTA',
  still: 'assets/fighter-2-keyed.png',
  // Her HEAD looks right at full res (body stances left - the head is what reads). So she needs
  // no mirror in the left slot, and the right slot mirrors her to face the fight (Tim, 2026-07-18).
  faces: 'right',
  // Head-crop for the HUD medallion + select tile (was CAL.portraitP2; now travels with her).
  portrait: { headX: 0.5, headY: 0.16, zoom: 4.2 },
  clips: {
    idle: {
      url: 'assets/fighter-2-idle.webm',
      cal: { h: 84.31, bottom: 4.93, left: 51.31 },
    },
    // Contract 10: two interchangeable takes per non-idle state (own cal + contacts each).
    attack_strike: [
      {
        url: 'assets/fighter-2-attack-strike.webm',
        cal: { h: 88.83, bottom: 4.29, left: 73.77 },
        // Jab -> powered cross -> spinning backfist (three-blow string).
        contacts: [1292, 2167, 3167],
      },
      {
        url: 'assets/fighter-2-attack-strike-b.webm',
        cal: { h: 97.92, bottom: 2.08, left: 54.06 },
        // Rising uppercut -> stepping overhand hammer (motion peaks f38 / f54).
        contacts: [1583, 2250],
      },
    ],
    attack_throw: [
      {
        url: 'assets/fighter-2-attack-throw.webm',
        cal: { h: 88.48, bottom: 4.93, left: 73.92 },
        // Clinch grab -> violent shove-off (two honest blows; the counter reads "2 HITS").
        contacts: [1000, 2333],
      },
      {
        url: 'assets/fighter-2-attack-throw-b.webm',
        cal: { h: 96.26, bottom: 3.75, left: 56 },
        // Judo hip-throw sweep -> back-elbow (sheet frames f38 / f62; solo-safe re-roll after
        // the arm-drag take materialized a phantom limb and was rejected).
        contacts: [1583, 2583],
      },
    ],
    attack_block: [
      {
        url: 'assets/fighter-2-attack-block.webm',
        cal: { h: 95.37, bottom: 4.74, left: 74.55 },
        // Servo deflect (presentation, no damage beat) -> backfist -> return cross.
        contacts: [2417, 2875],
      },
      {
        url: 'assets/fighter-2-attack-block-b.webm',
        cal: { h: 83.41, bottom: 4.86, left: 49.99 },
        // Gauntlet catch-and-crush (no damage beat) -> elbow smash -> finishing hook.
        contacts: [2250, 2917],
      },
    ],
    hit: [
      {
        url: 'assets/fighter-2-hit.webm',
        cal: { h: 93.95, bottom: 4.93, left: 64.87 },
      },
      {
        url: 'assets/fighter-2-hit-b.webm',
        cal: { h: 82.78, bottom: 4.93, left: 48.96 },
        // Gut-fold take: doubles over at the waist (distinct family from the head-whip A take).
      },
    ],
    // Contract 11: the signature FINISHER - plays automatically on round-ending wins. The
    // lightning arc is BAKED IN (sanctioned effect exception). Backfist -> knee -> full spinning
    // voltage circle; the spin blow is the final contact the KO beat lands on.
    special: {
      url: 'assets/fighter-2-special.webm',
      cal: { h: 99.93, bottom: 0.33, left: 50.28 },
      // Backfist -> full spinning voltage circle (wide-framed regeneration; peaks f38 / f62).
      contacts: [1583, 2583],
    },
  },
  quotes: [
    'Circuit closed. You were the resistance.',
    'Faster than a fist, colder than the ice.',
    'Every read was mine. You just felt it late.',
  ],
};
