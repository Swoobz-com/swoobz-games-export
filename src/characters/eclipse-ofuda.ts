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
// once loaded.
//
// FACING — faces:'right', normalised phase 29 (Tim's ruling 2026-07-27). The roster now runs ONE
// convention: all eight bosses are faces:'right'. A lone exception is how the facing defect class
// survives, so eclipse — the only 'left' kit — was normalised rather than left as a special case.
// The still ALREADY faced screen-right; it was the CLIPS that disagreed with it, so nothing under
// public/assets/enemies/ was touched. All 13 clips now natively face screen-RIGHT: head, nose,
// boot-toes and body-front point RIGHT and the ponytail trails LEFT, matching the still.
//
// !! HER GENERATION ANCHOR FACES **LEFT** !!  qa-boss/anchors/eclipse-ofuda-anchor-green-r.png shows
// her facing screen-LEFT despite its '-r' filename. Every clip generated from that anchor therefore
// comes out LEFT-facing, so EVERY FUTURE ECLIPSE RE-ROLL MUST BE HFLIPPED AT KEYING — decode the raw
// with `-vf hflip` so the mirror lands at the FRAME level BEFORE the key (never webm->webm, which
// costs a VP9 generation), then key as normal. See qa-boss/flip-eclipse.mjs for the exact recipe.
// Forget this and the re-rolled clip ships facing away from the opponent in both slots.
//
// Why it matters: `faces:` is a CORRECTNESS input, not a label. FightExperience.tsx:920 computes
// isMirrored = faces !== (slot==='p1'?'right':'left') and applies ONE mirror to the whole fighter
// stack (:1087), so every clip in the kit must NATIVELY face the direction this field states.
export const ECLIPSE_OFUDA: FighterDef = {
  id: 'eclipse-ofuda',
  name: 'ECLIPSE OFUDA',
  still: 'assets/enemies/eclipse-ofuda.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile (hat/face centre ~x0.36 / y0.13 of the 473x900 still).
  portrait: { headX: 0.36, headY: 0.13, zoom: 3.8 },
  clips: {
    idle: {
      // Phase 29 facing normalisation: re-keyed from qa-boss/raw/eclipse-ofuda-idle-v4.mp4 with
      // `-vf hflip` at decode. cal keyer-EMITTED: left 48.85 -> 51.03. That is 100 - 48.85 MINUS 0.12,
      // the keyer's odd-width `if (cw % 2) cw--` crop shift (the union bbox was 419px wide, so the
      // flipped crop drops the mirror-image column and lands 1px off a perfect mirror). Predicted
      // deviation = -h/cropH = -101.21/834 = -0.1214; observed -0.1200. Benign and self-correcting:
      // the emitted cal already compensates, so she holds the same stage x.
      url: 'assets/characters/eclipse-ofuda/idle.webm',
      cal: { h: 101.21, bottom: -0.49, left: 51.03 },
    },
    // Contract §10: two interchangeable takes per non-idle state (own cal + measured contacts each).
    attack_strike: [
      {
        // Take A: coiled hat-tilted iai crouch -> committed diagonal draw-cut with left follow-through.
        // FACING (phase 29): this take was ALREADY right-facing as originally shipped. Phase 26/28
        // flipped it to LEFT to match the then-left kit; the phase-29 ruling made 'right' the roster
        // convention, so the FILE was RESTORED bit-exact from 3a894ef rather than flipped a second
        // time (a re-key would have cost a needless VP9 generation), and this cal is reverted with it:
        // left 55.04 -> 44.96. h/bottom/contacts never moved.
        url: 'assets/characters/eclipse-ofuda/attack-strike.webm',
        cal: { h: 111.27, bottom: -2.14, left: 44.96 },
        contacts: [1875],
      },
      {
        // Take B: wide waist-height horizontal smear cut (distinct action, same strike family).
        // Phase 29: re-keyed hflipped from eclipse-ofuda-strike-b-v4-169.mp4. cal keyer-emitted,
        // left 34.95 -> 65.05 = exactly 100 - 34.95.
        url: 'assets/characters/eclipse-ofuda/attack-strike-b.webm',
        cal: { h: 114.8, bottom: -3.29, left: 65.05 },
        contacts: [2083],
      },
    ],
    attack_throw: [
      {
        // Take A: free-hand snap seize through empty air -> violent wrench (solo-safe, no phantom).
        // Phase 29: re-keyed hflipped from eclipse-ofuda-throw-a-v2.mp4. left 49.94 -> 50.06 = 100 - 49.94.
        url: 'assets/characters/eclipse-ofuda/attack-throw.webm',
        cal: { h: 101.7, bottom: -0.49, left: 50.06 },
        contacts: [1500],
      },
      {
        // Take B: explosive two-step shoulder barge through empty air (solo-safe).
        // Phase 29: re-keyed hflipped from eclipse-ofuda-throw-b-v3.mp4. left 49.94 -> 50.06 = 100 - 49.94.
        url: 'assets/characters/eclipse-ofuda/attack-throw-b.webm',
        cal: { h: 101.21, bottom: -0.61, left: 50.06 },
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
      // FACING (phase 29): this take was ALREADY right-facing as shipped, so its FILE was RESTORED
      // bit-exact from 3a894ef rather than flipped twice, and its recorded cal reverts with it. If it
      // is ever restored to the kit (it should be RE-ROLLED instead — the phantom blade fragment is a
      // generation defect a flip cannot fix), its keyer-emitted cal is { h: 110.76, bottom: -0.48,
      // left: 48.31 } (phase 28 had it at 51.69), contacts unchanged [1750, 2583]. NOTE for a re-roll:
      // this take's feather was a FRAME SUBSET (--top 48 on frames 62, 72, 73, 74 only), not whole-clip
      // — a whole-clip top feather silently over-feathers f75/f76.
      {
        // Take B: forearm brace across the chest -> controlled counter cut.
        // Phase 29: re-keyed hflipped from eclipse-ofuda-block-b-v3.mp4. left 49.45 -> 50.55 = 100 - 49.45.
        url: 'assets/characters/eclipse-ofuda/attack-block-b.webm',
        cal: { h: 100.97, bottom: -0.36, left: 50.55 },
        contacts: [2167, 2833],
      },
    ],
    hit: {
      // Hard head/torso whip-back stagger (ponytail + ofuda flare), quick recovery to guard, on feet.
      // Phase 29: re-keyed hflipped from eclipse-ofuda-hit.mp4 (v1 KEEP recipe — stock keyer +
      // green-neutralize, NO despill). left 44.42 -> 55.58 = exactly 100 - 44.42.
      url: 'assets/characters/eclipse-ofuda/hit.webm',
      cal: { h: 102.18, bottom: -0.49, left: 55.58 },
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
    // FACING (phase 29) — all three now face screen-RIGHT with the rest of the kit, so a restore does
    // not also need a flip. Keyer-emitted cals for a restore (which should really be a re-roll):
    //  - special.webm    re-keyed hflipped from eclipse-ofuda-special_1.mp4 (v1 keep, NO despill):
    //                    { h: 109.71, bottom: -0.49, left: 54.61 } (was 45.39 = 100 - 45.39), contacts [1250].
    //  - special-b.webm  ALREADY right-facing as shipped, so the FILE was RESTORED bit-exact from
    //                    3a894ef rather than flipped twice: { h: 114.67, bottom: -4.12, left: 51.88 }
    //                    (phase 28 had 48.12), contacts [2250]. Its feather IS whole-clip (--top 48,
    //                    46/97 frames touched) — unlike block_a's frame-subset one.
    //  - special-c.webm  re-keyed hflipped from eclipse-ofuda-special_3.mp4 (v1 keep, NO despill):
    //                    { h: 100.97, bottom: -0.36, left: 50.18 }, contacts [2000]. That is 100 - 49.7
    //                    minus 0.12, the odd-width crop shift (see the idle note); keyer-emitted, correct.
    special: [],
    // ko is the ONE off-anchor clip: drops the katana, crumples to the ground and HOLDS prone (does
    // NOT return to the anchor). Cause-free, no opponent.
    // FACING (phase 29): ko was ALREADY right-facing as shipped, so the FILE was RESTORED bit-exact
    // from 3a894ef rather than flipped a second time, and this cal reverts with it: left 43.34 -> 56.66.
    ko: {
      url: 'assets/characters/eclipse-ofuda/ko.webm',
      cal: { h: 106.78, bottom: -5.81, left: 56.66 },
    },
    // Round-win taunt: one crisp flourish whip (silver smear arc), settles back to the anchor.
    // Phase 29: re-keyed hflipped from eclipse-ofuda-victory-v2.mp4, feather MIRRORED with the frame
    // (--top 48 --left 48 becomes --top 48 --right 48; hflip does not move rows, so the top band is
    // unchanged and only the side band swaps). left 50.18 -> 49.70 = 100 - 50.18 minus the 0.12
    // odd-width crop shift (see the idle note); keyer-emitted, correct.
    victory: {
      url: 'assets/characters/eclipse-ofuda/victory.webm',
      cal: { h: 111.17, bottom: -0.49, left: 49.7 },
    },
  },
  quotes: [
    'The shrine keeps no living guests. Only the sealed.',
    'One cut, one seal. The talisman remembers you now.',
    'You crossed onto hollow ground. The ground has closed.',
    'I do not haunt this place. I hold it.',
  ],
};
