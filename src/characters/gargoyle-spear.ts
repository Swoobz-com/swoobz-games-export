import type { FighterDef } from './types';

// GARGOYLE SPEAR — MK-FINAL character, FREE-ROSTER playable (Tim's ruling): no campaign node, so
// bossNodeId returns null (rosterGating.ts:18-22) and isFighterSelectable returns true immediately
// (:28-32) the moment the orchestrator adds the import + FIGHTERS entry in src/characters/index.ts.
// A hulking grotesque hewn from one mass of matte grey weathered stone: snarling demonic face, ridged
// horns swept back, two great BAT WINGS folded down his back toward screen-left, carved pauldron /
// vambraces / tassets, digitigrade clawed feet, and a long stone SPEAR held two-handed across the body
// on a shallow diagonal, barbed leaf-shaped head high toward screen-right with carved wing-vanes
// behind it.
//
// CHROMA / PIPELINE. Generated on GREEN (qa-boss/anchors/mk/gargoyle-spear-anchor-green.png, the
// PADDED MK plate, 1536x1536) from 960x960 24fps raws. Keyed by qa-boss/key-s30-harvest.mjs
// (key-idle-clips.mjs --still <plate> -> green-despill) and encoded VP9 alpha. All 12 session-30
// clips were wired BYTE-IDENTICAL out of qa-boss/staged-s30/gargoyle-spear/webm/ — nothing was
// re-keyed, re-encoded or re-timed. md5 pairs verified staged-vs-shipped, all 12 IDENTICAL, e.g.
//   attack_strike 05881f1bfcbc392e9386be30dc54820f · special_1 2bdd1654d3f467270e68a204869e0df6
// `idle.webm` predates this batch (phase 182, qa-boss/staged/gargoyle-spear/) and IS the kit anchor;
// it was left untouched.
// Every clip re-probed after the copy: 97 frames @ 24/1 fps, alpha plane present and real (66-71% of
// f0 at alpha<40). NOTE ffmpeg MUST get `-c:v libvpx-vp9` BEFORE `-i` — without it this build
// (ffmpeg 8.1.1) hard-errors "alphaextract: Requested planes not available", i.e. the alpha plane is
// genuinely dropped by the default decoder.
//
// ---------------------------------------------------------------------------------------------
// `cal` — 12 of 13 are the keyer's EMITTED value and are PROVEN not stale; `idle` is RE-DERIVED.
//
// qa-boss/rederive-cal.mjs REFUSES this batch's own still (reproduced verbatim):
//   ⛔ REFUSING — the still has NO pixel below alpha 128: qa-boss/anchors/mk/gargoyle-spear-anchor-green.png
//   EXIT=2
// Measured: that plate is 1536x1536 with pxBelowA128 = 0 / minAlpha = 255, so it trips the tool's
// unkeyed-input guard (rederive-cal.mjs:129-140).
//
// Substituting the NEW keyed cutout as `still` DOES run, and must NOT be used: it swaps the cal
// CONVENTION rather than measuring drift. Measured with the tool's own contentBBox math (A_THR 128 /
// COV 3):
//   padded MK plate   -> onH 1.0000 / onBG 0.0000 / onCX 0.5000   (the full-bleed convention every
//                                                                  emitted cal was built on)
//   keyed cutout      -> onH 0.8514 / onBG 0.0048 / onCX 0.5034
// and h scales by exactly that 0.8514, so re-deriving against the cutout printed "DRIFTED" with a
// near-constant delta on ALL THIRTEEN clips (h -15.05 .. -16.97, including the already-shipped idle).
// A uniform offset across every clip is a convention change, not per-clip staleness.
//
// The real staleness question was answered instead by running the tool's contentBBox+computeCal math
// on the CORRECT (plate) convention, per clip, against each clip's final keyed frame dir:
//   all 12 session-30 clips re-derive BYTE-EXACT — drift 0.00 on h, bottom AND left.
// That is expected and independently corroborated: this batch's only post-pass is green-despill,
// which deletes ZERO pixels — every one of the 12 rows in qa-boss/staged-s30/gargoyle-spear.summary.json
// has opaqueBefore === opaqueAfter (e.g. attack_strike 15,369,390 both sides) and escalated:false, so
// the anchor-frame alpha bbox cannot have moved.
//
// `idle` IS THE ONE EXCEPTION AND IS RE-DERIVED. It came from the earlier pipeline (green-neutralize,
// which DOES delete pixels). Its emitted cal {h:102.83, bottom:-0.63, left:50.16} re-derives to
// {h:103.81, bottom:-1.27, left:50.16} — drift 0.98, past the 0.20 accept band. The re-derived value
// is wired, and it is the one that MEASURES CORRECT: placing every clip's f0 into a 512px square
// fighter box exactly as FightExperience.tsx:1112-1117 does, all 12 new clips land feet at y=511 and
// head at y=0, the emitted idle cal lands feet y=509 / head y=2 (2px high), and the re-derived idle
// cal lands feet y=511 / head y=0 — flush with the rest of the kit.
//
// ⚠ KNOWN, PRE-EXISTING, NOT MINE TO FIX — the still and the clips are on different scales. Because
// the emitted cals were derived against a full-bleed plate (onH 1.0000) while the shipped still is a
// cutout (onH 0.8514), the clip renders the body at ~100% of the box height and the still renders it
// at ~85%, so the still->live handoff pops ~17% in scale (and under prefers-reduced-motion, where
// fight.css hides .fr-state-video, only the 85% still is ever seen). This is the ROSTER convention,
// not a gargoyle bug: ir56-lion-serpent.ts:15-16 records the identical onH 1.0000 / onBG 0.0000 /
// onCX 0.5000 inversion for its whole kit, and its cutout is 1350x900 (onH 0.613), i.e. a far larger
// mismatch. Kit-internal consistency was chosen over re-basing one fighter alone.
// ---------------------------------------------------------------------------------------------
//
// faces:'right' — MEASURED, then confirmed by eye (both halves of the trap the gate warns about).
// `node scripts/check-facing.mjs gargoyle-spear --still` -> 0/13 clips mirrored, votes AAAAA on every
// clip (no mid-window turn), exit 0. Re-run against the padded plate as anchor: also 0/13, AAAAA.
// The absolute direction was fixed with my own eyes, not inferred from a relative gate: the keyed
// cutout and the f0 frames of idle / attack-block / attack-strike-b / attack-throw / victory /
// special-c were rendered and viewed — snarling head and barbed spear head point screen-RIGHT, bat
// wings trail screen-LEFT, unanimously. NO hflip anywhere in this kit. Matches the roster convention
// (every shipped boss is faces:'right'). The game mirrors per THE FACING RULE for whichever slot he
// lands in (FightExperience.tsx:919).
//
// `contacts`: motion-energy argmax (scripts/measure-contacts.mjs, 24fps) was FRAME-CHECKED on every
// take and REJECTED on 8 of 9 — on this character it lands on the wind-up almost every time, because
// the anchor pose already holds the spear near full right extension so the fastest travel is the
// coil, not the arrival. Two objective impact signals were measured per frame instead and are quoted
// on each take: (1) DETACHED DEBRIS = opaque pixels not in the largest connected component (a chunk
// in flight cannot be the character's own body, which is one component); (2) TOTAL OPAQUE AREA (the
// body's area is conserved under crouching, so a breakout means added struck geometry). Where neither
// fires — the four solo weapon takes, all measuring +1.6% area or less — the spear-reach extremum
// per frame was traced, thorn-warden style, and the contact wired at the ARRIVAL/HOLD, never the
// travel. Every deviation from the argmax is stated on the take.
export const GARGOYLE_SPEAR: FighterDef = {
  id: 'gargoyle-spear',
  name: 'GARGOYLE SPEAR',
  // Keyed cutout, 1036x900, produced from the ORIGINAL MK FINAL art (input/MK FINAL/mythic/Gargoyle
  // Spear.png, 1768x1536, green bg sampled rgb(3,251,4)) with scripts/key-enemies.mjs's key() recipe
  // — corner-median sample -> border flood @ tol 60 -> enclosed-pocket cut @ tol 45 -> largest
  // component -> inward feather r=2 -> green despill on a 4px edge ring. Measured: comp 905,303px,
  // pocket 47,801px, edge 32,155px, despilled 44,081px, bgLikeKept 0px (self-check limit 150 -> PASS).
  // Keyed in place, NO crop: the art's own framing survives (subject bbox 976x882, margins L34 R26
  // T13 B5, fills 98.0% of height). Alpha is REAL, not a filled rectangle: 65.59% of pixels at
  // alpha 0, 23,252 partial, minAlpha 0 / maxAlpha 255.
  still: 'assets/enemies/gargoyle-spear.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile. MEASURED on the cutout: horn tips top out at y45
  // (x421), the skull top between the horn bases sits at ~y138, the snout tip is the rightmost pixel
  // of the y170..260 band at x578 (y213), the temple/ear edge at ~x460 and the jaw bottom at ~y255.
  // Head centre = (460+578)/2 x, (138+255)/2 y = ~x518 / y197 of the 1036x900 still = 0.500 / 0.190
  // in still-WIDTH units — BOTH axes are width fractions, because .fr-portrait is square
  // (fight.css:449-460) so the medallion window is a square of side W/zoom centred on (W*headX,
  // W*headY). zoom 4.2 rather than the 4.6 house value for oni-tetsubo's exact reason: the swept horn
  // sweep makes the head silhouette unusually wide. VIEWED at 3.8 / 4.2 / 4.6 — 4.2 is the one that
  // keeps the whole horn arc and the snout inside the disc with margin (window x395..641 y74..320,
  // snout 63px clear of the right edge); 4.6 crowds the snout, 3.8 gives up the head to pauldron.
  // The select tile REUSES these numbers on a 3/4 box (fight.css:1480) where a CSS percentage `top`
  // resolves against HEIGHT, so its vertical window is this one scaled by 4/3 (y98..427). VIEWED:
  // it reads as a head+chest bust, which is correct for a select tile. Do NOT re-tune headY for the
  // tile — that would break the medallion. Pre-existing behaviour, shared by the whole roster.
  portrait: { headX: 0.5, headY: 0.19, zoom: 4.2 },
  clips: {
    idle: {
      // Wide digitigrade stance, spear held two-handed across the body on its shallow diagonal, head
      // low-right; wings and shoulders breathe, no step, no turn. It IS the kit anchor — every other
      // clip's f0 is scored against this frame 0. Self-locked f0 vs f96 silhouette IoU 0.993. All
      // four edges measure a 0px contact run at alpha>40 across all 97 frames, so no feather.
      // cal is the RE-DERIVED value (see the block above): emitted {102.83,-0.63,50.16} drifted 0.98
      // and placed the anchor 2px high in a 512px box against the other 12 clips.
      url: 'assets/characters/gargoyle-spear/idle.webm',
      cal: { h: 103.81, bottom: -1.27, left: 50.16 },
    },
    // Contract §10: two interchangeable takes per non-idle attack state, each with its OWN cal +
    // measured contacts.
    attack_strike: [
      {
        // Take A, "STRIKE A (falling arc)": rises, then drives the spear down through a falling arc
        // into the floor, cracking it. Contact = f26 (1083ms), the FIRST frame at the clip's lowest
        // spear reach — the low extremum holds 645px (+6 vs the anchor's 639) across f26..f31, and
        // stone fragments detach 3 frames later (detached-blob pixels 42 at f27 -> 76 at f29 -> 594
        // at f30 -> 3,724 at f32), i.e. the arrival precedes its own debris. The raw argmax f20
        // (833ms) is REJECTED: at f20 the spear is still mid-descent, 6 frames and 6px of reach
        // short of the floor. Rubble fully clears — detached pixels are back to the f0 baseline
        // (31px vs 34px) by the last frame, and total area returns to +0.1%.
        url: 'assets/characters/gargoyle-spear/attack-strike.webm',
        cal: { h: 102.52, bottom: -1.89, left: 44.56 },
        contacts: [1083],
      },
      {
        // Take B, "STRIKE B (butt-spike bite)": drives the head down low-right, holds, then rises
        // into a straight thrust. §9 COMBO-STRING, two blows, and no ground contact at all (total
        // opaque area peaks at only +1.6%, so no struck geometry exists to measure) — both beats come
        // off the reach trace. 583 = f14, the first frame at the clip's lowest reach (869px, +52 vs
        // the anchor's 817) which then HOLDS f14..f48: the low bite. 2500 = f60, the peak RIGHT reach
        // of the whole clip (836px, +19), the thrust at full extension; energy f60 = 93.61 is the
        // clip's second-highest and agrees. The raw argmax f12 (500ms) is the last descent frame
        // before that low arrival — 2 frames early, corrected to f14.
        url: 'assets/characters/gargoyle-spear/attack-strike-b.webm',
        cal: { h: 107.64, bottom: -7.14, left: 49.51 },
        contacts: [583, 2500],
      },
    ],
    attack_throw: [
      {
        // ⚠⚠ TAKE A IS A PARKED, KNOWN-DEFECTIVE v1 — BEST AVAILABLE, NOT AN ACCEPTED TAKE. ⚠⚠
        // qa-boss/promote-gargoyle-rerolls.sh:18-22, verbatim: "Do NOT read the keyed attack_throw
        // clip as accepted; it is the best available, not a passing take." SEVEN re-roll generations
        // all failed (debris out the right / out three edges / spear overhead / feet 58px / feet
        // 61px / spear fully vertical head-up) and Tim PARKED it on the v1 raw (FINDING 12).
        // Its own two defects, both RE-MEASURED here rather than taken on trust:
        //   1. RUBBLE PERSISTS TO THE LAST FRAME. Total opaque area ends +2.6% over f0 (173,389 vs
        //      168,934 px = 4,455px of stone still lying there) and 791 detached-blob pixels remain
        //      at f96 versus 14 at f0. Returning to idle therefore POPS the rubble out of existence.
        //   2. LEFT EDGE OVERRUN. Contact on the left border on 35 of 97 frames (f29..f63), worst a
        //      42px contiguous run at alpha>40 on f63, rows y382..423 of the 664px crop. The parked
        //      note records 34px; 34px is what f58 measures, so the documented figure UNDERSTATES the
        //      worst frame by 8px. No feather was applied (scripts/edge-feather.mjs is untouched
        //      here) — the overrun ships as-is with the take.
        // A THIRD defect, not in the parked note, found by viewing f0: a flat stone SLAB already lies
        // on the ground at his right IN THE ANCHOR FRAME (it is what he rams), so this clip's f0 is
        // not the clean anchor pose the rest of the kit shares.
        // Contact = f28 (1167ms), the frame total area breaks out of its own pre-impact envelope
        // (f26 +3.4% / f27 +3.5% -> f28 +5.3% -> f29 +7.2% -> f34 +14.5%) as the slab fragments;
        // detached blobs follow at f31 (85px) -> f32 (2,808px). The raw argmax f26 (1083ms) is 2
        // frames early — VIEWED, the slab is still intact at f26.
        url: 'assets/characters/gargoyle-spear/attack-throw.webm',
        cal: { h: 104.08, bottom: -0.94, left: 40.6 },
        contacts: [1167],
      },
      {
        // Take B, "THROW B (horn toss)": pushes the spear forward, rears the horned head back, then
        // drives head-and-spear through. Accepted, gate-clean; no ground contact (area peaks +1.9%),
        // all four edges 0px across all 97 frames. Contact = f53 (2208ms), the peak RIGHT reach of
        // the clip (809px, +20 over the anchor's 789) which then HOLDS f53..f60 — the drive at full
        // extension. The raw argmax f40 (1667ms) is REJECTED outright: at f40 the spear is 8px BEHIND
        // the anchor pose, i.e. the argmax fires on the rear-back. The slow +15px lean over f0..f28
        // was deliberately NOT wired as a second contact: reach climbs monotonically across 24 frames
        // with no arrival, which is a lean, not a blow.
        url: 'assets/characters/gargoyle-spear/attack-throw-b.webm',
        cal: { h: 101.42, bottom: -0.79, left: 45.04 },
        contacts: [2208],
      },
    ],
    attack_block: [
      {
        // Take A, "BLOCK-COUNTER A (shaft brace)": raises the spear and braces the shaft across the
        // guard line. Contact = f34 (1417ms) — blocks fire on the CATCH, not the apex, and f34 is the
        // first frame at the clip's peak right reach (742px, +24 over the anchor's 718), which then
        // HOLDS f34..f56. The raw argmax f20 (833ms) is REJECTED: at f20 the shaft is still rising
        // into the brace (+16 of the eventual +24). No ground contact (area peaks +1.8%), all four
        // edges 0px on all 97 frames.
        url: 'assets/characters/gargoyle-spear/attack-block.webm',
        cal: { h: 101.49, bottom: -0.89, left: 48.21 },
        contacts: [1417],
      },
      {
        // Take B, "BLOCK-COUNTER B (pauldron guard)": shoves the spear out, then hunches behind the
        // raised wing and carved pauldron. Contact = f17 (708ms), inside the peak right reach
        // (819px, +26 over the anchor's 793, f16..f18) as the guard closes; energy f17 = 91.24 is a
        // local peak. The raw argmax f14 (583ms) is the forward push BEFORE the guard shell forms.
        // No ground contact (area peaks +0.7%), all four edges 0px on all 97 frames.
        url: 'assets/characters/gargoyle-spear/attack-block-b.webm',
        cal: { h: 102.2, bottom: -0.63, left: 45.2 },
        contacts: [708],
      },
    ],
    hit: {
      // "HIT (stagger)": head-snap recoil and a stagger, cause-free (no opponent, no incoming weapon
      // — the defect class that cost oni-tetsubo's hit a re-roll). Self-locked f0 vs f96 IoU 0.994,
      // f0 vs the idle anchor 0.949. All four edges 0px on all 97 frames. REQUIRED, not optional:
      // FightExperience.tsx:1778 gates the whole clip beat on the defender owning `hit`, so without
      // it this fighter would never trigger clip choreography as a defender, against any opponent.
      url: 'assets/characters/gargoyle-spear/hit.webm',
      cal: { h: 102.83, bottom: -2.2, left: 54.17 },
    },
    // ko is the ONE off-anchor clip by contract: he collapses and HOLDS down rather than returning to
    // the anchor. f0 vs f96 silhouette IoU 0.296 — the low value is CORRECT and expected ("ko ends
    // down by spec"), and f0 still matches the kit anchor at 0.948. The prone body reaches the bottom
    // border (worst 52px contiguous run at f36); that is a floor-level cut at the arena floor line,
    // not a side overrun, and left/right/top all measure 0px on all 97 frames.
    ko: {
      url: 'assets/characters/gargoyle-spear/ko.webm',
      cal: { h: 102.83, bottom: -2.2, left: 54.17 },
    },
    victory: {
      // "VICTORY (grounding the standard)": rises to full height and grounds the spear like a
      // standard. Self-locked f0 vs f96 IoU 0.993, f0 vs the anchor 0.940, all four edges 0px.
      // cal.h 114.15 is the kit's tallest by 6.5 — that is the clip reaching higher than the anchor
      // pose, not a keying error, and it is inside the roster's routine 110-131 band.
      url: 'assets/characters/gargoyle-spear/victory.webm',
      cal: { h: 114.15, bottom: -0.63, left: 46.93 },
    },
    // §11 signature FINISHER, three takes; one is chosen on a round-ending win. Positional mapping
    // (qa-boss/fire-queue.mjs:45-59): special_1 -> special.webm, special_2 -> special-b.webm,
    // special_3 -> special-c.webm.
    special: [
      {
        // Take A, "SPECIAL FINISHER (the herald's spin)": spins through and shatters the floor.
        // Contact = f36 (1500ms), where total opaque area breaks out of its envelope (f35 -3.9% ->
        // f36 +2.4% -> f37 +5.2%, peaking +9.3% at f49) with the silhouette's low extremum dropping
        // 6px — the shatter frame. The raw argmax f28 (1167ms) is REJECTED as the descent: at f28 the
        // area is still -4% (pure occlusion from the crouch), no geometry added yet. Rubble fully
        // clears: area back to +0.0% and detached pixels to 34 (f0 baseline 21) at f96.
        url: 'assets/characters/gargoyle-spear/special.webm',
        cal: { h: 104.72, bottom: -2.2, left: 46.31 },
        contacts: [1500],
      },
      {
        // Take B, "SPECIAL FINISHER (the fallen lintel)": drops a mass of stone and shatters it.
        // Contact = f30 (1250ms), where the low extremum jumps to +14px and area to +2.5% (peak
        // +4.2% at f34). The raw argmax f18 (750ms) is REJECTED as the coil — f18 is the frame of
        // MAXIMUM COMPRESSION (area -11%, the deepest self-occlusion in the clip), which is the
        // opposite of an impact. Rubble fully clears (area -0.1%, detached 34px, at f96).
        url: 'assets/characters/gargoyle-spear/special-b.webm',
        cal: { h: 102.83, bottom: -2.2, left: 46.7 },
        contacts: [1250],
      },
      {
        // Take C, "SPECIAL FINISHER (the cathedral perch)": stone erupts under him and he drives
        // down onto it. Contact = f22 (917ms), the frame fragments detach (detached-blob pixels 38 at
        // f21 -> 2,181 at f22 -> 7,905 at f24, peak 8,104 at f28). The raw argmax f10 (417ms) is
        // REJECTED: it fires on the PLANT, not the blow (see the defect note below).
        // ⚠ DEFECT SHIPPED KNOWINGLY, MEASURED, NOT SOFTENED: a stone PLINTH materialises under his
        // feet at f8-f9 (total area 0.8% at f7 -> 3.9% at f8 -> 9.6% at f9) and holds until it
        // vanishes between f84 and f88 (area back to -0.0%). While present it extends the silhouette
        // a measured 14px BELOW the anchor frame's bottom, every frame f12..f84. Because cal is
        // pinned to f0 — before the plinth exists — the plinth renders 14px of a 654px crop past the
        // anchor's floor line (14/654 x cal.h 102.99 = 2.2% of the fighter box), i.e. it pokes below
        // the arena floor and his feet read as lifted onto it for most of the finisher. It is invented
        // scenery popping in and out, the extra-objects class (qa-boss/check-extra-objects.mjs — NOT
        // run on this batch, see below). No re-roll was authorised for it in this session.
        // A green tint I thought I saw on the emerging plinth at f8 was WRONG on measurement: f_009,
        // f_012 and f_024 all carry 0 pixels with green excess >= 30 over the whole visible matte.
        url: 'assets/characters/gargoyle-spear/special-c.webm',
        cal: { h: 102.99, bottom: -2.36, left: 42.36 },
        contacts: [917],
      },
    ],
  },
  quotes: [
    'I have watched this gate for four hundred years. You lasted nine seconds.',
    'Stone does not tire. Stone does not bleed. Stone waits.',
    'The spear was cut from the same rock as my hands. Neither will let go.',
    'Go back to the warm places. I will still be here.',
  ],
};

