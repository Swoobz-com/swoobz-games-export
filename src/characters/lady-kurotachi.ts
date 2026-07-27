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
//
// FACING FIX 2026-07-27 (phase 26). `node scripts/check-facing.mjs lady-kurotachi` MEASURED that 11 of
// her 13 clips faced screen-LEFT: they had been generated from the MIRRORED plate
// qa-boss/anchors/lady-kurotachi-anchor-green-r.png, while idle, ko and the still came from the
// non-`-r` plate. faces:'right' was CORRECT (it agrees with the still + idle + ko, which drive the HUD
// medallion, select tile and the default pose), so the 11 clips were flipped, not the field.
// All 11 were RE-KEYED FROM RAW with `hflip` applied at the FRAME level before keying (zero generation
// loss); every take of record was preserved (hit still head-trimmed to f10+, strike_b still the v3
// black-blade take). Proof: the new keyed frames are BIT-EXACT mirrors of the archived keyed frames in
// qa-boss/keyed/ (0.0000% differing pixels), and every union bbox is unchanged in size.
// cal: `h` and `bottom` are flip-invariant and did NOT change on any clip. `left` DID have to change —
// the keyer crops to the UNION action bbox, so a clip's f0 subject is generally OFF-CENTRE inside its
// own frame; the keyer positions by `left = 100*onCX - h*(cxFracV - 0.5)*AR`, and a mirror sends
// cxFracV -> 1 - cxFracV, i.e. left -> 200*onCX - left. Her still is horizontally centred (onCX = 0.5),
// so the emitted values come out as left_new = 100 - left_old (+-0.13 on the three clips whose raw
// union bbox was ODD-width, where the keyer's `if (cw % 2) cw--` drops the rightmost column and shifts
// the crop window 1px). Every value below is the keyer's OWN emission (qa-boss/webm/*.cal.json), never
// hand-derived. `contacts` are timings and are unaffected by a horizontal flip — untouched.
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
        cal: { h: 110.49, bottom: -0.18, left: 53.98 },
        contacts: [1667],
      },
      {
        // Take B: deep-coil committed step-in thrust held at chest height (distinct action, same family).
        // SWAPPED TO TAKE v3 on 2026-07-26 (animation<->character sweep): the shipped encode was
        // take v4, whose blade renders BRIGHT SILVER polished steel - longer, broader, with an
        // ornate tsuba - for f52-f80. Her one hard blade rule is BLACK. The clipdata note had the
        // takes INVERTED (it claimed v3 was the silver one); a v3-vs-v4-vs-shipped frame comparison
        // proved otherwise. v3 keys to the correct black blade with crimson rings, so this needed no
        // new generation - just a re-key of the raw already on disk. v4 archived at
        // qa-boss/webm/lk-strikeb-v4-SILVER-backup.webm.
        // cal re-emitted by the keyer for v3; contact = arrival at FULL EXTENSION (f36), verified on
        // a blade-reach trace (reach climbs to 671px at f36 then holds) - the f23 motion-energy
        // argmax is mid-thrust, not the landing.
        url: 'assets/characters/lady-kurotachi/attack-strike-b.webm',
        cal: { h: 100.36, bottom: -0.18, left: 52.17 },
        contacts: [1500],
      },
    ],
    attack_throw: [
      {
        // Take A: violent seize -> deep wrenching slam through empty air (solo-safe, no phantom).
        url: 'assets/characters/lady-kurotachi/attack-throw.webm',
        cal: { h: 102.29, bottom: -0.18, left: 41.68 },
        contacts: [1833],
      },
      // Take B (attack-throw-b.webm) PULLED 2026-07-26 (animation<->character sweep): the clip is
      // MIRRORED - visor on the left, sword in the screen-LEFT hand, she faces screen-LEFT for the
      // entire take while her still, her idle and all 12 other clips face RIGHT. In game she flips
      // to face AWAY from her opponent for the whole take and snaps back. Compounding it, her sword
      // hand and hilt are sliced flat at the left frame edge (0px margin) continuously f44-f64 on a
      // HELD lunge. No clean fallback take exists (throw_b v2 failed on a phantom cylinder +
      // frontal rotation), so this needs a genuine re-roll with an explicit facing lock.
    ],
    attack_block: [
      {
        // Take A: snap into level chest-height horizontal guard -> coiled diagonal counter.
        url: 'assets/characters/lady-kurotachi/attack-block.webm',
        cal: { h: 112.42, bottom: -2.59, left: 55.07 },
        contacts: [583],
      },
      {
        // Take B: raise to level chest-height blade brace (white catch-gleam) -> low counter.
        url: 'assets/characters/lady-kurotachi/attack-block-b.webm',
        cal: { h: 101.09, bottom: -0.18, left: 50.84 },
        contacts: [958],
      },
    ],
    hit: {
      // Sharp head/torso whip-back stagger (neon trim flares), quick recovery to stance, on feet.
      url: 'assets/characters/lady-kurotachi/hit.webm',
      cal: { h: 104.95, bottom: -0.2, left: 44.51 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Three takes,
    // one chosen uniform-random per exchange. The hot-pink/crimson/white light is baked into the body
    // (sanctioned effect exception, never green); each effect fully dissipates by the final frame.
    special: [
      {
        // Crimson crescent: explosive rip + bright crimson-white crescent in front, fades to anchor.
        url: 'assets/characters/lady-kurotachi/special.webm',
        cal: { h: 100.36, bottom: -0.18, left: 46.38 },
        contacts: [750],
      },
      {
        // Petal-spark flurry: tight pink-white swirl + scattering sparks tight to the torso.
        url: 'assets/characters/lady-kurotachi/special-b.webm',
        cal: { h: 116.08, bottom: -5.5, left: 46.13 },
        contacts: [917],
      },
      // Snap-down cut (special-c.webm) PULLED 2026-07-26 (animation<->character sweep): the blade
      // renders BRIGHT SILVER/steel through the whole horizontal chest-height hold (f26-f58, ~1.4s)
      // - her one hard blade rule is BLACK. This was the take the ledger already marked
      // "conditional: steel-hold" and it should not have shipped on a FINISHER that fires on every
      // round-ending win. Re-roll with the blade-colour lock. She keeps 2 good finisher takes.
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
      cal: { h: 106.15, bottom: -0.18, left: 40.35 },
    },
  },
  quotes: [
    'The gates answer to me. You answered to no one worth naming.',
    'I do not hold the crimson line. I am the crimson line.',
    'Kneel at the gate or fall before it. You chose to fall.',
    'Every warlord before you is a name on my blade. Now you.',
  ],
};
