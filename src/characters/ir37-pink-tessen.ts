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
      cal: { h: 102.19, bottom: -0.49, left: 49.88 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: one committed dagger thrust to full extension screen-right.
        url: 'assets/characters/ir37-pink-tessen/attack-strike.webm',
        cal: { h: 102.19, bottom: -0.73, left: 50 },
        contacts: [2167],
      },
      {
        // Take B: fan SNAPS open mid-swing into a big glowing pink arc cleave (distinct action,
        // same strike family). Arc grazes the top frame edge (~f23-38) -> 48px top feather.
        url: 'assets/characters/ir37-pink-tessen/attack-strike-b.webm',
        cal: { h: 111.44, bottom: -0.49, left: 54.26 },
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
      // FACING FIX (phase 26): this take was generated MIRRORED (faced screen-LEFT while the rest of
      // the kit + the still face RIGHT), so it rendered facing away from the opponent in BOTH slots.
      // Re-keyed from qa-boss/raw/ir37-hit.mp4 with hflip applied at the FRAME level before the key
      // (no extra generation), same pink-safe keyer, then the same f0-f11 head-trim (phase 24j rocket).
      // cal is the keyer-EMITTED value for the flipped frames: h/bottom unchanged (a horizontal flip
      // touches neither), left 55.96 -> 44.04 (= 100 - 55.96, the mirror about the still's content
      // centre at 50%), which holds her at the same stage x. contacts unaffected (timings).
      url: 'assets/characters/ir37-pink-tessen/hit.webm',
      cal: { h: 102.92, bottom: -0.49, left: 44.04 },
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
    // Round-win taunt: she snaps the fan shut, spins it once between her fingers, sweeps it ACROSS her
    // body at chest height and snaps it wide open there, shedding solid hot-pink lotus petals that
    // drift down; then settles back to the anchor. Body stays upright and planted — only the arms move.
    //
    // RE-ROLLED (phase 53, v5). The phase-26 clip was a FACING DEFECT, not the "intentional celebration
    // stance" the handoff had it down as: measured f0 0.362 / fLast 0.361 against her idle anchor, never
    // reaching 0.90 on ANY frame, and qa-boss/check-turn.mjs flagged a 70-of-97-frame run at gain 0.861
    // — at f43 the fan is on her LEFT while the idle holds it on her RIGHT. The phase-26 hflip corrected
    // which SIDE she faced and never touched the pose, so it could not fix this.
    // v5 measures: containment CLEAN, plate retention 0.00%/0.00%, turn gate 0/97, anchor-lock f0 0.993
    // / fLast 0.981, body-commitment minIoU 0.180 / travel 96 / 68% strong / spanPeak 1.32 (comparable
    // to the clip it replaces, so the re-roll did not cost energy).
    // Getting here took 5 rolls, and the two dead ends are recorded in qa-boss/prompts/ir37-pink-tessen.md:
    // v3 RAISED the fan (TOP 216px overrun) and v4 LOWERED it (fLast 0.213 — she sinks and holds, never
    // returning to anchor). Both are LEVEL changes, and per the measured IR37 FRAME BUDGET she has only
    // 88px of headroom with a ~250px fan, so the flourish had to become LATERAL with the body held still.
    // cal RE-DERIVED from the shipped webm (drift 0.13 vs the keyer-emitted value, i.e. a match).
    victory: {
      url: 'assets/characters/ir37-pink-tessen/victory.webm',
      cal: { h: 110.46, bottom: -3.89, left: 57.79 },
    },
  },
  quotes: [
    'Every angle calculated. Your defeat was only arithmetic.',
    'The fan opens. The fan closes. You end between them.',
    'Precision does not celebrate. It simply concludes.',
    'You fought a pattern you could never read.',
  ],
};