// ---------------------------------------------------------------------------------------------
// NOT MEASURED — GAPS, stated as UNKNOWN rather than inferred from silence. The staged summaries
// carry no column for any of these and qa-boss/SESSION30-HARVEST-MANIFEST.tsv says of the batch
// "None was per-frame QA'd", so their absence is NOT a pass:
//   · qa-boss/check-anchor-lock.mjs — UNUSABLE for this character. qa-boss/gate-control.mjs reports
//     it: only idle.webm was shipped when it ran, so its f0 population was empty. No anchor-lock
//     verdict is quoted anywhere above. What IS quoted are two proxies I measured myself: each
//     clip's own f0-vs-fLAST silhouette IoU, and each clip's f0 placed into a 512px fighter box via
//     its own cal and IoU'd against idle's f0.
//   · qa-boss/check-extra-objects.mjs, scripts/check-containment.mjs, qa-boss/profile-containment.mjs,
//     turn / front-turn, matte-proof over black+white for the CLIPS, feet-planted, floor-growth,
//     and whether any clip needs scripts/edge-feather.mjs — all UNKNOWN. Per-edge contact runs and
//     total-area/debris traces above are my own substitutes, not those gates.
//   · RUNTIME facing. scripts/check-facing.mjs is a STATIC gate. qa-boss/phase28-drive.mjs is the
//     repo's only runtime facing assertion and it CANNOT reach this fighter: driveNode reaches a
//     character only through CONQUEST -> a node button by name -> FIGHT, and a free-roster fighter
//     has no node. It also asserts the p2 mirror, whereas a faces:'right' fighter in p1 must render
//     UNMIRRORED. No driver in qa-boss/** or scripts/** clicks a select tile or asserts p1 facing.
//     So `faces` is verified statically and by eye, NOT at runtime. Extending the driver is
//     orchestrator-owned work (qa-boss/** is off-limits here).
//
// OUTSTANDING DEFECTS, none of them fixed by this wire:
//   1. attack_throw take A is parked and known-defective — see its own block (rubble to the last
//      frame, LEFT 42px overrun, slab already in f0).
//   2. special-c's phantom plinth — see its own block.
//   3. ANCHOR-POSE BREAK on TWO takes, found by the box-space proxy and confirmed by eye:
//      attack-block f0 IoU 0.616 and attack-strike-b f0 IoU 0.615 against the idle anchor, where the
//      other ten new clips sit at 0.910-0.951. Cause, viewed: the idle anchor holds the spear LOW
//      across the body with the head at waist height, while both of those takes open with the spear
//      already RAISED to shoulder/head height and the torso straighter. Both clips self-lock fine
//      (f0 vs f96 IoU 0.993), so the pop is at the idle->clip cut-in, not inside the clip. This is
//      exactly what check-anchor-lock would have caught and could not.
//   4. Residual GREEN in the cutout: 118 pixels at green-excess >= 60 on the lossless keyed PNG
//      (30 of them >= 120, i.e. pure transmitted screen), worst rgb(52,227,46) at (377,772), in 10
//      clusters of 2-33px — a sliver between the wing membrane and the near leg (x373..382,
//      y734..802) and specks in the notches of the spear head's carved wing-vanes (x1170..1300,
//      y555..822). This is the interior-green class (green shining through thin stone/membrane), and
//      the fix — key-enemies.mjs's `interiorGreen` pass — is opt-in, hollow-pale-ONLY per the build
//      spec, and lives in a shared file this wire does not own. In the shipped webp it is 24 pixels
//      among 305,676 fully-opaque ones (0.0079%), which is the CLEANEST of the four cutouts I
//      measured head to head (thorn-warden 0.0130%, ir56-lion-serpent 0.1997%, kitsune-tanto
//      1.7821%). Edge-ring green is 17.62% of the 6,537 partial-alpha pixels (thorn-warden 11.76%,
//      kitsune-tanto 7.90%, ir56 3.26%) — higher than its peers because the wing membrane is thin
//      enough to transmit the screen. Same class Tim ruled "leave it" on kitsune's blade corona.
//      QA composite VIEWED over #07080c AND #ffffff: qa-phase20/shots/keyqa-gargoyle-spear.png.
// ---------------------------------------------------------------------------------------------
