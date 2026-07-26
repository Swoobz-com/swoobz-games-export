import type { FighterDef } from './types';

// IR-56 LION-SERPENT — node 8 boss (RED MIST GORGE). Mechanical lion-serpent: gold + green armoured
// body, lion head and mane, segmented serpent tail, chained cleaver. Wired as a node enemy (phase 24h);
// unlocked as a PLAYABLE fighter only after node 8 is beaten (charSelect gate).
//
// The kit was generated on MAGENTA chroma (green screen was impossible: the body armour IS green), QA
// passed per contract §6, keyed with scripts/key-idle-clips.mjs against qa-boss/anchors/ir56-lion-serpent-anchor.png,
// per-edge feathered and encoded VP9 yuva420p. The 12 shipped clips were copied BYTE-IDENTICAL from
// qa-boss/webm/ — nothing was re-keyed, re-encoded or re-timed for this wire.
//
// `cal`: every value is the keyer's own emitted number from qa-boss/ir56-lion-serpent-clipdata.json.
// No `<state>.cal.json` files were emitted for this character, so each value was independently
// RE-DERIVED from the shipped webm's anchor frame with the keyer's own contentBBox + computeCal math
// as a cross-check. All twelve invert to the SAME still geometry (onH 1.0000 / onBG 0.0000 / onCX
// 0.5000 of the 1536x1536 anchor PNG, spread <= 0.0015), which is the identical convention SATOSHI's
// shipped cals invert to — so there is no stale-still block here (the trap sora-yari hit). The forward
// re-derive reproduces 8 of 12 byte-exact; the other 4 differ by at most 0.18 in `h` / 0.07 in `left`
// (a 1px alpha-bbox shift from the lossy VP9 re-decode), so the keyer-emitted values are kept.
//
// `contacts`: MEASURED motion-energy argmax over the shipped frames at 24fps
// (scripts/measure-contacts.mjs), and every argmax was frame-inspected (blade-centroid track) to
// confirm it is the action beat and NOT the return-to-anchor recovery. NOTE attack-block-b: the QA
// sheet recorded 3000 (f72), but f72 sits inside the RECOVERY lift (the blade travels back up from the
// low chop to the anchor over f70..f79). The real counter chop is the drop from the guard brace, blade
// falling f48..f52, argmax f50 -> 2083. The measured value is used.
//
// `attack_throw` ships a SINGLE take (the shoulder-barge, source throw_b). The intended take A
// (grab-slam) FAILED QA on a sustained front torso rotation and is queued for a re-roll; it drops into
// this list as a second element with no other change.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/ir56-lion-serpent.webp, 1350x900). It
// is the ultimate fallback + the source for the HUD medallion / select-tile head-crop; the idle clip
// overlays it once loaded. faces:'right' (verified at full res on the cutout AND on the clips: lion
// muzzle, open jaw and the cleaver arm all lead screen-right, serpent tail loops behind to the left);
// the game mirrors per THE FACING RULE for whichever slot he lands in. NO hflip.
export const IR56_LION_SERPENT: FighterDef = {
  id: 'ir56-lion-serpent',
  name: 'IR-56 LION-SERPENT',
  still: 'assets/enemies/ir56-lion-serpent.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile. Measured off the cutout: the lion face (eye to
  // jaw) centres at ~x545 / y225 of the 1350x900 still, which is 0.404 / 0.167 in still-WIDTH units
  // (what the medallion transform consumes for BOTH axes). zoom 3.8 rather than the 4.6 house value
  // because the mane makes the head unusually wide: at 4.6 the crop clips the mane and the muzzle
  // slides off frame, at 3.8 the head reads whole with a hint of shoulder, matching satoshi's framing.
  portrait: { headX: 0.404, headY: 0.167, zoom: 3.8 },
  clips: {
    idle: {
      // Planted wide stance, cleaver held forward: mane and chain breathe, the serpent tail idles.
      // No step, no turn. Anchor-locked f0/f96.
      url: 'assets/characters/ir56-lion-serpent/idle.webm',
      cal: { h: 102.05, bottom: -0.55, left: 50.21 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: compact overhead cleaver chop to the ground, green flash on the blade at the
        // landing. Contact = the blade arriving low (f40), not the held follow-through.
        url: 'assets/characters/ir56-lion-serpent/attack-strike.webm',
        cal: { h: 125.14, bottom: -0.55, left: 51.02 },
        contacts: [1667],
      },
      {
        // Take B: cleaver hook across the front (distinct action, same strike family). Contact = the
        // apex of the sweep, where the blade reaches its furthest forward point (f41).
        url: 'assets/characters/ir56-lion-serpent/attack-strike-b.webm',
        cal: { h: 125.14, bottom: -0.55, left: 50 },
        contacts: [1708],
      },
    ],
    // SINGLE take for now: the grab-slam take A failed QA (front torso rotation) and is queued for a
    // re-roll. A one-element list is exactly equivalent to a bare clip (clipVariants §10), so the
    // re-rolled take drops in here as a second element with no other edit.
    attack_throw: [
      {
        // Take B (shipped as the only take): low shoulder-barge shove, weapon arm trailing back.
        // Solo-safe, empty air, no phantom opponent. Contact = the barge (f42).
        url: 'assets/characters/ir56-lion-serpent/attack-throw.webm',
        cal: { h: 114.21, bottom: -2.73, left: 49.93 },
        contacts: [1750],
      },
    ],
    attack_block: [
      {
        // Take A: arm-only cleaver guard into a short counter chop. Contact = the counter (f38), not
        // the guard raise.
        url: 'assets/characters/ir56-lion-serpent/attack-block.webm',
        cal: { h: 118.19, bottom: -0.55, left: 51.09 },
        contacts: [1583],
      },
      {
        // Take B: forearm brace into a short LOW counter chop. Contact = the chop dropping out of the
        // brace (f50). The QA sheet's 3000 was the recovery lift back to the anchor, so it is not used.
        url: 'assets/characters/ir56-lion-serpent/attack-block-b.webm',
        cal: { h: 109.02, bottom: -0.55, left: 50 },
        contacts: [2083],
      },
    ],
    hit: {
      // Sharp head/torso stagger back with the mane and tail flaring, quick recover to the guard
      // stance (re-trigger-safe whole-body react, not a slow topple).
      url: 'assets/characters/ir56-lion-serpent/hit.webm',
      cal: { h: 105.34, bottom: -0.55, left: 50.75 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Three takes,
    // one chosen uniform-random per exchange. Green/gold/white effects are baked into the body
    // (sanctioned effect exception); each burst dissipates by the final frame (anchor-locked).
    special: [
      {
        // Roar burst: mouth-anchored green core with gold and white spray. Contact = the burst (f32).
        url: 'assets/characters/ir56-lion-serpent/special.webm',
        cal: { h: 119.29, bottom: -0.55, left: 49.59 },
        contacts: [1333],
      },
      {
        // Tail strike: the serpent tail loops overhead and whips down into a green/white impact
        // starburst. Contact = the whip landing (f27).
        url: 'assets/characters/ir56-lion-serpent/special-b.webm',
        cal: { h: 131.15, bottom: -6.56, left: 49.93 },
        contacts: [1125],
      },
      {
        // Cleaver flash: overhead raise into a green/teal/white spark burst at the blade. Contact =
        // the spark (f53).
        url: 'assets/characters/ir56-lion-serpent/special-c.webm',
        cal: { h: 126.95, bottom: -2.19, left: 50 },
        contacts: [2208],
      },
    ],
    // ko is the ONE off-anchor clip: the chained cleaver drops, he sinks and crumples fully prone and
    // HOLDS on the ground (does NOT return to the anchor). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/ir56-lion-serpent/ko.webm',
      cal: { h: 105.46, bottom: -4.92, left: 48.36 },
    },
    // Round-win taunt: proud cleaver flourish to head height and a roar, then settle to the anchor.
    victory: {
      url: 'assets/characters/ir56-lion-serpent/victory.webm',
      cal: { h: 125.14, bottom: -0.55, left: 51.37 },
    },
  },
  quotes: [
    'The gorge keeps what it takes. I only carry them down.',
    'You heard the chain move. That was the whole warning.',
    'Red mist hides the drop. It never hides me.',
    'Lion above, serpent below. Both of us were hungry.',
  ],
};
