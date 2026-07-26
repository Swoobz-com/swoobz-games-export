import type { FighterDef } from './types';

// THORN WARDEN — node 3 boss (WHISPERING BAMBOO). Bark-skinned forest yokai: an antler crown hung with
// dark-crimson blossoms, black ink tattoos over pale heartwood, black hakama, and a thorned club cut
// from the same tree. Heavy, rooted, unhurried. Wired as a node enemy (phase 24g); unlocked as a
// PLAYABLE fighter only after node 3 is beaten (charSelect gate).
//
// The 10-clip FACING-LOCKED kit was generated on GREEN, QA-passed per contract §6, keyed with the
// standard green pipeline (key-idle-clips -> green-despill -> green-neutralize) and encoded VP9 alpha
// on 2026-07-24. The clips were wired BYTE-IDENTICAL from qa-boss/webm/ — nothing was re-keyed.
//
// `cal`: the values EMITTED by the keyer in that pass, recorded on the clip sheet
// (qa-boss/thorn-warden-clipdata.json) and mirrored into qa-boss/webm/thorn-warden-<state>.cal.json.
// Each one was independently re-derived from the shipped webm's anchor frame with the keyer's own
// contentBBox + computeCal math and agrees to within a 1-2px alpha-bbox rounding (<=0.28 in h), which
// is the expected VP9-alpha decode drift against the lossless PNGs the keyer measured.
//
// `contacts`: MEASURED motion-energy argmax over the shipped frames at 24fps
// (scripts/measure-contacts.mjs), then frame-inspected AND weapon-reach-traced (per-frame extremum of
// the opaque mask) to confirm each fires when the club is at the impact plane and not on the wind-up
// or the return to the anchor. Where the raw argmax failed that test it was replaced by the verified
// impact frame; every deviation is noted on the take.
//
// VIOLATION SHIPPED KNOWINGLY (Tim's call): attack-block take A carries a BAKED white impact-flash at
// the club tip on the counter jab (f48), which breaks the effect-free-body rule of §7. It is a clean
// white-on-transparent pop, not a keying artifact, and ships as-is pending a regen decision.
//
// No `special`: this is a session-2 kit with no signature finisher, so `special` is OMITTED and a
// round-ending win correctly plays the normal attack clip.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/thorn-warden.webp, h900). It is the
// ultimate fallback + the source for the HUD medallion / select-tile head-crop; the idle clip overlays
// it once loaded. faces:'right' (head + body face screen-right at full res); the game mirrors per THE
// FACING RULE for whichever slot he lands in.
export const THORN_WARDEN: FighterDef = {
  id: 'thorn-warden',
  name: 'THORN WARDEN',
  still: 'assets/enemies/thorn-warden.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile. Measured off the cutout: the antler crown spans
  // y20..y185 and the face y175..y250 of the 900x900 still, so the crop is centred between the two at
  // ~x458 / y180 = x0.509 / y0.200 in still-WIDTH units (what the medallion transform consumes for
  // BOTH axes). zoom 4.1 (vs the 4.6 house value) so the antler crown — his whole silhouette identity —
  // still reads inside the medallion instead of being cropped to bare face.
  portrait: { headX: 0.509, headY: 0.2, zoom: 4.1 },
  clips: {
    idle: {
      // Rooted breathing idle, club held out low to the right; the blossoms shiver on the antlers. No
      // step, no frontal rotation (facing-locked take, verified frame-by-frame). Anchor-locked f0/f96.
      url: 'assets/characters/thorn-warden/idle.webm',
      cal: { h: 101.82, bottom: -0.61, left: 50.18 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: overhead club smash. Contact = f67, the frame the club sweeps through its furthest
        // forward reach (the argmax AND the reach-trace peak agree). The value previously pencilled on
        // the QA sheet (3000ms / f72) was re-measured and rejected: by f72 the club has already
        // retracted and the arm is climbing back to the anchor pose.
        url: 'assets/characters/thorn-warden/attack-strike.webm',
        cal: { h: 111.89, bottom: -1.33, left: 50.24 },
        contacts: [2792],
      },
      {
        // Take B: horizontal thrust-sweep. Contact = f38, inside the full extension the club reaches at
        // f36 and HOLDS past f45. The raw argmax (f32 / 1333ms) is the coil sweeping across his body
        // before the thrust leaves, so it was rejected as a wind-up beat.
        url: 'assets/characters/thorn-warden/attack-strike-b.webm',
        cal: { h: 111.44, bottom: -0.61, left: 50.24 },
        contacts: [1583],
      },
    ],
    attack_throw: [
      {
        // Take A: grab-and-slam, solo-safe (the claw closes through empty air, no phantom opponent).
        // §9 COMBO-STRING: two blows. 1917 = f46, the grab at full extension (the argmax). 2208 = f53,
        // the club driven back down after the overhead raise (the local energy peak of that descent).
        // The 3375ms second contact pencilled on the QA sheet was re-measured and rejected: at f81 the
        // reach is at its MINIMUM and climbing straight back to the anchor value, i.e. pure recovery.
        url: 'assets/characters/thorn-warden/attack-throw.webm',
        cal: { h: 111.54, bottom: -0.85, left: 50.24 },
        contacts: [1917, 2208],
      },
      {
        // Take B: two-hand barge into a club shove, solo-safe. §9 COMBO-STRING: two blows. 1333 = f32,
        // the barge at its forward-reach peak (the raw argmax f36 is its follow-through). 2958 = f71,
        // where the club thrust reaches full extension, 226px past the anchor pose before retracting;
        // the 2833ms on the QA sheet is 3 frames earlier, with the club only 61% of the way out.
        url: 'assets/characters/thorn-warden/attack-throw-b.webm',
        cal: { h: 107.65, bottom: -1.94, left: 62.94 },
        contacts: [1333, 2958],
      },
    ],
    attack_block: [
      {
        // Take A: guard, then a counter jab. Contact = f48, the jab (the argmax; the baked white flash
        // noted above ignites on exactly that frame, so the beat is unambiguous).
        url: 'assets/characters/thorn-warden/attack-block.webm',
        cal: { h: 111.3, bottom: -0.61, left: 51.34 },
        contacts: [2000],
      },
      {
        // Take B: forearm guard into a rising club deflect, no baked effects. Contact = f53, where the
        // club engages and starts the rise (blocks fire on the catch, not the apex).
        url: 'assets/characters/thorn-warden/attack-block-b.webm',
        cal: { h: 111.06, bottom: -0.36, left: 50.18 },
        contacts: [2208],
      },
    ],
    hit: {
      // Head-snap recoil, bark chips and blossoms flying off the antlers (real debris, clean alpha,
      // fully settled by the last frame), then a clean recover to the anchor. Cause-free, no opponent.
      url: 'assets/characters/thorn-warden/hit.webm',
      cal: { h: 116.65, bottom: -5.95, left: 47.33 },
    },
    // ko is the ONE off-anchor clip: stagger, knee, full prone collapse with the club beside the body,
    // HOLDING the ground pose to f96 (no re-rise, no return to the anchor). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/thorn-warden/ko.webm',
      cal: { h: 106.44, bottom: -5.83, left: 53.89 },
    },
    // Round-win taunt: rises to full upright with the club lowered at his side and the eyes glowing
    // red, holds the dominant stance, then settles back toward the anchor.
    victory: {
      url: 'assets/characters/thorn-warden/victory.webm',
      cal: { h: 104.5, bottom: -0.85, left: 58.93 },
    },
  },
  quotes: [
    'The bamboo closed behind you. It does that for everyone.',
    'Roots take their time. So do I.',
    'You cut wood today. Wood does not bleed, and wood does not stop.',
    'Lie down. Something green will be glad of you by spring.',
  ],
};
