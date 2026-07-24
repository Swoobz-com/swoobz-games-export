import type { FighterDef } from './types';

// IR-37 PINK TESSEN — node 7 boss (BURNED PAGODA). Precise, deadly fan-dancer machine: black armor
// with hot-pink neon trim, dual-wield war-fan + dagger. Wired as a node enemy (phase 23, Tim
// 2026-07-24) and unlocked as a PLAYABLE fighter only after node 7 is beaten (charSelect gate).
//
// The 13-clip kit was generated on GREEN with a pink-safe green keyer (the stock magenta-tuned keyer
// destroys hot-pink), QA-passed per contract §6, encoded VP9 alpha. Every `cal` is the keyer-emitted
// value (embedded in qa-boss/ir37-pink-tessen-clipdata.json — never hand-derived); every `contacts`
// array is MEASURED off the clip's QA sheet. The 3 signature specials (§11) are HOT-PINK/WHITE
// (never green) and ship as a take-list of `special`.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/ir37-pink-tessen.webp, h900): the
// ultimate fallback + the HUD medallion / select-tile head-crop source. faces:'right' (helmet + body
// face screen-right); the game mirrors per THE FACING RULE for whichever slot she lands in.
export const IR37_PINK_TESSEN: FighterDef = {
  id: 'ir37-pink-tessen',
  name: 'IR-37 PINK TESSEN',
  still: 'assets/enemies/ir37-pink-tessen.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile (helmet centre ~x0.42 / y0.15 of the 635x900 still).
  portrait: { headX: 0.42, headY: 0.15, zoom: 3.9 },
  clips: {
    idle: {
      url: 'assets/characters/ir37-pink-tessen/idle.webm',
      cal: { h: 101.7, bottom: -0.49, left: 49.88 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: one committed dagger thrust to full extension screen-right.
        url: 'assets/characters/ir37-pink-tessen/attack-strike.webm',
        cal: { h: 101.22, bottom: -0.49, left: 58.27 },
        contacts: [750],
      },
      {
        // Take B: compact fan swipe arc (distinct action, same strike family).
        url: 'assets/characters/ir37-pink-tessen/attack-strike-b.webm',
        cal: { h: 101.7, bottom: -0.49, left: 50.12 },
        contacts: [1417],
      },
    ],
    attack_throw: [
      {
        // Take A: grab-and-pull through empty air (solo-safe, no phantom opponent).
        url: 'assets/characters/ir37-pink-tessen/attack-throw.webm',
        cal: { h: 105.6, bottom: -0.49, left: 52.8 },
        contacts: [1250],
      },
      {
        // Take B: shoulder-barge shove through empty air (solo-safe).
        url: 'assets/characters/ir37-pink-tessen/attack-throw-b.webm',
        cal: { h: 107.06, bottom: -2.43, left: 62.17 },
        contacts: [2333],
      },
    ],
    attack_block: [
      {
        // Take A: fan guard/deflect -> dagger counter-punish (contact is the counter).
        url: 'assets/characters/ir37-pink-tessen/attack-block.webm',
        cal: { h: 111.44, bottom: -0.49, left: 56.69 },
        contacts: [1833],
      },
      {
        // Take B: crossed-weapon deflect -> sweep-apart counter.
        url: 'assets/characters/ir37-pink-tessen/attack-block-b.webm',
        cal: { h: 101.22, bottom: -0.49, left: 62.29 },
        contacts: [1667],
      },
    ],
    hit: {
      // Sharp head/torso whip-back stagger, resolves quickly back to guard, stays on feet.
      url: 'assets/characters/ir37-pink-tessen/hit.webm',
      cal: { h: 102.92, bottom: -0.49, left: 55.96 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Three takes,
    // one chosen uniform-random per exchange. The pink/white bloom is baked into the body (sanctioned
    // effect exception, never green); each effect fully dissipates by the final frame (anchor-locked).
    special: [
      {
        // Fan gale: two hot-pink + white gale arcs contained near the body.
        url: 'assets/characters/ir37-pink-tessen/special.webm',
        cal: { h: 111.44, bottom: -0.49, left: 58.03 },
        contacts: [250, 1125],
      },
      {
        // Petal flurry: tight hot-pink lotus + white-light swirl tight to the torso.
        url: 'assets/characters/ir37-pink-tessen/special-b.webm',
        cal: { h: 110.71, bottom: -0.49, left: 49.76 },
        contacts: [1375],
      },
      {
        // Fan flash: compact hot-pink + white star-flash at the fan.
        url: 'assets/characters/ir37-pink-tessen/special-c.webm',
        cal: { h: 101.95, bottom: -0.49, left: 53.89 },
        contacts: [1167],
      },
    ],
    // ko is the ONE off-anchor clip: weapons drop, crumples prone, holds motionless on the ground
    // (does NOT return to standing). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/ir37-pink-tessen/ko.webm',
      cal: { h: 106.33, bottom: -5.84, left: 48.66 },
    },
    // Round-win taunt: proud fan flourish (fan snaps open) then settles to the anchor.
    victory: {
      url: 'assets/characters/ir37-pink-tessen/victory.webm',
      cal: { h: 100.97, bottom: -0.49, left: 57.77 },
    },
  },
  quotes: [
    'Every angle calculated. Your defeat was only arithmetic.',
    'The fan opens. The fan closes. You end between them.',
    'Precision does not celebrate. It simply concludes.',
    'You fought a pattern you could never read.',
  ],
};
