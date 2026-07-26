import type { FighterDef } from './types';

// SORA YARI — node 1 boss (KUROHAMA DOCKS). Lacquered grey-steel ashigaru armour, black face mask,
// ringed yari (the loose iron rings sing on every thrust). Long-reach, patient spear work. Wired as a
// node enemy (phase 24g); unlocked as a PLAYABLE fighter only after node 1 is beaten (charSelect gate).
//
// The 10-clip kit is the ORIGINAL session-1 keyed set (magenta chroma), QA-passed per contract §6 and
// encoded VP9 alpha. It is Tim's ALIVENESS BENCHMARK, so the clips were wired BYTE-IDENTICAL from
// qa-boss/webm/ — nothing was re-keyed, re-encoded or re-timed for this wire.
//
// `cal`: six states (block-a/b, hit, ko, throw-b, victory) carry the keyer's own emitted
// qa-boss/webm/sora-yari-<state>.cal.json. The other four (idle, strike-a/b, throw-a) never had a
// cal.json emitted against THIS still, so they were RE-DERIVED from the shipped webm's anchor frame
// with the keyer's own contentBBox + computeCal math (scripts/key-clips-green-pinksafe.mjs), using the
// still metrics recovered from the six known cals. That derivation reproduces all six known values
// (5/6 byte-exact, 1 off by 0.07 in `left` = a 1px alpha-bbox rounding), so the four derived values are
// keyer-faithful and NOT hand-tuned. The stale cal block in qa-boss/sora-yari-clipdata.json for
// idle/strike_a/strike_b (h 74.75 / 74.97 / 96.58) is from an EARLIER keying pass against a different
// `--still` (every one of them is exactly 0.7320x these values) and would shrink him by a third
// between states, so it is deliberately NOT used.
//
// `contacts`: MEASURED motion-energy argmax over the shipped frames at 24fps
// (scripts/measure-contacts.mjs). All six reproduce the values already recorded on the QA sheet
// exactly, and each argmax was frame-inspected to confirm it is the action beat, not the
// return-to-anchor recovery.
//
// No `special`: this is a session-1 kit with no signature finisher, so `special` is OMITTED and a
// round-ending win correctly plays the normal attack clip.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/sora-yari.webp, h900). It is the
// ultimate fallback + the source for the HUD medallion / select-tile head-crop; the idle clip overlays
// it once loaded. faces:'right' (head + body face screen-right at full res); the game mirrors per THE
// FACING RULE for whichever slot he lands in.
export const SORA_YARI: FighterDef = {
  id: 'sora-yari',
  name: 'SORA YARI',
  still: 'assets/enemies/sora-yari.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile. Measured off the cutout: helmet crown to mask
  // bottom spans y18..y170 of the 1221x900 still with its x centre at ~395px, so the head centre is
  // ~x0.3235 in still-WIDTH units (which is what the medallion transform consumes for BOTH axes).
  // headY is set to 0.100 rather than the true 0.077 because the helmet sits hard against the top of
  // the cutout: centring on it would pull the crop window above the image and leave a bare arc in the
  // medallion. zoom 5.0 (higher than the 4.6 house value) because this still is the widest in the
  // roster (1221px) and the figure reads small inside it.
  portrait: { headX: 0.3235, headY: 0.1, zoom: 5.0 },
  clips: {
    idle: {
      // Planted spear-across guard: subtle breathing and weight-shift, the ring-cluster on the haft
      // ticking. No step, no turn. Anchor-locked f0/f96.
      url: 'assets/characters/sora-yari/idle.webm',
      cal: { h: 102.11, bottom: -0.6, left: 49.92 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: committed straight yari thrust. NOTE the spear reaches full extension early (f21)
        // and HOLDS it to f63; the measured argmax (f64) is the final extension frame where the haft
        // snaps back, which is what the QA sheet already recorded. It is not recovery (the return to
        // the anchor runs f69+), but it fires at the END of the held extension rather than at its
        // arrival — flagged for Tim, kept at the QA'd value rather than re-timed unilaterally.
        url: 'assets/characters/sora-yari/attack-strike.webm',
        cal: { h: 102.41, bottom: -0.6, left: 51.81 },
        contacts: [2667],
      },
      {
        // Take B: overhead spear chop (distinct action, same strike family). Contact = the chop.
        url: 'assets/characters/sora-yari/attack-strike-b.webm',
        cal: { h: 131.93, bottom: -0.6, left: 48.49 },
        contacts: [1917],
      },
    ],
    attack_throw: [
      {
        // Take A: hooking haft pull (solo-safe, empty air, no phantom opponent). Contact = the hook.
        url: 'assets/characters/sora-yari/attack-throw.webm',
        cal: { h: 137.54, bottom: -7.21, left: 50.15 },
        contacts: [1583],
      },
      {
        // Take B: shaft shove-barge (solo-safe, empty air). Contact = the barge.
        url: 'assets/characters/sora-yari/attack-throw-b.webm',
        cal: { h: 104.52, bottom: -1.2, left: 50 },
        contacts: [2583],
      },
    ],
    attack_block: [
      {
        // Take A: shaft-up deflect guard into a butt-end jab counter. Per the clip's QA sheet the
        // contact peak is the GUARD-RAISE apex (blocks firing on the catch rather than the counter is
        // the sanctioned form — cf. hollow-pale take A), with the jab following after.
        url: 'assets/characters/sora-yari/attack-block.webm',
        cal: { h: 137.95, bottom: -0.6, left: 48.34 },
        contacts: [2917],
      },
      {
        // Take B: low deflect into a rising counter sweep. Contact = the counter.
        url: 'assets/characters/sora-yari/attack-block-b.webm',
        cal: { h: 144.58, bottom: -7.23, left: 51.88 },
        contacts: [2833],
      },
    ],
    hit: {
      // Whip-back recoil, stays on his feet, resolves quickly back to guard (reads on re-trigger).
      url: 'assets/characters/sora-yari/hit.webm',
      cal: { h: 136.14, bottom: -0.6, left: 50 },
    },
    // ko is the ONE off-anchor clip: the yari drops, he sinks and collapses, and HOLDS on the ground
    // (does NOT return to the anchor). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/sora-yari/ko.webm',
      cal: { h: 108.13, bottom: -7.23, left: 51.81 },
    },
    // Round-win taunt: spear flourish then settle back to the anchor.
    victory: {
      url: 'assets/characters/sora-yari/victory.webm',
      cal: { h: 140.36, bottom: -3.01, left: 50.45 },
    },
  },
  quotes: [
    'The docks are mine. Nothing lands here without my leave.',
    'You closed the distance. That was the whole mistake.',
    'The rings sing once. You never hear them twice.',
    'Go back to the water. It is kinder than the point.',
  ],
};
