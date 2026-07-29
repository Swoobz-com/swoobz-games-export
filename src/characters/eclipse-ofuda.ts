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
// !! SHE HAS TWO ANCHOR PLATES AND THEY FACE OPPOSITE WAYS — PICK THE RIGHT ONE !!
//   qa-boss/anchors/eclipse-ofuda-anchor-green.png    faces screen-RIGHT  <- FIRE ON THIS ONE
//   qa-boss/anchors/eclipse-ofuda-anchor-green-r.png  faces screen-LEFT   (the mirror, despite '-r')
// Both were VIEWED (phase 31). Everything generated up to and including phase 29 was fired on the
// '-r' plate, came out LEFT-facing, and had to be hflipped at keying — which is what the phase-29
// notes below describe. That is a property of THAT PLATE, not of the character. Fire on the base
// plate with prompts commanding SCREEN-RIGHT and the output needs NO hflip (confirmed on all three
// session-9 fires: anchor-IoU as-is ~0.88 vs mirrored ~0.25). Whichever plate you use, the rule is
// the same: the clip must NATIVELY face screen-RIGHT by the time it is keyed. If you do need the
// mirror, apply `-vf hflip` at the FRAME level before the key (never webm->webm, which costs a VP9
// generation) — see qa-boss/flip-eclipse.mjs for that recipe and qa-boss/key-eclipse-specials-v2.mjs
// for the no-flip one.
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
      {
        // Take A RESTORED (phase 61) — RE-ROLLED from scratch, which is what the pulled-take note
        // below asked for. The old file was never wired after the pull, so this is a restoration of
        // variant coverage (contract §10 wants 2 interchangeable takes), NOT a live-bug fix.
        // Acting: she angles the katana across her body into a braced high guard, shedding one or two
        // white paper ofuda from the hat brim, then cuts back with a short diagonal DOWNWARD counter
        // and settles to the anchor. Feet planted the whole clip.
        // v3 measures: containment CLEAN (after feather, below), plate retention 0.00%/0.00%,
        // turn gate 0/97, anchor-lock f0 0.939 / fLast 0.937 (the pulled take was 0.771 / 0.244).
        // Three things this re-roll had to learn, all recorded in qa-boss/prompts/eclipse-ofuda.md:
        //  - v2 made her LEAP (both feet off the ground, hat clipped) because the acting line said
        //    "drives forward off that leg"; a PLANTED clause fixed it, verified by tracking the lowest
        //    subject row per frame (never rises above its f1 value).
        //  - her measured budget is only 140px of headroom against a LONG katana, so no prose bound on
        //    the blade survived — v3 and v4 both kept a ~25px blade-tip overrun.
        //  - so the tip is FEATHERED, not re-rolled again: scripts/edge-feather.mjs --top 48 --right 48,
        //    which is exactly what that tool exists for ("content that crosses the source frame
        //    boundary must DISSOLVE at the edge instead of cutting flat ... never re-generate for
        //    this"). Her body sits well inside both bands; only the blade reaches them.
        // contacts: motion-energy argmax f76, frame-checked to be the COUNTER CUT (the guard is held
        // first, so the counter genuinely lands late) rather than a recovery.
        // cal RE-DERIVED from the shipped webm: drift 0.00 against the keyer-emitted value.
        url: 'assets/characters/eclipse-ofuda/attack-block.webm',
        cal: { h: 111.17, bottom: -0.49, left: 54.98 },
        contacts: [3167],
      },
      // Take A (the ORIGINAL attack-block.webm) PULLED 2026-07-26 (animation<->character sweep): the ONLY true
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
    // Contract §11: the signature FINISHER — plays automatically on a round-ending win. Takes are
    // chosen uniform-random per exchange. The white/pale-gold talisman light is baked into the body
    // (sanctioned effect exception, never green); each effect fully dissipates by the final frame.
    //
    // HISTORY. All three v1 finishers were PULLED 2026-07-26 (animation<->character sweep) — every
    // round-ending win against her then played a plain attack, because with `special` empty the
    // Experience falls back to her ATTACK state (FightExperience.tsx:1789 gates on
    // clipVariants(...,'special').length > 0). Phase 31 restores TWO of the three from re-rolls
    // fired doctrine-native in the browser (Unlimited, zero credits) on the RIGHT-FACING base plate,
    // so — unlike every earlier eclipse re-roll — these were keyed with NO hflip. Recipe: her
    // v1-keep pipeline (stock keyer + green-neutralize HARD=32, NO green-despill), driver
    // qa-boss/key-eclipse-specials-v2.mjs, control run first (`flip-eclipse.mjs flip special_1`
    // reproduced the shipped cal exactly, so the toolchain was validated before it was trusted).
    // Both cals below are keyer-EMITTED; both contacts are motion-energy argmax off the keyed frames.
    // Matte-proofed over black AND white: 0 green-dominant pixels over the whole frame, both clips.
    //
    // special_2 (special-b.webm) STAYS PULLED. Its v1 broke her arsenal (katana held vertical
    // point-up overhead f20-f64 — her blade is too long for any vertical hold — reading as a
    // lime beam, and a fat spindle at f56). Its v2 re-roll fixed the effect fusion but HARD-CUTS the
    // frame: RIGHT 272px @f29 (+ LEFT 60px @f25), far past a tip-kiss, so per the edge-overrun
    // doctrine it needs a v3 (tighter arc / off-horizontal descending cut), not a feather. Its
    // keyer-emitted cal if it is ever restored: { h: 114.67, bottom: -4.12, left: 51.88 }, contacts
    // [2250]; its feather is whole-clip (--top 48, 46/97 frames), unlike block_a's frame-subset one.
    special: [
      {
        // Take A — OFUDA RITE: she draws a talisman across the blade and it burns tip-to-tsuba.
        // Re-rolled from qa-boss/raw/eclipse-ofuda-special-1-v2.mp4 (bbox 528x882, 97 frames).
        // Fixes the v1 pull: the talisman is now FUSED TO THE BLADE, not floating — the measured
        // ~60px palm air-gap is gone — and the lime/yellow-green fringe is gone with it (0 pixels
        // where G > max(R,B) anywhere in the clip, so what reads as gold IS gold: R≈G, low B).
        // KNOWN COSMETIC RESIDUAL: f62-f70 (~0.33s) small white paper scraps detach from the
        // burning ofuda and drift off the blade. Judged authored ash debris — causally originated
        // at the talisman, adjacent to it, fully cleared by f72 — not the detached/hovering ban,
        // which is for effects with no source (see special-c's v1: 10 talismans in open air 2.2s).
        // Flagged for the operator rather than buried.
        url: 'assets/characters/eclipse-ofuda/special.webm',
        cal: { h: 106.91, bottom: -4.12, left: 46.18 },
        contacts: [2667],
      },
      {
        // Take B — JUDGEMENT PLUNGE: two-hand drive of the katana down into the ground, solid
        // opaque gold flare running the blade into the floor, withdrawn and settled back to anchor.
        // Re-rolled from qa-boss/raw/eclipse-ofuda-special-3-v2.mp4 (bbox 504x866, 97 frames).
        // Fixes the v1 pull entirely: no open-air talisman cluster, nothing present at f0 (the
        // effect ignites on the plunge, so there is no trigger-time pop), and the lime chroma-bleed
        // is gone. ARSENAL CHECK (this is the trap that killed special_2's v1): f66-f78 she does
        // hold the blade vertical — but point-DOWN, withdrawing it from the ground, which is the
        // motivated opposite of the banned point-up overhead hold. VIEWED at full size across
        // f66-f78: it stays a curved katana with a visible tsuba, never a beam or a spindle.
        url: 'assets/characters/eclipse-ofuda/special-c.webm',
        cal: { h: 105.1, bottom: -3.64, left: 48.12 },
        contacts: [1333],
      },
    ],
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
