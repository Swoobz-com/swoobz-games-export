import type { FighterDef } from './types';

// ONI TETSUBO — MK-FINAL character. Red-skinned oni brute: heavy sweeping horns, roped torso, plated
// waist-guard and shin wraps, carrying a long spiked iron tetsubo held two-handed across the body.
//
// FREE-ROSTER PLAYABLE, NO CAMPAIGN NODE (Tim's ruling). Nothing in src/engine/fightCampaign.ts names
// him, so rosterGating.bossNodeId returns null (rosterGating.ts:18-22) and isFighterSelectable returns
// true immediately (:28-32) — he is selectable the moment the orchestrator adds the import + FIGHTERS
// entry to src/characters/index.ts. This file does NOT register itself.
//
// READY TO REGISTER. The two blockers this header used to carry are CLOSED:
//   1. public/assets/enemies/oni-tetsubo.webp now exists (900x900, real alpha — 72.42% of pixels at
//      alpha 0, 15,157 partial-alpha feather pixels, minAlpha 0 / maxAlpha 255). Keyed from the
//      ORIGINAL MK FINAL art "input/MK FINAL/mythic/Oni Tetsubo.png" (1536x1536, backdrop sampled
//      rgb(0,187,36)) with scripts/key-enemies.mjs's key() recipe reproduced verbatim in a one-off
//      driver (that script takes no argv and its ENEMIES table has no oni row; it is a shared file).
//      Self-check bgLikeKept = 0px against SELF_CHECK_MAX 150. Encoded with the recorded line
//      `scale=-1:900 -c:v libwebp -q:v 90 -compression_level 6`; -pfp.webp from "Oni Tetsubo PFP.png"
//      at scale=512:512 -q:v 88, NOT keyed (it keeps its studio grey, fight.css:2078).
//   2. `portrait` is re-measured against THAT cutout (see below). The old provisional numbers
//      (0.367 / 0.185, taken off an idle crop) were VERIFIED WRONG by rendering both: they push the
//      snout onto the left rim of the medallion and leave the right third empty.
//
// SHIPS 11 OF THE 13 KIT TAKES. Two are deliberately NOT wired, both for measured reasons — see the
// "NOT WIRED" block at the bottom of `clips`. Every one of the 8 FighterState keys the engine can
// request is populated, so no state ever falls through to the idle fallback.
//
// CHROMA / PIPELINE. Generated on GREEN (qa-boss/anchors/mk/oni-tetsubo-anchor-green.png, 1536x1536)
// from 960x960 24fps raws in qa-boss/raw/. Two pipelines meet in this kit:
//   idle / ko / victory  (phase ~45): key-idle-clips --still <plate> -> check-plate-retention
//     -> green-neutralize <dir> 4 (HARD=4, NOT the default 32) -> cut-bloom-plate
//     -> edge-feather --right 48 (ko only) -> ffmpeg VP9 yuva420p -crf 30
//   the other 8        (session 30, qa-boss/key-s30-harvest.mjs): key-idle-clips --still <plate>
//     -> check-plate-retention --plate green (BEFORE the post-pass — "the real check")
//     -> scripts/green-despill.mjs -> ffmpeg VP9 yuva420p -crf 30 -auto-alt-ref 0
// The s30 clips were wired BYTE-IDENTICAL out of qa-boss/staged-s30/oni-tetsubo/webm/ — md5 verified
// per clip, nothing re-keyed, re-encoded or re-timed. All 11 decode 97 frames with a REAL alpha plane
// (alpha_mode=1; `-c:v libvpx-vp9` MUST precede `-i` or ffmpeg silently returns a 100%-opaque frame —
// confirmed here by negative control).
//
// `cal`: ALL TWELVE VALUES BELOW ARE RE-DERIVED, not the keyer's emitted number, and they are all
// re-derived against THE SAME still — the new cutout above. This replaced the emitted values after a
// measurement, not on principle:
//   * qa-boss/rederive-cal.mjs REFUSES on this batch's generation plate (exit 2, "the still has NO
//     pixel below alpha 128"): the padded MK plate is alpha-255 everywhere (measured: 1536x1536,
//     pxBelowAlpha128 = 0, minAlpha 255), which is its unkeyed-input guard, rederive-cal.mjs:129-140.
//     That is why the staged summaries carry calDrift: null on every row — key-s30-harvest.mjs:162-170
//     invokes the tool but gates on `o.rederived`, a key rederive-cal never emits (it emits `cal`).
//     So every STAGED cal is the keyer's emitted value.
//   * Pointing it at the new KEYED cutout makes it run. It reported "DRIFTED - use the re-derived cal"
//     on all 12 — but the drift is NOT staleness, and the numbers prove it: on the 9 s30 clips the
//     ratio rederived.h / emitted.h is 0.92667 +/- 0.00003 (min 0.92664, max 0.92670). A single scale
//     factor to four decimal places across nine independent clips is a CHANGE OF REFERENCE, not nine
//     coincident drifts. Staleness is separately impossible here: scripts/green-despill.mjs only ever
//     writes d[i] / d[i+1] / d[i+2] (:154, :160) and NEVER d[i+3], so the post-pass cannot move the
//     alpha bbox that cal is derived from.
//   * The reference that matters is the one the engine renders against. THE EMITTED CAL IS REFERENCED
//     TO THE WRONG STILL — the opaque plate, whose content box degenerates to the whole 1536 frame —
//     and it lands the whole kit 23px LOW. Simulating the shipping CSS exactly (square .fr-fighter box,
//     `object-fit: contain` on a SQUARE 900x900 still so it maps 1:1, video at height/bottom/left =
//     cal.h/bottom/left%) and comparing each clip's placed anchor frame against the still's silhouette:
//         EMITTED    every clip, all 12:  feet +23px, head -40px, centre -6px   (uniform, so no
//                                          state-to-state jump — but 23px off the still)
//         RE-DERIVED feet -1..+1px, head -9..+2px, centre +1..+2px              (pixel-on-pixel)
//     types.ts:26-28 defines cal as "chosen so the clip's ANCHOR frame lands pixel-on-pixel over the
//     still", so the re-derived family is the one that satisfies the contract.
//   * CONSEQUENCE, AND WHY idle/ko/victory MOVED TOO: the two conventions differ by a constant, so
//     MIXING them is the jump bug cal exists to prevent. idle/ko/victory were therefore re-derived off
//     their ORIGINAL LOSSLESS keyed PNGs (qa-boss/oni/keyed-idle, keyed-ko,
//     qa-boss/staged/oni-tetsubo/keyed/victory) against the same cutout, and their previous in-manifest
//     values were retired:
//         idle    102.77/-0.62/50.15 -> 96.42/2.09/50.92   (rederive drift 6.35)
//         ko      103.38/-2.46/51.62 -> 96.40/0.37/52.36   (drift 6.98)
//         victory 103.08/-2.15/55.38 -> 95.81/0.66/55.78   (drift 7.27)
//     Their ratios (0.9382 / 0.9325 / 0.9295) are NOT the s30 constant, as expected: they came off the
//     older pipeline whose green-neutralize DID delete pixels.
//
// `contacts`: MEASURED with scripts/measure-contacts.mjs (motion-energy argmax, 24fps) and then
// FRAME-CHECKED against a weapon-reach trace — the per-frame rightmost opaque column of the LARGEST
// CONNECTED COMPONENT, so the detached dust/rubble this kit sheds cannot inflate the reach — plus an
// eyes-on look at the candidate frames. He faces screen-right, so reach = the tetsubo's forward extent.
// FIVE OF SEVEN ARGMAXES WERE REJECTED as wind-up or recovery; every correction is noted on its take.
// ms = round(frame / 24 * 1000), frame index 0-based (f_001.png == frame 0), CLIP time (pre-CLIP_RATE).
//
// faces:'right' — MEASURED, never eyeballed, and cross-checked on TWO independent anchors.
// scripts/check-facing.mjs oni-tetsubo --still (anchor = the new keyed cutout) scores all 11 shipped
// clips as-is 0.9527-0.9819 vs mirrored 0.1205-0.1268, ratio 0.124-0.133, per-frame votes AAAAA on
// every clip => 0/11 mirrored, no mid-window turn. Re-running against the green MK plate instead gives
// as-is 0.9473-0.9693 / mirrored 0.1190-0.1254 — same verdict, so the result is not an artefact of one
// reference. Neither anchor is degenerate (plate green-mask coverage 14.16%, cutout alpha coverage
// 26.88%, both far under check-facing's 0.95 abort). ABSOLUTE DIRECTION FIXED BY EYE on a rendered
// frame strip: horns, face and tetsubo all lead screen-RIGHT. NO hflip anywhere in this kit. The game
// mirrors per THE FACING RULE for whichever slot he lands in.
export const ONI_TETSUBO: FighterDef = {
  id: 'oni-tetsubo',
  name: 'ONI TETSUBO',
  // The phase-20-convention keyed enemy cutout: keyed in place, NO crop, source aspect preserved, so
  // the 1536x1536 square art becomes a 900x900 still. Subject bbox (alpha>=128) x30..883 y41..875 =
  // 854x835, margins L30 R16 T41 B24, filling 92.8% of the height — the raw art's own framing
  // surviving the key, exactly like thorn-warden (97.1%) and ir48 (94.2%).
  still: 'assets/enemies/oni-tetsubo.webp',
  faces: 'right',
  // Head-crop for the HUD medallion + select tile, MEASURED on the 900x900 cutout above (not on a clip
  // crop — the previous provisional values were, and were wrong). The still is SQUARE, so the
  // headX-and-headY-are-both-fractions-of-the-WIDTH rule cannot bite here: W == H == 900.
  // Rows y41..y135 hold the horn crown + skull and span x226..388; the face below it (rows y136..y235,
  // measured with x>=295 so the shoulder mass entering from the left is excluded) spans x295..361 with
  // the jaw bottoming at y235. Head cluster = x226..388, y41..y235 -> centre x307 / y138
  // = 307/900 = 0.341 and 138/900 = 0.153.
  // zoom 4.1, not the 4.6 house value, for thorn-warden's exact documented reason: the horn sweep makes
  // the head silhouette unusually WIDE (183px across vs a 195px-tall head), and at 4.6 both horn tips
  // are cut by the medallion rim. VIEWED, not assumed — the medallion was rendered from the real cutout
  // with the shipping transform (FightExperience.tsx:947-952) at zoom 3.8/4.0/4.1/4.2/4.6 and 4.1 is the
  // largest value that keeps both horns inside the circle with the tusked snout on the centre line.
  // The select tile was then viewed and accepted, NOT re-tuned: .fr-select-tile is aspect-ratio 3/4
  // (fight.css:1480) so its CSS `top` percentage resolves against the taller height and the head sits
  // ~9px lower there than on the square medallion. That is pre-existing roster behaviour; calibrating
  // on the medallion is what every other manifest did.
  portrait: { headX: 0.341, headY: 0.153, zoom: 4.1 },
  clips: {
    idle: {
      // Planted wide brawler stance, tetsubo held two-handed across the body and angled forward:
      // shoulders and club breathe, no step, no turn. It IS the kit anchor — check-anchor-lock scores
      // every other clip against this frame 0, and the whole kit passes (f0 body 0.947-0.971).
      // Needs NO edge feather: containment measures all of TOP/LEFT/RIGHT clean on this clip.
      url: 'assets/characters/oni-tetsubo/idle.webm',
      cal: { h: 96.42, bottom: 2.09, left: 50.92 },
    },
    // §10 VARIANT LAW. attack_strike ships ONE take, not two: the `attack_strike` raw's own clip is
    // withheld (see NOT WIRED below), so the -b take carries the state alone. A one-element list and a
    // bare clip mean the same thing to clipVariants(), so this is written as the plain form.
    attack_strike: {
      // Overhead smash: he hauls the tetsubo up vertically, then drives it into the ground.
      // CONTACT = f22 (917ms), the frame the club reaches the floor at its furthest forward extent
      // (reach 815px, the peak; +130px past the f0 anchor reach of 685).
      // THE RAW ARGMAX f14 (583ms) WAS REJECTED — it is the WIND-UP, and provably so: reach at f14 is
      // 395px, the MINIMUM of the whole clip, i.e. the club is fully coiled back over his head. The
      // energy spike there is the speed of the haul, not an impact. Reach f0 685 -> f12 485 -> f14 395
      // -> f18 721 -> f22 815 (peak) -> f26 755.
      url: 'assets/characters/oni-tetsubo/attack-strike-b.webm',
      cal: { h: 115.62, bottom: 1.53, left: 59.85 },
      contacts: [917],
    },
    attack_throw: [
      {
        // Take A: two-handed overhead raise into a full-body ground slam.
        // CONTACT = f52 (2167ms), the club at the floor at peak reach 959px.
        // THE RAW ARGMAX f40 (1667ms) WAS REJECTED — thorn-warden's exact failure mode. At f40 the club
        // is at the top of the OVERHEAD RAISE and its reach is 766px, still BELOW the f0 anchor reach of
        // 813, i.e. it has not yet travelled forward at all. Reach f36 617 -> f40 766 -> f46 884 ->
        // f52 959 (peak) -> f58 855. Verified by eye: dust only erupts from f46 on.
        url: 'assets/characters/oni-tetsubo/attack-throw.webm',
        cal: { h: 135.59, bottom: 1.39, left: 50.78 },
        contacts: [2167],
      },
      {
        // Take B: forward barge into a two-handed club shove, shedding grey stone rubble.
        // CONTACT = f17 (708ms), the frame the shove ARRIVES at full extension (reach 945px) and the
        // first frame the rubble appears. The reach then HOLDS at 945 through f47 — he leans on it.
        // THE RAW ARGMAX f14 (583ms) WAS REJECTED as the travel: reach f12 830 -> f14 883 -> f16 931 ->
        // f17 945. At f14 the club is only 57% of the way through its advance.
        // ⚠ 945 is the LAST COLUMN of this clip's 946px-wide crop: the club runs off the right source
        // edge from f17 to f47 (containment: RIGHT 89px @f36). See the containment note at the bottom.
        url: 'assets/characters/oni-tetsubo/attack-throw-b.webm',
        cal: { h: 96.51, bottom: 0.39, left: 51.63 },
        contacts: [708],
      },
    ],
    attack_block: [
      {
        // Take A: club-across guard held long, then a forward counter-thrust.
        // CONTACT = f65 (2708ms), the counter at full extension — reach 843px, the ONLY frame in the
        // clip past the f0 anchor reach of 813.
        // THE RAW ARGMAX f63 (2625ms) WAS REJECTED, narrowly and deliberately: at f63 the reach is
        // 709px, still inside the anchor envelope and rising. Reach f12 450 (guard closed) -> holds
        // ~445-470 to f60 -> f63 709 -> f64 813 -> f65 843 (peak) -> f70 825.
        url: 'assets/characters/oni-tetsubo/attack-block.webm',
        cal: { h: 131.98, bottom: 1.96, left: 49.22 },
        contacts: [2708],
      },
      {
        // Take B: a PURE block — he brings the tetsubo up across the body, absorbs, and returns. There
        // is no counter: the clip's maximum reach is f0's own 813px, i.e. it never extends past the
        // anchor at all.
        // CONTACT = f24 (1000ms), the CATCH — the frame the guard is fully closed (reach 449px, the
        // minimum). Per thorn-warden's rule, blocks fire on the catch, not the apex.
        // THE RAW ARGMAX f60 (2500ms) WAS REJECTED as RECOVERY: from f60 the reach climbs 569 -> 713 ->
        // back to the 813 anchor by f84 and never overshoots it, so that energy is him standing back up,
        // not a blow. Reach f0 813 -> f20 619 -> f24 449 (closed) -> f60 569 -> f68 713 -> f80 803.
        url: 'assets/characters/oni-tetsubo/attack-block-b.webm',
        cal: { h: 129.22, bottom: 2.24, left: 40.72 },
        contacts: [1000],
      },
    ],
    hit: {
      // RE-ROLLED, AND THE RE-ROLL IS THE ONE THAT SHIPS. The v1 raw was rejected for an invented
      // second weapon (a dark mace/flail head flying in from the right, crossing to x427-512 of the
      // 902px crop and out again over f008-f014) — the ir48 defect class. That rejection stands for v1
      // and v1 only; the note that used to live here described a clip that is no longer in play, so it
      // is retired. Both halves re-measured on the ACCEPTED raw (qa-boss/raw/oni-tetsubo-hit.mp4):
      //   qa-boss/check-extra-objects.mjs -> "1 @f0 sizes=[32726]  CLEAN", exit 0
      //   qa-boss/check-anchor-lock.mjs   -> f0 0.962 / fLAST 0.962, ok
      // and the gate is not simply blind: run on the OLD qa-boss/raw/oni-tetsubo-hit-v1.mp4 it still
      // prints "2 @f8 sizes=[32655,764]  EXTRA OBJECT PRESENT" and exits 1. Same tool, same threshold,
      // opposite verdicts — the intruder is gone, not merely unmeasured.
      // Cause-free head-snap recoil, no opponent, clean recover to the anchor. Wiring it also turns the
      // clip beat back on for him as a DEFENDER: FightExperience.tsx:1775-1778 gates useClipChoreo on
      // `defenderHasHit`, so without this state he would never trigger clip choreography for ANY
      // opponent. No `contacts` — `hit` is a defender state and the engine never reads contacts off it.
      url: 'assets/characters/oni-tetsubo/hit.webm',
      cal: { h: 128.57, bottom: 2.1, left: 43.54 },
    },
    // ko is the ONE off-anchor clip by contract: he drops the tetsubo, falls and HOLDS fully prone on
    // the ground rather than returning to the anchor. check-anchor-lock scores f0 0.949 (ok) and
    // fLAST 0.264 — the low end value is CORRECT and is explicitly exempt ("ko ends down by spec").
    // The dropped tetsubo lies along the floor and ran off the RIGHT source edge, so this clip carries
    // scripts/edge-feather.mjs --right 48 (the house band). Measured right-edge contact BEFORE the
    // feather: a 48px contiguous run at alpha>40, worst frame f029, present on 78/97 frames, all of it
    // inside y502-615 (floor level, the club shaft) with the body well clear of the band. After the
    // feather containment measures all of TOP/LEFT/RIGHT clean on this clip — re-confirmed here.
    ko: {
      url: 'assets/characters/oni-tetsubo/ko.webm',
      cal: { h: 96.4, bottom: 0.37, left: 52.36 },
    },
    // Round-win taunt. It was already on disk and byte-identical to its staged source
    // (qa-boss/staged/oni-tetsubo/webm/victory.webm, md5 0d28290cd139a07c85d6f7324bc9ee00) but was
    // never wired into this manifest — a pure oversight, now closed. Anchor-lock f0 0.971 / fLAST 0.960,
    // containment clean on all three checked edges.
    victory: {
      url: 'assets/characters/oni-tetsubo/victory.webm',
      cal: { h: 95.81, bottom: 0.66, left: 55.78 },
    },
    // §11 SIGNATURE FINISHER, and THE MAPPING IS POSITIONAL. special_1 is dead (below), so the
    // `special.webm` slot stays EMPTY and is not back-filled by promoting special_2 — the two takes
    // keep the filenames their ordinals earned, special-b.webm and special-c.webm. Exactly
    // eclipse-ofuda's precedent, where the -b slot is the skipped one.
    special: [
      {
        // Take A (special_2 -> special-b.webm): a driving two-handed thrust that erupts off the club head.
        // CONTACT = f26 (1083ms), the frame the thrust ARRIVES (reach 935px, effectively the 937px peak)
        // and the burst ignites. Reach then holds 937 to f56.
        // THE RAW ARGMAX f24 (1000ms) WAS REJECTED as the wind-up: reach at f24 is 640px — below the f0
        // anchor's 813 — with the club still cocked back. Reach f20 449 -> f24 640 -> f26 935 -> f28 937.
        url: 'assets/characters/oni-tetsubo/special-b.webm',
        cal: { h: 105.3, bottom: 1.82, left: 49.5 },
        contacts: [1083],
      },
      {
        // Take B (special_3 -> special-c.webm): the ogre stomp — he drops into a crouch and drives club
        // and weight into the floor, cratering it.
        // CONTACT = f27 (1125ms). THIS IS THE ONE ARGMAX ACCEPTED, and it was still frame-checked before
        // accepting: f27 is the clip's global energy peak (64.80) AND it sits inside the extension the
        // reach reaches at f25 and HOLDS to f54, with ground dust igniting at f26-f28. The later rubble
        // mass at f32 is the aftermath, not the blow — wiring that would fire the beat 5 frames late.
        // Reach f20 847 -> f25 905 (peak) -> f27 905 -> f32 905 -> f50 905.
        // ⚠ check-anchor-lock passes the POSE on this clip (f0 0.953 / fLAST 0.952) but flags
        // "ENDS WITH DEBRIS ON SCREEN": the all-pixels score at the last frame is 0.536, i.e. shed
        // material is still in frame at f96 instead of being gone. Cosmetic and it does not move the
        // body, but it is a prompt defect for the eventual re-roll, recorded rather than smoothed over.
        url: 'assets/characters/oni-tetsubo/special-c.webm',
        cal: { h: 105.01, bottom: 0.96, left: 54.61 },
        contacts: [1125],
      },
    ],
    // =============================================================================================
    // NOT WIRED — 2 of the 13 kit takes. Both are measured refusals, not gaps.
    //
    // 1. special_1 IS UNKEYABLE AND HAS NO WEBM AT ALL. key-idle-clips.mjs's phase-271 full-frame-union
    //    -bbox refusal fired on it: airborne debris reaches all four frame extremes by f60, so the
    //    union bbox spans the entire 960x960 source and the crop degenerates to the whole frame. The
    //    evidence is on disk — qa-boss/staged-s30/oni-tetsubo/keyed/special_1/ holds 97 PNGs at
    //    960x960 (uncropped pass-1 output), and there is NO special_1.cal.json and NO
    //    staged-s30/oni-tetsubo/webm/special_1.webm beside its 9 siblings. key-idle-clips.mjs:194 says
    //    those frames "are NOT a usable result; delete them." It needs a re-roll with the debris kept
    //    inside frame, not a re-key.
    //    ⚠ AND THE RECORD OF THAT REFUSAL WAS ERASED: qa-boss/staged-s30/oni-tetsubo.summary.json has
    //    exactly ONE row (special_3) and `failed: []`, against 9 webms on disk, because a `--state` run
    //    truncates the summary (key-s30-harvest.mjs:188 writes only that run's rows). Do NOT read that
    //    `failed: []` as "nothing refused". Per-clip cal came from the .cal.json files, not the summary.
    //
    // 2. attack_strike (the -a take) IS WITHHELD: ITS START POSE IS BROKEN.
    //    qa-boss/check-anchor-lock.mjs scores it f0 body 0.629 — under the 0.80 BROKEN threshold — and
    //    prints "*** START POSE BROKEN — will SNAP on crossfade ***", exiting 1. Confirmed by eye: at
    //    f0 the tetsubo is already hauled up overhead, while the kit anchor holds it low across the
    //    body, so the engine's idle -> attack_strike opacity crossfade would pop the club across the
    //    screen. Its end is fine (fLAST 0.956), which is exactly what makes this a start-pose defect
    //    rather than a bad take.
    //    A SECOND, INDEPENDENT MEASUREMENT AGREES: check-facing --still scored this clip as-is 0.4528
    //    while every other clip in the kit scored 0.9527-0.9819. That is not a facing problem (its ratio
    //    is 0.315, firmly as-is) — it is the same broken f0 pose disagreeing with the anchor silhouette.
    //    This is the ir37-pink-tessen defect class, the one that produced Tim's "her model turns" report
    //    and the most-seen animation bug in the game, so it is not shipped on a hope.
    //    The webm was NOT left in public/ as an orphan, deliberately: it would keep check-anchor-lock
    //    exiting 1 on a directory whose wired kit is clean, and a gate that is red on shipped-good
    //    assets gets disbelieved. The staged master survives untouched at
    //    qa-boss/staged-s30/oni-tetsubo/webm/attack_strike.webm (its cal, re-derived on the same still,
    //    is {h:131.5, bottom:0.7, left:54.28}; measure-contacts argmax f22/917ms, reach peak also f22),
    //    so if Tim overrides this call it is one cp plus one array element — but it needs a re-rolled
    //    raw that starts on the anchor, not a re-key.
    // =============================================================================================
  },
  quotes: [
    'The club does not need to be sharp. It needs to arrive.',
    'I broke the gate, the wall, and the men who built both.',
    'You brought a blade to a weight problem.',
    'Stand up. I have not finished being patient.',
  ],
};

