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
    attack_strike: {
      url: 'assets/fighter-2-attack-strike.webm',
      cal: { h: 88.83, bottom: 4.29, left: 73.77 },
      // Jab -> powered cross -> spinning backfist (three-blow string).
      contacts: [1292, 2167, 3167],
    },
    attack_throw: {
      url: 'assets/fighter-2-attack-throw.webm',
      cal: { h: 88.48, bottom: 4.93, left: 73.92 },
      // Clinch grab -> violent shove-off (two honest blows; the counter reads "2 HITS").
      contacts: [1000, 2333],
    },
    attack_block: {
      url: 'assets/fighter-2-attack-block.webm',
      cal: { h: 95.37, bottom: 4.74, left: 74.55 },
      // Servo deflect (presentation, no damage beat) -> backfist -> return cross.
      contacts: [2417, 2875],
    },
    hit: {
      url: 'assets/fighter-2-hit.webm',
      cal: { h: 93.95, bottom: 4.93, left: 64.87 },
    },
  },
  quotes: [
    'Circuit closed. You were the resistance.',
    'Faster than a fist, colder than the ice.',
    'Every read was mine. You just felt it late.',
  ],
};
