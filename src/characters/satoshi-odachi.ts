import type { FighterDef } from './types';

// SATOSHI ODACHI — node 5 boss (KAWA CROSSING). Weathered silver-haired ronin, tan skin, dark
// hakama, straw cape, plain steel odachi. Calm, heavy kenjutsu. Wired as a node enemy (phase 23,
// Tim 2026-07-24) and unlocked as a PLAYABLE fighter only after node 5 is beaten (charSelect gate).
//
// The 13-clip kit was generated on GREEN (browser Higgsfield Unlimited), QA-passed per contract §6,
// keyed (green despill post-pass) + encoded VP9 alpha. Every `cal` here is the value EMITTED by the
// keyer (qa-boss/webm/*.cal.json — never hand-derived); every `contacts` array is MEASURED off the
// clip's QA sheet (qa-boss/satoshi-odachi-clipdata.json). The 3 signature specials (§11) ship as a
// take-list of `special`; on a round-ending win one is chosen uniform-random.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/satoshi-odachi.webp, h900). It is
// the ultimate fallback + the source for the HUD medallion / select-tile head-crop; the idle clip
// overlays it once loaded. faces:'right' (head + body face screen-right at full res); the game
// mirrors per THE FACING RULE for whichever slot he lands in.
export const SATOSHI_ODACHI: FighterDef = {
  id: 'satoshi-odachi',
  name: 'SATOSHI ODACHI',
  still: 'assets/enemies/satoshi-odachi.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile (head centre ~x0.35 / y0.14 of the 1045x900 still).
  portrait: { headX: 0.35, headY: 0.14, zoom: 4.6 },
  clips: {
    idle: {
      url: 'assets/characters/satoshi-odachi/idle.webm',
      cal: { h: 101.89, bottom: -0.4, left: 50.07 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: committed horizontal odachi cut (motion peak at the measured contact).
        url: 'assets/characters/satoshi-odachi/attack-strike.webm',
        cal: { h: 122.95, bottom: -0.54, left: 48.79 },
        contacts: [1167],
      },
      {
        // Take B: descending diagonal cut (distinct action, same strike family).
        url: 'assets/characters/satoshi-odachi/attack-strike-b.webm',
        cal: { h: 122.46, bottom: -0.53, left: 49.93 },
        contacts: [2250],
      },
    ],
    attack_throw: [
      {
        // Take A: grab-and-slam wrench (solo-safe, no phantom opponent).
        url: 'assets/characters/satoshi-odachi/attack-throw.webm',
        cal: { h: 101.34, bottom: -0.4, left: 50 },
        contacts: [2000],
      },
      {
        // Take B: shoulder barge (solo-safe, faces screen-right throughout).
        url: 'assets/characters/satoshi-odachi/attack-throw-b.webm',
        cal: { h: 123.06, bottom: -0.8, left: 50 },
        contacts: [917],
      },
    ],
    attack_block: [
      {
        // Take A: parry -> counter-punish slash (contact is the counter, not the deflect).
        url: 'assets/characters/satoshi-odachi/attack-block.webm',
        cal: { h: 122.95, bottom: -0.54, left: 50.67 },
        contacts: [2083],
      },
      {
        // Take B: deflect -> rising counter cut.
        url: 'assets/characters/satoshi-odachi/attack-block-b.webm',
        cal: { h: 123.66, bottom: -1.21, left: 50 },
        contacts: [2375],
      },
    ],
    hit: {
      // Sharp whip-back recoil, stays on feet, resolves quickly to guard (reads on re-trigger).
      url: 'assets/characters/satoshi-odachi/hit.webm',
      cal: { h: 122.95, bottom: -0.54, left: 50 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Three takes,
    // one chosen uniform-random per exchange. White steel arcs are baked into the body (sanctioned
    // effect exception); each effect fully dissipates by the final frame (anchor-locked).
    special: [
      {
        // Iai flash-cut: single decisive draw-cut, white steel arc at full extension.
        url: 'assets/characters/satoshi-odachi/special.webm',
        cal: { h: 101.48, bottom: -0.54, left: 51.61 },
        contacts: [1750],
      },
      {
        // Odachi cyclone: full-circle spin finisher (3-hit string at the blade's forward passes).
        url: 'assets/characters/satoshi-odachi/special-b.webm',
        cal: { h: 123.59, bottom: -1.34, left: 50 },
        contacts: [833, 1500, 2167],
      },
      {
        // Rising crescent: explosive rising diagonal slash, white crescent of light at the apex.
        url: 'assets/characters/satoshi-odachi/special-c.webm',
        cal: { h: 122.79, bottom: -0.54, left: 50 },
        contacts: [2083],
      },
    ],
    // ko is the ONE off-anchor clip: drops the odachi, sinks and collapses prone, holds on the
    // ground (does NOT return to the anchor). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/satoshi-odachi/ko.webm',
      cal: { h: 106.17, bottom: -4.83, left: 51.34 },
    },
    // Round-win taunt: odachi flourish then settle back to the anchor.
    victory: {
      url: 'assets/characters/satoshi-odachi/victory.webm',
      cal: { h: 122.79, bottom: -0.54, left: 50.54 },
    },
  },
  quotes: [
    'The crossing is mine. You were only passing through.',
    'One cut. That was all the river asked of me.',
    'Steel remembers nothing. Neither will you.',
    'I have waited by colder waters than your resolve.',
  ],
};
