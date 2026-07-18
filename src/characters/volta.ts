import type { FighterDef } from './types';

// VOLTA — cyber-brawler, powered gauntlets + spark wick. Slot is a RUNTIME assignment (she is
// the right-slot opponent when the player picks GORVAK, the left-slot fighter when the player
// picks her). Only the idle clip exists today; the remaining states + fxImpact land here as
// data when generated (contract §6).
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
    hit: {
      url: 'assets/fighter-2-hit.webm',
      cal: { h: 93.06, bottom: 3.89, left: 55.48 },
    },
  },
  quotes: [
    'Circuit closed. You were the resistance.',
    'Faster than a fist, colder than the ice.',
    'Every read was mine. You just felt it late.',
  ],
};