// MEASURED AND OPEN — recorded here because no gate in this repo currently convicts either one.
//
// A. A GREEN COLOUR CAST ON THE SHED DUST, ON 5 OF THE 11 SHIPPED CLIPS. The dust/plume VFX these
//    clips throw is green-DOMINANT, not neutral. Mean RGB of the detached masses, 8-connected
//    components on the shipped keyed frames at native resolution:
//      attack-block   f_082  18,090px rgb(59,63,45) + 1,522px rgb(63,67,49)
//      attack-throw   f_070  10,956px rgb(84,88,52)
//      special-b      f_048  18,624px rgb(89,91,67) + 9,193px rgb(83,85,65) + 3 smaller
//      special-c      f_061  38,998px rgb(82,78,67)
//      attack-strike-b f_029  2,982px rgb(73,77,63)
//    (attack-throw-b's debris is the clean case for contrast: rgb(117,109,106) / (100,93,92) /
//    (76,70,68) — neutral grey stone, correct.) Root cause is structural, not random: the plume is
//    SEMI-TRANSPARENT over a green screen, so the backdrop transmits through it; scripts/green-despill
//    only rewrites pixels within DESPILL_EDGE_PX of a transparent one, so the INTERIOR of a large
//    translucent mass is never reached. This is hollow-pale's interiorGreen class arriving on a clip kit.
//    WHY NOTHING CAUGHT IT — both of check-plate-retention's predicates miss this exact colour:
//      isPlate  (:236) needs g > r + 30. On rgb(89,91,67) that is 91 > 119 — FALSE.
//      isNeutralizerOlive (:252) needs |r-g| <= 2 AND b < g - 40. |89-91| = 2 passes, but 67 < 51 — FALSE.
//    The dust sits in the gap between them: green-dominant but too desaturated for one and not
//    neutralizer-shaped enough for the other. Its aggregate is diluted further because the gate averages
//    over all 97 frames — attack-throw reads 0.42% aggregate against a 2.05% worst single frame. So
//    `node qa-boss/check-plate-retention.mjs --plate green <the 11 webms>` prints
//    "PASS — 12 clip(s) all clean" and exits 0, in BOTH the VIDEO and the FRAMES-DIR domain. Measuring
//    it needs a predicate the repo does not have; with a plain green-dominance test (g > r, g > b,
//    g - max(r,b) >= 6) the worst frames read attack-strike 6.73%, attack-throw 5.99%,
//    attack-strike-b 5.69%, special-c 5.06%, special-b 2.50%, attack-block 1.62% — against idle 0.01%
//    and ko 0.03%, which is the control proving the measure is not just finding red skin.
//    NOT FIXED HERE, because the wire step is byte-identical by contract. The escalation path already
//    exists and simply never fired: key-s30-harvest.mjs escalates to green-neutralize 4 when plate
//    retention reads >= 1%, and it read 0.00%. A re-key of those 5 clips through green-neutralize 4 is
//    the recorded remedy — it needs an art call, since it also deletes pixels.
//
// B. CONTAINMENT: 7 of the 11 shipped clips exceed scripts/check-containment.mjs's 6px threshold on
//    TOP/LEFT/RIGHT (the gate exits 1): special-b LEFT 102px @f17 · attack-block-b LEFT 90px @f24 ·
//    attack-throw-b RIGHT 89px @f36 · special-c RIGHT 87px @f49 · attack-throw TOP 58px @f27 +
//    LEFT 22px @f26 + RIGHT 20px @f53 · attack-block LEFT 51px @f53 · attack-strike-b RIGHT 21px @f25.
//    Clean: idle, ko, hit, victory. Component-labelled at each worst frame, the edge run belongs to THE
//    FIGHTER (the body or the club he holds) in every case, not to debris.
//    CONTEXT, MEASURED RATHER THAN ASSERTED: this is the roster norm, and oni is on the better side of
//    it. The same gate on shipped, QA-passed kits gives thorn-warden 7/11 over (worst RIGHT 317px,
//    LEFT 150px) and ir56-lion-serpent 9/12 over (worst RIGHT 438px, LEFT 199px); eclipse-ofuda is
//    4/13 and ir48-hex-paper-lord is the clean 0/13. Oni's worst run, 102px, is under a third of the
//    two shipped kits'. The house remedy is scripts/edge-feather.mjs (oni's own ko already carries
//    --right 48) but applying it means re-processing, which the byte-identical wire contract forbids.
//
// STILL UNMEASURED BY ANYONE, so do not read this file's silence as a pass: per-clip turn / front-turn
// (qa-boss/check-turn.mjs, check-frontturn.mjs), feet-planted, floor-growth, matte-proof over
// black+white on every frame rather than the sampled ones viewed here, and body-commitment. The batch's
// own manifest header says it: "None was per-frame QA'd."
//
// THE RUNTIME FACING ASSERTION HAS NO PATH TO THIS FIGHTER. qa-boss/phase28-drive.mjs is the repo's
// only live facing check and it reaches a character solely through CONQUEST -> a node button by name ->
// FIGHT, asserting the p2 mirror. Oni has no campaign node, so no nodeName reaches him and no p2 slot
// ever holds him. In p1 the assertion also INVERTS — isMirrored(def,'p1') = ('right' !== 'right') =
// false, so he must render UNMIRRORED — and no driver in qa-boss/ or scripts/ clicks a select tile or
// asserts p1 facing. So `faces` here rests on the two static measurements above, which are real, and
// NOT on any runtime confirmation, which does not exist. Building that driver is orchestrator-owned
// work in qa-boss/, off-limits to this file.
