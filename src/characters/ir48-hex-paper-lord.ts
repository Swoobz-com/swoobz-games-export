import type { FighterDef } from './types';

// IR-48 HEX PAPER LORD — node 10 boss, the FINAL BOSS of the conquest ladder. Black-and-crimson
// oni samurai: wide kasa hat with horns and hanging talisman strips, glowing red oni mask, a large
// crimson war-fan rimmed in gold hexagons, a short reversed blade at the hip. Wired as a node enemy;
// unlocked as a PLAYABLE fighter only after node 10 is beaten (charSelect gate, rosterGating.ts).
//
// The kit was generated on GREEN chroma over sessions 10-14 (13 clips, Seedance 2.0, 4s, 1:1, 720p,
// 97 frames @24fps each), keyed with scripts/key-idle-clips.mjs against
// qa-boss/anchors/ir48-hex-paper-lord-anchor.png and encoded VP9 yuva420p crf30 -auto-alt-ref 0.
// The 13 shipped clips were copied BYTE-IDENTICAL from qa-boss/webm/ — nothing was re-keyed,
// re-encoded or re-timed for this wire.
//
// ANCHOR-LOCK: the whole kit passes qa-boss/check-anchor-lock.mjs against idle f0 — every clip
// starts AND ends on the anchor (f0 0.918-0.957, fLast 0.926-0.951), so no crossfade snaps. `ko` is
// the one exempt end (0.272: it ends down by spec). There is NO degenerate-anchor problem here — the
// action clips agree with the idle, unlike lady-kurotachi's kit, whose idle is the outlier.
//
// `cal`: every value was RE-DERIVED from the SHIPPED webm's own anchor frame with
// qa-boss/rederive-cal.mjs (key-idle-clips.mjs's own contentBBox + computeCal math), NOT taken from
// the keyer's emitted <state>.cal.json. Those emitted files are STALE: green-neutralize runs AFTER
// keying and deletes pixels, which moves the alpha bbox the cal is derived from. Every one of the
// ten emitted cals is off by exactly +0.25 in `h` and -0.24 in `bottom` — a uniform drift that would
// have put the final boss's feet off the arena floor line.
// The re-derive was validated three ways before being trusted: for idle, victory and attack-strike
// the value derived from the lossy VP9 webm is BYTE-IDENTICAL to the value derived from the lossless
// pre-encode PNG dir, so the re-decode contributes no drift of its own here (contrast ir56, where it
// cost up to 0.18 in `h`).
//
// `contacts`: motion-energy argmax (scripts/measure-contacts.mjs, 24fps) with EVERY argmax
// frame-inspected, because on this character the argmax repeatedly landed on the recovery or on the
// tail of a sustained effect rather than on the blow. Overridden after inspection:
//   attack-throw-b  argmax f73 -> f46 (1917ms)   attack-block  argmax f66 -> f52 (2167ms)
//   special-b       argmax f84 -> f40 (1667ms)   special       argmax f58 -> f15 (625ms)
//   special-c       argmax f88 -> f22 (917ms)
// See each clip's note for what the kept frame actually shows. Measured-good (argmax confirmed to be
// the action beat): attack-strike 1667, attack-strike-b 1500, attack-throw 1833, attack-block-b 2583.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/ir48-hex-paper-lord.webp, 659x900).
// It is the ultimate fallback + the source for the HUD medallion / select-tile head-crop; the idle
// clip overlays it once loaded. faces:'right' (the oni mask, the fan arm and the hip blade all lead
// screen-right on both the cutout and the clips) — the roster convention, so NO hflip was needed at
// keying, unlike eclipse. The game mirrors per THE FACING RULE for whichever slot he lands in.
export const IR48_HEX_PAPER_LORD: FighterDef = {
  id: 'ir48-hex-paper-lord',
  name: 'IR-48 HEX PAPER LORD',
  still: 'assets/enemies/ir48-hex-paper-lord.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile. Measured off the cutout: the oni mask centres at
  // ~x269 / y165 of the 659x900 still, which is 0.408 / 0.250 in still-WIDTH units — BOTH axes divide
  // by WIDTH, which is what the crop transform in FightExperience.tsx actually consumes (the image is
  // laid out at width: zoom*100% with height: auto, so a pixel's vertical offset resolves to
  // zoom * y/imgW of the square frame). zoom 3.6 rather than the 4.6 house value because the kasa
  // brim is unusually wide: at 4.2 the brim and the left horn clip the frame, at 3.6 the hat reads
  // whole — horns, talisman strips and mask — with a hint of shoulder, matching ir56's framing.
  portrait: { headX: 0.408, headY: 0.25, zoom: 3.6 },
  clips: {
    idle: {
      // Standing right-profile guard, fan held open at head height: the fan ribs and the hanging
      // talisman strips breathe, the blade rides at the hip. No step, no turn. THE anchor hub.
      url: 'assets/characters/ir48-hex-paper-lord/idle.webm',
      cal: { h: 102.19, bottom: -0.73, left: 51.95 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: step-in horizontal fan slash across the centreline, blade hand trailing.
        url: 'assets/characters/ir48-hex-paper-lord/attack-strike.webm',
        cal: { h: 101.95, bottom: -0.73, left: 50 },
        contacts: [1667],
      },
      {
        // Take B: dropped-shoulder rising cut from the hip, the deepest sink in the ordinary kit.
        url: 'assets/characters/ir48-hex-paper-lord/attack-strike-b.webm',
        cal: { h: 105.6, bottom: -4.38, left: 42.34 },
        contacts: [1500],
      },
    ],
    attack_throw: [
      {
        // Take A: long forward lunge into a fan-edge shove — 174px of travel, the widest ordinary
        // action in the kit, and it still anchor-locks at 0.932/0.929.
        url: 'assets/characters/ir48-hex-paper-lord/attack-throw.webm',
        cal: { h: 101.7, bottom: -0.49, left: 43.2 },
        contacts: [1833],
      },
      {
        // Take B: collar grab and turning throw. The argmax f73 sits in the RECOVERY (he is already
        // rising back toward the anchor from f60 on); the throw itself releases at f46.
        url: 'assets/characters/ir48-hex-paper-lord/attack-throw-b.webm',
        cal: { h: 103.41, bottom: -0.73, left: 58.03 },
        contacts: [1917],
      },
    ],
    attack_block: [
      {
        // Take A: fan snapped shut and braced, then a short counter-punch off the block. The argmax
        // f66 is the brace RELAXING; the counter lands at f52.
        url: 'assets/characters/ir48-hex-paper-lord/attack-block.webm',
        cal: { h: 106.33, bottom: -0.61, left: 47.45 },
        contacts: [2167],
      },
      {
        // Take B: fan opened flat as a shield, absorb, then a shoulder-led shove off the parry.
        url: 'assets/characters/ir48-hex-paper-lord/attack-block-b.webm',
        cal: { h: 100.97, bottom: -0.36, left: 51.21 },
        contacts: [2583],
      },
    ],
    hit: {
      // Universal take: head snaps back, fan arm folds, one recovery step, then home to the anchor.
      // Starts AND ends on the anchor (0.952/0.949) — deliberately NOT the ir37 defect, where the
      // hit clip opens with her back to camera and the crossfade rotates her into the blow.
      url: 'assets/characters/ir48-hex-paper-lord/hit.webm',
      cal: { h: 103.65, bottom: -0.73, left: 40.15 },
    },
    // ko is the ONE off-anchor clip: the fan falls open, he drops to one knee and pitches fully prone,
    // and HOLDS on the ground (does NOT return to the anchor). Cause-free, no opponent.
    ko: {
      url: 'assets/characters/ir48-hex-paper-lord/ko.webm',
      cal: { h: 102.67, bottom: -2.06, left: 53.76 },
    },
    // Round-win taunt: a slow fan sweep across the body and a settle back to the guard.
    victory: {
      url: 'assets/characters/ir48-hex-paper-lord/victory.webm',
      cal: { h: 101.22, bottom: -0.61, left: 54.5 },
    },
    // §11 FINISHER — three takes, each a DIFFERENT signature beat off this fighter's own arsenal
    // (the fan, the hex talismans, the blade). All three carry a character-derived effect built from
    // a SOLID MATERIAL (burning paper, hex charms, a hot blade edge) rather than a flame/glow/aura:
    // a translucent effect over a green plate keys to a muddy olive that no setting recovers.
    special: [
      {
        // Take A — HEX BROADSIDE (Tim's approved look, v5/v6): he drives forward and the war-fan
        // SNAPS OPEN at f14, blasting a wall of burning hex talismans downrange. Contact is the
        // ignition, not the argmax: the burst is fully out by f16 and then SUSTAINS to ~f60, so the
        // f58 argmax is the tail of the held effect, long after the blow has landed.
        url: 'assets/characters/ir48-hex-paper-lord/special.webm',
        cal: { h: 105.84, bottom: -0.73, left: 49.88 },
        contacts: [625],
      },
      {
        // Take B — PAPER PYRE: a low committed crouch (42.7% drop from standing) and a sweeping
        // ignition of talismans off the fan edge. The effect is BURNING PAPER, recast from an earlier
        // translucent gas flame that was unkeyable on green (10.45% retained plate raw; as paper it
        // dropped to 3.30%). The argmax f84 is the rise out of the crouch; the sweep lands at f40.
        url: 'assets/characters/ir48-hex-paper-lord/special-b.webm',
        cal: { h: 104.38, bottom: -3.65, left: 60.1 },
        contacts: [1667],
      },
      {
        // Take C — DRAWN LINE: he sinks into a wide braced stance (24% drop) and draws the short
        // blade in one horizontal cut, leaving a hot white-gold edge across the full frame. Beat:
        // stance drop f18, lunge f20, edge ignites f22, full extension by f23 and HELD to ~f84.
        // The f88 argmax is the return-to-anchor recovery; the cut lands at f22.
        // KEYING NOTE: the blade's bloom LIT the green plate around it, and those brightened plate
        // pixels sat far enough from the sampled green to survive the key — green-neutralize then
        // pushed them to r==g, wrapping the blade in a wide olive halo (3.04% of all visible pixels).
        // It was cut, not tinted (qa-boss/cut-bloom-plate.mjs): that halo is lit BACKDROP, not part
        // of the effect, so recolouring it warm would have shipped a fabricated bloom shaped like the
        // plate. After the cut, olive is 0.00% and the retained core is the blade itself.
        url: 'assets/characters/ir48-hex-paper-lord/special-c.webm',
        cal: { h: 101.46, bottom: -0.85, left: 52.43 },
        contacts: [917],
      },
    ],
  },
  quotes: [
    'Every name I take gets its own paper. Yours is already written.',
    'The fan opens once. That is all the room you get.',
    'You climbed ten gates to kneel at the last one.',
    'Ash settles quiet. So will you.',
  ],
};
