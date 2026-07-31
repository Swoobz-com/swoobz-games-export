import type { FighterDef } from './types';

// ONI TETSUBO — MK-FINAL character. Red-skinned oni brute: heavy sweeping horns, roped torso, plated
// waist-guard and shin wraps, carrying a long spiked iron tetsubo held two-handed across the body.
//
// *** THIS MANIFEST IS NOT REGISTERED AND MUST NOT BE REGISTERED YET. ***
// It is deliberately absent from FIGHTERS in src/characters/index.ts. Only TWO of the thirteen kit
// states ship a clip (idle, ko), so registering it today would put a stub fighter in the roster.
// See "BEFORE THIS CAN BE REGISTERED" at the bottom of this file for the exact remaining work.
//
// CHROMA / PIPELINE. Generated on GREEN chroma (qa-boss/anchors/mk/oni-tetsubo-anchor-green.png,
// 1536x1536) from 960x960 24fps raws in qa-boss/raw/. Keyed with the pipeline of record:
//   ffmpeg extract (-start_number 0)
//   -> scripts/key-idle-clips.mjs --still <plate>
//   -> qa-boss/check-plate-retention.mjs --plate green   (BEFORE neutralize — the real check)
//   -> scripts/green-neutralize.mjs <dir> 4              (HARD=4, NOT the default 32)
//   -> qa-boss/cut-bloom-plate.mjs <dir>
//   -> scripts/edge-feather.mjs <dir> --right 48         (ko only; idle needs no feather)
//   -> ffmpeg VP9 yuva420p -crf 30
// Working frames live in qa-boss/oni/{src,keyed}-*, the encoded masters in qa-boss/oni/webm/.
//
// `cal`: every value below is the RE-DERIVED cal (qa-boss/rederive-cal.mjs on the FINAL frame dir),
// never the keyer's emitted value. green-neutralize DELETES pixels, which moves the alpha bbox that
// cal is derived from, so the emitted cal is stale by construction. Both shipped clips drifted past
// the 0.20 match band and therefore use the re-derived number:
//   idle  emitted {h:102.45, bottom:-0.46, left:50}    -> re-derived {h:102.77, bottom:-0.62, left:50.15}  drift 0.32
//   ko    emitted {h:102.91, bottom:-2.14, left:51.53} -> re-derived {h:103.38, bottom:-2.46, left:51.62}  drift 0.47
// (rederive-cal.mjs's own comment claims its A_THR/COV match the keyer's. They do NOT — it uses
// A_THR=8/COV=1 against the keyer's 128/3. That is exactly why the two disagree; trust the re-derive.)
//
// faces:'right' — MEASURED, not eyeballed. scripts/check-facing.mjs against the green plate scores
// both clips as-is 0.965 / 0.959 vs mirrored 0.119 / 0.121 (ratio 0.12), i.e. 0/2 mirrored: the art
// natively leads screen-right (horns, face, and the tetsubo all point right). NO hflip was applied
// anywhere in this kit. The game mirrors per THE FACING RULE for whichever slot he lands in.
export const ONI_TETSUBO: FighterDef = {
  id: 'oni-tetsubo',
  name: 'ONI TETSUBO',
  // NOTE: this cutout DOES NOT EXIST YET — no public/assets/enemies/oni-tetsubo.webp has been
  // produced. The path follows the roster convention so the asset drops straight in, but the manifest
  // stays unregistered until it does (a missing `still` would break the ultimate fallback + the HUD
  // medallion + the select tile, all three of which read from it).
  still: 'assets/enemies/oni-tetsubo.webp',
  faces: 'right',
  // PROVISIONAL — measured off the idle clip's own keyed frame 0 (qa-boss/oni/keyed-idle/f_000.png,
  // 676x668), NOT off a still cutout, because the cutout does not exist yet. The face reads eye-to-jaw
  // at ~x248 / y125 of that 676-wide crop = 0.367 / 0.185 in frame-WIDTH units (the units the medallion
  // transform consumes for BOTH axes). zoom 4.2 rather than the 4.6 house value because the horn sweep
  // makes the head silhouette unusually wide, the same reason ir56 dropped to 3.8 for its mane.
  // *** RE-MEASURE ALL THREE against the real cutout once it is produced — a cutout framed like
  // ir56's (1350x900 landscape) will not share this crop's proportions and these numbers will be wrong. ***
  portrait: { headX: 0.367, headY: 0.185, zoom: 4.2 },
  clips: {
    idle: {
      // Planted wide brawler stance, tetsubo held two-handed across the body and angled forward:
      // shoulders and club breathe, no step, no turn. Anchor-locked (f0 vs f96 body IoU 0.906) and
      // it IS the kit anchor — every other clip is scored for anchor-lock against this frame 0.
      // Needs NO edge feather: its union bbox sits inside the source frame with the keyer's full 4px
      // pad on all four sides, so all four edges measure a 0px contact run.
      url: 'assets/characters/oni-tetsubo/idle.webm',
      cal: { h: 102.77, bottom: -0.62, left: 50.15 },
    },
    // ko is the ONE off-anchor clip by contract: he drops the tetsubo, falls and HOLDS fully prone on
    // the ground rather than returning to the anchor. check-anchor-lock scores f0 0.949 (ok) and
    // fLAST 0.264 — the low end value is CORRECT and is explicitly exempt ("ko ends down by spec").
    // The dropped tetsubo lies along the floor and runs off the RIGHT source edge, so this clip gets
    // scripts/edge-feather.mjs --right 48 (the house band). Measured right-edge contact BEFORE the
    // feather: a 48px contiguous run at alpha>40, worst frame f029, present on 78/97 frames, all of it
    // inside y502-615 (floor level, the club shaft) with the body well clear of the band. After the
    // feather all four edges measure 0 and the containment profiler reports A40/A128/A200 = 0.
    ko: {
      url: 'assets/characters/oni-tetsubo/ko.webm',
      cal: { h: 103.38, bottom: -2.46, left: 51.62 },
    },
    // ---------------------------------------------------------------------------------------------
    // `hit` IS DELIBERATELY ABSENT — the v1 raw is REJECTED, not merely unkeyed.
    // qa-boss/raw/oni-tetsubo-hit-v1.mp4 fails qa-boss/check-extra-objects.mjs: "EXTRA OBJECT
    // PRESENT, 2 simultaneous blobs @f8 sizes=[32655,764]". A dark spherical mace/flail head on a
    // shaft flies IN from the right, crosses to x427-512 of the 902px crop (i.e. past his head, deep
    // inside frame), and exits right again over f008-f014, together with airborne debris specks. That
    // is the model inventing a visible attacker to justify the unseen impact — the exact defect class
    // that cost IR-48's `hit` four cycles, which is why that gate exists.
    // It is NOT fixable by feathering: on f010/f012 the intruder sits ~400px from the nearest edge.
    // An earlier reading of this clip called the right-edge contact at f8/f14 "the tetsubo tip during
    // recoil". It is not — his own tetsubo is in his hands and fully in frame throughout; f8 and f14
    // are merely the two frames on which the SECOND weapon happens to touch the border, which is why
    // edge-based measures alone made it look benign.
    // The clip needs a RE-ROLL (solo-safe, cause-free, no opponent, no debris), not a re-key.
    // For the record only, the rejected v1 keyed to crop 902x922, emitted cal
    // {h:141.85, bottom:-0.62, left:54.31} / re-derived {h:142.28, bottom:-0.62, left:54.48}. Those
    // numbers belong to the REJECTED take and must NOT be reused — a re-rolled raw gets a new bbox
    // and therefore a new cal.
    // Until it lands, the engine's fallback ladder (FightExperience.tsx: displayState) resolves a
    // missing `hit` to the idle clip and the existing CSS hit choreography still plays, so the absence
    // is safe rather than broken.
    // ---------------------------------------------------------------------------------------------
  },
  quotes: [
    'The club does not need to be sharp. It needs to arrive.',
    'I broke the gate, the wall, and the men who built both.',
    'You brought a blade to a weight problem.',
    'Stand up. I have not finished being patient.',
  ],
};

// BEFORE THIS CAN BE REGISTERED in src/characters/index.ts:
//   1. public/assets/enemies/oni-tetsubo.webp (+ -pfp.webp) — the keyed cutout `still` points at.
//   2. Re-measure `portrait` against that cutout (the values above are off the idle crop).
//   3. Re-roll + key `hit` (v1 rejected above), then attack_strike / attack_throw / attack_block,
//      and optionally victory + special. `attack_*` takes also need MEASURED `contacts`
//      (scripts/measure-contacts.mjs), which neither shipped state requires.
//   4. Decide whether oni takes a campaign node (src/engine/fightCampaign.ts) or is roster-only —
//      a product decision, deliberately left open here.
