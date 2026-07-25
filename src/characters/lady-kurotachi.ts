import type { FighterDef } from './types';

// LADY KUROTACHI — node 9 boss (CRIMSON GATES). Warlord in black samurai plate armor with
// hot-pink/crimson neon trim, horned kabuto helmet, single black katana with crimson hilt rings.
// Wired as a node enemy (WIRE WAVE 2, Tim 2026-07-24/25) and unlocked as a PLAYABLE fighter only
// after node 9 is beaten (charSelect gate).
//
// The 13-clip kit was generated on GREEN (magenta would kill the hot-pink trim), QA-passed per
// contract §6, keyed with the pink-safe GREEN keyer (scripts/key-clips-green-pinksafe.mjs — the stock
// magenta-tuned keyer crushes hot-pink) + green-despill/neutralize post-passes, encoded VP9 alpha
// (0.0000% visible green over black+white, trim intact). Effects are HOT-PINK/CRIMSON/WHITE, never
// green. Every `cal` here is the value EMITTED by the keyer (qa-boss/lady-kurotachi-clipdata.json —
// never hand-derived); every `contacts` array is MEASURED off the clip's QA sheet (motion-energy
// argmax @24fps). The 3 signature specials (§11) ship as a take-list of `special`; one is chosen
// uniform-random per round-ending win.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/lady-kurotachi.webp, 900x900): the
// ultimate fallback + the HUD medallion / select-tile head-crop source; the idle clip overlays it
// once loaded. faces:'right' (helmet + body face screen-right, katana arm to screen-right per the
// anchor); the game mirrors per THE FACING RULE for whichever slot she lands in.
export const LADY_KUROTACHI: FighterDef = {
  id: 'lady-kurotachi',
  name: 'LADY KUROTACHI',
  still: 'assets/enemies/lady-kurotachi.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile (helmet centre ~x0.47 / y0.15 of the 900x900 still).
  portrait: { headX: 0.47, headY: 0.15, zoom: 4.5 },
  clips: {
    idle: {
      url: 'assets/characters/lady-kurotachi/idle.webm',
      cal: { h: 100.35, bottom: -0.18, left: 47.26 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: deep coil -> explosive rising cut with crimson-white crescent trail, back to anchor.
        url: 'assets/characters/lady-kurotachi/attack-strike.webm',
        cal: { h: 110.49, bottom: -0.18, left: 46.02 },
        contacts: [1667],
      },
      {
        // Take B: deep-coil committed step-in thrust held at chest height (distinct action, same family).
        url: 'assets/characters/lady-kurotachi/attack-strike-b.webm',
        cal: { h: 100.36, bottom: -0.18, left: 58.32 },
        contacts: [3292],
      },
    ],
    attack_throw: [
      {
        // Take A: violent seize -> deep wrenching slam through empty air (solo-safe, no phantom).
        url: 'assets/characters/lady-kurotachi/attack-throw.webm',
        cal: { h: 102.29, bottom: -0.18, left: 58.2 },
        contacts: [1833],
      },
      {
        // Take B: body-committed shoulder barge, lean + stride forward (solo-safe).
        url: 'assets/characters/lady-kurotachi/attack-throw-b.webm',
        cal: { h: 101.09, bottom: -0.18, left: 33.68 },
        contacts: [2583],
      },
    ],
    attack_block: [
      {
        // Take A: snap into level chest-height horizontal guard -> coiled diagonal counter.
        url: 'assets/characters/lady-kurotachi/attack-block.webm',
        cal: { h: 112.42, bottom: -2.59, left: 44.93 },
        contacts: [583],
      },
      {
        // Take B: raise to level chest-height blade brace (white catch-gleam) -> low counter.
        url: 'assets/characters/lady-kurotachi/attack-block-b.webm',
        cal: { h: 101.09, bottom: -0.18, left: 49.16 },
        contacts: [958],
      },
    ],
    hit: {
      // Sharp head/torso whip-back stagger (neon trim flares), quick recovery to stance, on feet.
      url: 'assets/characters/lady-kurotachi/hit.webm',
      cal: { h: 104.95, bottom: -0.2, left: 55.36 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Three takes,
    // one chosen uniform-random per exchange. The hot-pink/crimson/white light is baked into the body
    // (sanctioned effect exception, never green); each effect fully dissipates by the final frame.
    special: [
      {
        // Crimson crescent: explosive rip + bright crimson-white crescent in front, fades to anchor.
        url: 'assets/characters/lady-kurotachi/special.webm',
        cal: { h: 100.36, bottom: -0.18, left: 53.62 },
        contacts: [750],
      },
      {
        // Petal-spark flurry: tight pink-white swirl + scattering sparks tight to the torso.
        url: 'assets/characters/lady-kurotachi/special-b.webm',
        cal: { h: 116.08, bottom: -5.5, left: 53.87 },
        contacts: [917],
      },
      {
        // Snap-down cut: raise to chest -> snap-down cut with a compact blade-tip flash.
        url: 'assets/characters/lady-kurotachi/special-c.webm',
        cal: { h: 105.67, bottom: -5.49, left: 50.12 },
        contacts: [2708],
      },
    ],
    // ko is the ONE off-anchor clip: strength drains, knees buckle, katana drops, crumples to her
    // side and HOLDS motionless (does NOT return to the anchor). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/lady-kurotachi/ko.webm',
      cal: { h: 106.95, bottom: -6.52, left: 56.46 },
    },
    // Round-win taunt: lift -> long proud horizontal blade salute -> lower back to the anchor.
    victory: {
      url: 'assets/characters/lady-kurotachi/victory.webm',
      cal: { h: 106.15, bottom: -0.18, left: 59.65 },
    },
  },
  quotes: [
    'The gates answer to me. You answered to no one worth naming.',
    'I do not hold the crimson line. I am the crimson line.',
    'Kneel at the gate or fall before it. You chose to fall.',
    'Every warlord before you is a name on my blade. Now you.',
  ],
};
