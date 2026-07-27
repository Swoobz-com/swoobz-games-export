import type { FighterDef } from './types';

// ECLIPSE OFUDA — node 6 boss (HOLLOW SHRINE). Silver-ponytailed shrine-guard ronin: straw
// conical hat with hanging ofuda talismans, black+olive gold-trimmed kimono armor, long katana.
// Calm, precise kenjutsu. Wired as a node enemy (WIRE WAVE 2, Tim 2026-07-24/25) and unlocked as a
// PLAYABLE fighter only after node 6 is beaten (charSelect gate).
//
// The 13-clip kit was generated on GREEN (browser Higgsfield Unlimited); the 8 ENERGY re-rolls
// (idle/strike_a/strike_b/throw_a/throw_b/block_a/block_b/victory) were re-fired doctrine-native and
// the 5 v1 keeps (hit/ko/special_1/2/3) preserved, all QA-passed per contract §6, keyed with the
// GREEN keyer + green-neutralize second pass (repo keyer is magenta-tuned) + flagged edge feathers,
// encoded VP9 alpha (0.0000% visible green over black+white). Every `cal` here is the value EMITTED
// by the keyer (qa-boss/eclipse-ofuda-clipdata.json — never hand-derived); every `contacts` array is
// MEASURED off the clip's QA sheet. The 3 signature specials (§11) ship as a take-list of `special`;
// on a round-ending win one is chosen uniform-random.
//
// still = the phase-20 keyed enemy cutout (public/assets/enemies/eclipse-ofuda.webp, 473x900): the
// ultimate fallback + the HUD medallion / select-tile head-crop source; the idle clip overlays it
// once loaded. faces:'left' — GROUND-TRUTH VERIFIED (qa-boss clipdata anchor_note): the head, nose,
// boot-toes and body-front all point screen-LEFT (the ponytail trails right), despite the '-r' anchor
// label. The whole kit is internally consistent left-facing; THE FACING RULE (contract §4) mirrors
// her per whichever slot she lands in. (satoshi/ir37 face right — she is the first left-facing boss.)
export const ECLIPSE_OFUDA: FighterDef = {
  id: 'eclipse-ofuda',
  name: 'ECLIPSE OFUDA',
  still: 'assets/enemies/eclipse-ofuda.webp',
  faces: 'left',
  // Head-crop for the HUD medallion + select tile (hat/face centre ~x0.36 / y0.13 of the 473x900 still).
  portrait: { headX: 0.36, headY: 0.13, zoom: 3.8 },
  clips: {
    idle: {
      url: 'assets/characters/eclipse-ofuda/idle.webm',
      cal: { h: 101.21, bottom: -0.49, left: 48.85 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: coiled hat-tilted iai crouch -> committed diagonal draw-cut with left follow-through.
        // FACING FIX (phase 26): this take was generated MIRRORED (faced screen-RIGHT while idle/victory
        // and 7 siblings face LEFT), so it rendered facing away from the opponent in BOTH slots.
        // Re-keyed from qa-boss/raw/eclipse-ofuda-strike-a-v3.mp4 with hflip at the FRAME level before
        // the key (no extra generation), identical recipe (stock keyer -> green-despill -> green-
        // neutralize, feather none). cal is keyer-EMITTED: h/bottom unchanged, left 44.96 -> 55.04
        // (= 100 - 44.96, mirror about the still's content centre at 50%). contacts unaffected.
        url: 'assets/characters/eclipse-ofuda/attack-strike.webm',
        cal: { h: 111.27, bottom: -2.14, left: 55.04 },
        contacts: [1875],
      },
      {
        // Take B: wide waist-height horizontal smear cut (distinct action, same strike family).
        url: 'assets/characters/eclipse-ofuda/attack-strike-b.webm',
        cal: { h: 114.8, bottom: -3.29, left: 34.95 },
        contacts: [2083],
      },
    ],
    attack_throw: [
      {
        // Take A: free-hand snap seize through empty air -> violent wrench (solo-safe, no phantom).
        url: 'assets/characters/eclipse-ofuda/attack-throw.webm',
        cal: { h: 101.7, bottom: -0.49, left: 49.94 },
        contacts: [1500],
      },
      {
        // Take B: explosive two-step shoulder barge through empty air (solo-safe).
        url: 'assets/characters/eclipse-ofuda/attack-throw-b.webm',
        cal: { h: 101.21, bottom: -0.61, left: 49.94 },
        contacts: [1458],
      },
    ],
    attack_block: [
      // Take A (attack-block.webm) PULLED 2026-07-26 (animation<->character sweep): the ONLY true
      // phantom OBJECT found in the roster. At f72 both her hands are empty (the katana is gone);
      // f73 leaves only the tsuba+grip stub; at f74 a ~40px DETACHED BLADE FRAGMENT floats in open
      // air above-left of her hat while both hands are crossed empty on her chest; f75 the blade
      // re-materialises. Weapon vanish + morph + phantom in one beat. She is also fully frontal
      // f10-f74 (~2.7s of a 4s clip) against her side-profile lock. Re-roll; take B carries blocks.
      // ALSO facing-fixed on disk (phase 26): the file was mirrored too, and has been re-keyed hflipped
      // so the kit is 13/13 self-consistent for the facing gate. If this take is ever restored (it
      // should be re-rolled instead), its keyer-emitted cal is now { h: 110.76, bottom: -0.48, left: 51.69 }
      // (was left 48.31), contacts unchanged [1750, 2583].
      {
        // Take B: forearm brace across the chest -> controlled counter cut.
        url: 'assets/characters/eclipse-ofuda/attack-block-b.webm',
        cal: { h: 100.97, bottom: -0.36, left: 49.45 },
        contacts: [2167, 2833],
      },
    ],
    hit: {
      // Hard head/torso whip-back stagger (ponytail + ofuda flare), quick recovery to guard, on feet.
      url: 'assets/characters/eclipse-ofuda/hit.webm',
      cal: { h: 102.18, bottom: -0.49, left: 44.42 },
    },
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Three takes,
    // one chosen uniform-random per exchange. The white/pale-gold talisman light is baked into the body
    // (sanctioned effect exception, never green); each effect fully dissipates by the final frame.
    // ALL THREE FINISHER TAKES PULLED 2026-07-26 (animation<->character sweep). Every one failed, so
    // every round-ending win against her was showing a defect. With `special` empty the Experience
    // correctly falls back to her ATTACK state on a round-ending win (FightExperience.tsx:1789
    // gates on clipVariants(...,'special').length > 0), which is clean. Re-roll all three, then
    // restore this array. Why each was pulled:
    //  - special.webm (ofuda flick): the talismans are NOT in her palm - measured a ~60px AIR GAP
    //    above the open hand at f22/f30, and f46-54 the burst drifts up-left AWAY from the hand =
    //    the detached/hovering ban. From f38 the fan carries a strong LIME/YELLOW-GREEN fringe
    //    (unkeyed green spill; her palette is white/pale-gold) and the tail pops off rather than
    //    dissipating. (An earlier orchestrator check called this "attached in her palm" - that read
    //    was taken from a decode WITHOUT the alpha plane and is corrected here.)
    //  - special-b.webm (drop-cut): katana held VERTICAL point-up overhead f20-f64, which is her
    //    explicit arsenal ban (her katana is too long for any vertical hold); the blade becomes a
    //    lime/green glowing column that reads as a BEAM, and at f56 a fat spindle that no longer
    //    reads as a katana.
    //  - special-c.webm (talisman guard): a cluster of ~10 talismans + olive arcs hangs in OPEN AIR
    //    beside her hip, unattached to body or blade, from f0 to ~f52 (~2.2s) - and being present at
    //    f0 it pops in at trigger. Framing is also tight all round (top 5px, bottom 3px).
    // FACING (phase 26): special-b.webm was ALSO mirrored on disk and has been re-keyed hflipped so the
    // kit is 13/13 self-consistent for the facing gate. If it were ever restored (it should be
    // re-rolled instead), its keyer-emitted cal is now { h: 114.67, bottom: -4.12, left: 48.12 }
    // (was left 51.88), contacts unchanged [2250]. special.webm / special-c.webm already faced LEFT
    // correctly and were NOT touched.
    special: [],
    // ko is the ONE off-anchor clip: drops the katana, crumples to the ground and HOLDS prone (does
    // NOT return to the anchor). Cause-free, no opponent.
    // FACING FIX (phase 26): ko was generated MIRRORED (faced screen-RIGHT against the kit's LEFT).
    // Re-keyed from qa-boss/raw/eclipse-ofuda-ko.mp4 with a frame-level hflip, v1-keep recipe (stock
    // keyer -> green-neutralize, NO despill, no feather). cal keyer-emitted: left 56.66 -> 43.34.
    ko: {
      url: 'assets/characters/eclipse-ofuda/ko.webm',
      cal: { h: 106.78, bottom: -5.81, left: 43.34 },
    },
    // Round-win taunt: one crisp flourish whip (silver smear arc), settles back to the anchor.
    victory: {
      url: 'assets/characters/eclipse-ofuda/victory.webm',
      cal: { h: 111.17, bottom: -0.49, left: 50.18 },
    },
  },
  quotes: [
    'The shrine keeps no living guests. Only the sealed.',
    'One cut, one seal. The talisman remembers you now.',
    'You crossed onto hollow ground. The ground has closed.',
    'I do not haunt this place. I hold it.',
  ],
};
