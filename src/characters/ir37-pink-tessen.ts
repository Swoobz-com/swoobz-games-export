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
        // Take B: the fan rides up overhead, then SNAPS down across the body in a glowing hot-pink
        // arc cleave that sheds solid lotus petals (distinct action, same strike family).
        //
        // RE-ROLLED (phase 96, v4) from qa-boss/raw/ir37-attack-strike-b-v4.mp4 (97 frames, bbox
        // 606x946). SUPERSEDES the phase-23 file, and fixes its top-edge graze: v4 measures
        // containment CLEAN on TOP/LEFT/RIGHT with NO feather at all (the old take needed a 48px top
        // feather because the arc grazed the top edge ~f23-38).
        // KEYER: scripts/key-clips-green-pinksafe.mjs — NOT key-idle-clips.mjs. The stock keyer is
        // magenta-tuned and pink IS magenta-family, so it crushes her hot-pink trim to mauve and
        // destroys the character. The pink-safe fork left the plate so clean that the mandatory
        // green-neutralize HARD=4 pass removed ZERO pixels and cut-bloom-plate cut zero.
        // Measures: plate retention BEFORE neutralize 0.00% (clean — not a post-neutralize
        // tautology, this is the real reading on the keyed frames); matte-proof 0 green-dominant px
        // over black AND white. VIEWED at full size over white: the trim is still saturated neon
        // fuchsia, the fan ribs read individually and the silhouette is not chewed.
        // cal is the keyer-emitted value AND the re-derived value — they agree exactly, drift 0.00,
        // which follows from neutralize having deleted nothing that could move the alpha bbox.
        // contacts: motion-energy argmax f21 (875ms), FRAME-CHECKED — f_017-f_019 hold the fan high,
        // f_020-f_023 are the downward cleave, and f_022 (index 21) is the fan at the bottom of its
        // sweep with the arc at peak brightness and the petals bursting. That is the impact, not the
        // recovery. The old 1417ms belonged to the superseded take and now lands in the petal drift.
        url: 'assets/characters/ir37-pink-tessen/attack-strike-b.webm',
        cal: { h: 115.09, bottom: -5.84, left: 48.66 },
        contacts: [875],
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
      // Front-facing recoil: her head snaps back and her chest caves as she gives a short half-step,
      // the war-fan pulled TIGHT across her chest, shedding solid hot-pink lotus petals that drift
      // down; she catches her balance and flows back to the anchor. She takes it in the CHEST and
      // FACE — never the back.
      //
      // RE-ROLLED (phase 53, v6). THIS IS TIM'S NODE-7 BUG: *"the 7 map boss when she get hit her
      // model turns because she get hit in the back and then turns back."* `hit` fires nearly every
      // exchange, so it was the most-seen animation in the game. Measured on the old clip: f0 0.324 /
      // fLast 0.132 against her idle anchor, no frame anywhere reaching 0.90 (max 0.347), and
      // qa-boss/check-turn.mjs flagged a 28-frame run at gain 0.861. NOT fixable without a re-roll:
      // hflipping it gives fLast 0.993 but f0 0.174, i.e. the START pose is wrong in BOTH
      // orientations — which is why the phase-26 hflip (recorded in the comment this replaces)
      // corrected which SIDE she faced and could never fix the pose.
      // v6 measures: containment CLEAN, plate retention 0.00%/0.00%, turn gate 0/97, anchor-lock
      // f0 0.992 / fLast 0.989, body-commitment minIoU 0.227 / travel 76 / 68% strong / spanPeak 1.19.
      //
      // Six rolls, and the two that mattered are recorded in qa-boss/prompts/ir37-pink-tessen.md:
      //  - v2..v4 all baked an IMPACT STREAK flying in from off-frame. That is a contract §7 violation
      //    as well as a containment one — the engine draws its own frost ring / hitspark / "-1"
      //    floater, so a baked beam DOUBLE-RENDERS the hit. An explicit "NO flash, NO beam, NO streak"
      //    negative block did NOT remove it (86px -> 24px, still there). Naming the blow summons the
      //    thing that delivers it; v5's CAUSE-FREE rewrite (direction encoded in the recoil, the
      //    striking thing never referred to at all) killed it on the first try. This is exactly the
      //    phase-12 KO PROMPT LAW, generalised from ko to hit.
      //  - the fan then oscillated between edges (v2 LEFT 216px when it swung back, v3's "fan stays
      //    FORWARD and HIGH" fix causing RIGHT 96px) until the ★ IR37 FRAME BUDGET explained it: she
      //    has 206px/208px of side margin against a ~250px fan, so the fan can never leave her body.
      // cal RE-DERIVED from the shipped webm (drift 0.13 vs keyer-emitted = a match).
      url: 'assets/characters/ir37-pink-tessen/hit.webm',
      cal: { h: 107.06, bottom: -3.65, left: 51.95 },
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
        // Take C — CRESCENT SWEEP: she drops into a deep braced crouch and sweeps the fan through a
        // long hot-pink crescent arc that wraps under her, shedding solid lotus petals, then rises
        // back to the anchor.
        //
        // RE-ROLLED (phase 96, v3) from qa-boss/raw/ir37-special-3-v3.mp4 (97 frames, bbox 712x832).
        // SUPERSEDES the phase-23 "fan flash" file — the acting is now a sweeping crescent rather
        // than a compact star-flash, hence the renamed description. The v3 roll is the one that
        // fixed containment while KEEPING the crouch (v2 lost it): the arc reaches wide on both
        // sides but measures CLEAN on TOP/LEFT/RIGHT, no feather needed.
        // KEYER: scripts/key-clips-green-pinksafe.mjs — see the attack_strike take B note above for
        // why the stock magenta-tuned keyer must never touch this character. Same result here: the
        // green-neutralize HARD=4 pass removed ZERO pixels and cut-bloom-plate cut zero.
        // Measures: plate retention BEFORE neutralize 0.00% (a real reading on the keyed frames, not
        // a post-neutralize tautology); matte-proof 0 green-dominant px over black AND white.
        // VIEWED at full size over white: the crescent is a clean pink/white gradient with no olive
        // or chartreuse anywhere in it, and the trim stays saturated fuchsia.
        // cal RE-DERIVED from the final frames; drift 0.12 vs the keyer-emitted
        // { h: 101.22, bottom: -0.49, left: 50 } = a match, and the re-derived value is wired.
        // contacts: the motion-energy argmax is f11 (458ms) and it is largely the crouch-drop, i.e.
        // the launch — so contacts is the effect-strength peak instead, 3.37pp @f20 = 833ms
        // (sustained 9 frames), frame-checked as the arc at full extension and peak brightness.
        url: 'assets/characters/ir37-pink-tessen/special-c.webm',
        cal: { h: 101.22, bottom: -0.49, left: 50.12 },
        contacts: [833],
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
