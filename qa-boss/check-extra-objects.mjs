// EXTRA-OBJECT GATE — is there ever a SECOND detached object in frame?
//
// WHY THIS EXISTS. The IR-48 `hit` state cost FOUR cycles to a single defect class: the model kept
// inventing a visible attacker to justify the "unseen impact" (v1 flying talisman debris, v2 a blade
// from the LEFT, v3 a blade from the TOP). Neither existing gate reliably catches that:
//
//   profile-containment.mjs scores the LONGEST CONTIGUOUS BORDER RUN, so a few-px-wide torn talisman
//   crossing an edge never builds a run long enough to trip a band — it returned CLEAR on hit v1,
//   a clip whose pixels demonstrably reach both row 0 and the last column.
//
//   check-frontturn.mjs derives both its signals from the BBOX, so a detached object does not just
//   go unnoticed, it actively CORRUPTS the reading: debris inflated hit v1's aspect to 1.06 and
//   tripped the "wider than tall" hard tell on a clip whose torso was in clean side profile.
//
//   And an intruder that never touches an edge at all is invisible to both.
//
// This gate labels 8-connected components on the keyed silhouette and reports the maximum number of
// simultaneous blobs above minPx. A correct STANDOFF clip is ONE object: the fighter with his props
// in hand. Two or more means something is in frame that should not be.
//
// CALIBRATED AGAINST A KNOWN-BAD CONTROL, which is the only reason a clean result means anything:
//   hit v3 (blade from the top)  -> 2 blobs @f9, sizes [37322, 2491]   EXTRA OBJECT PRESENT
//   hit v4 (accepted)            -> 1 blob,      sizes [37275]         CLEAN
//
// minPx defaults to 400 (at scale 480) to ignore keying specks. It may only be LOWERED, and only with
// a control re-run: too low and ordinary alpha noise reads as an object. RAISING it is refused outright
// (exit 2) — see THE THRESHOLD IS A CEILING below for the measured reason.
//
// CAVEAT: a prop the fighter is HOLDING is connected to him and counts as one blob, which is what we
// want; but a prop he legitimately RELEASES (the ko state drops both weapons) will read as a second
// object. Do NOT gate `ko` on this — see the ko_suffix_rule in the clipdata ledger.
//
// ⛔ IT USED TO PRINT "EXTRA OBJECT PRESENT" AND EXIT 0. (phase 261, TOOLCHAIN-AUDIT §3)
// On qa-boss/raw/oni-tetsubo-hit-v1.mp4 it printed `2 @f8 sizes=[32655,764]` + EXTRA OBJECT PRESENT
// and exited **0**, so every `&&` chain and `$?` test read a caught intruder as a pass. EXIT CODES:
//    0 = CLEAN (or a `ko` clip, which is EXEMPT — see the caveat above and the ko_suffix_rule)
//    1 = a REAL DETECTED FAILURE: two or more simultaneous objects in a non-ko clip
//    2 = usage/input error — nothing meaningful was measured (bad args, 0 frames decoded, or the
//        WRONG DOMAIN, below)
// (REFINED by --expect-detached in phase 262 — see the DECLARATION block lower down. "two or more
//  simultaneous objects" is now "more simultaneous objects than the caller declared", default 0.)
//
// ⛔ AND IT DID NOT CHECK WHAT DOMAIN IT WAS HANDED. (TOOLCHAIN-AUDIT §8)
// `check-extra-objects qa-boss/webm/ir48-hex-paper-lord-hit.webm` printed
// `1 @f0 sizes=[274080]` -> "CLEAN", exit 0 — while the SAME character's raw
// (qa-boss/raw/ir48-hex-paper-lord-hit.mp4) says `4 @f8` EXTRA OBJECT PRESENT. 274080 is
// 480x571 = THE ENTIRE FRAME: the decode above has no `-c:v libvpx-vp9` before `-i`, so a keyed
// webm loses its alpha plane, nothing is green any more, and the whole frame labels as one blob.
// A guaranteed-CLEAN verdict, on any keyed clip, forever. The guard is measured, not guessed —
// mean green-plate share of the decoded frames, over 17 real inputs:
//    green raws (oni-tetsubo, ir48 hit v1/v3/v4 + ko, eclipse, hollow-pale, ir37, gargoyle,
//                satoshi, thorn, lich, kitsune, lady-kurotachi)              78.08-88.34%
//                                                          (lowest single frame seen: 76.50%)
//    ir56-lion-serpent raws (MAGENTA plate)                                  0.07%
//    sora-yari raws        (MAGENTA plate)                                   0.00%
//    keyed webms (ir48 hit, hollow-pale hit)                                 0.00%
// MIN_PLATE_PCT = 25 sits in that empty band with 3x headroom under the lowest real raw.
//
// ⛔ THIS TOOL IS GREEN-PLATE ONLY AND HAS NO --plate FLAG. On a magenta-plate kit the mask
// inverts to the whole frame, so it now REFUSES (exit 2) rather than returning the false CLEAN it
// used to: the ORIGINAL code on qa-boss/raw/sora-yari-block-a.mp4 printed
// `1 @f0 sizes=[230397]` -> CLEAN, exit 0 — and 230397 is 480x480, THE WHOLE FRAME.
// No magenta measurement path was added: TOOLCHAIN-AUDIT records this tool as UNVERIFIED FOR
// MAGENTA and none was built here. It refuses instead of guessing.
// ⚠ THE MAGENTA ROSTER IS FOUR, NOT THREE. TOOLCHAIN-AUDIT §1 lists ir56-lion-serpent,
// onryo-katana and pale-choir, from `grep -l "solid saturated MAGENTA" qa-boss/prompts/*.md`.
// sora-yari is magenta too (qa-boss/prompts/sora-yari.md: "chroma screen background", `#a3005f`;
// its raws sample [159,0,91] in every corner) and that grep misses it because the wording differs.
//
// ⛔ AND AN ABSURD minPx COULD STILL BUY A VACUOUS PASS. (phase 262)
// `check-extra-objects qa-boss/raw/oni-tetsubo-hit-v1.mp4 999999` printed
// `max simultaneous blobs >= 999999px : 0 @f-1  sizes=null` + CLEAN and exited **0** — on the exact
// clip that exits 1 at the default threshold. The NaN guard below rejected a non-numeric minPx but
// not an absurd numeric one. THE FIX IS AT THE SIGNATURE, NOT THE ARGUMENT: `worst===0 / worstF===-1`
// is STRUCTURALLY IMPOSSIBLE for a real green-plate raw, because the subject himself is always at
// least one blob (real subjects measure 25910-58213px at scale 480 across the 17 clips sampled here).
// That signature can only mean "the threshold matched nothing, so nothing was measured", and it now
// exits 2 whatever route produced it — clamping the argument would only have closed the one door.
//
// ⛔ AND THE SIGNATURE GUARD DOES NOT COVER AN *ORDINARY-LOOKING* minPx. THE THRESHOLD IS A CEILING.
// (phase 263 — the argument door the phase-262 signature fix deliberately did not close, reopened by
// the integration verifier's "validate every numeric argument".) MEASURED, on the two calibrated
// known-bads, with a number no reviewer would blink at:
//   $ node qa-boss/check-extra-objects.mjs qa-boss/raw/oni-tetsubo-hit-v1.mp4 2600
//     max simultaneous blobs >= 2600px : 1 @f0  sizes=[32651]
//     CLEAN — never more than one object in frame                                        exit 0
//   $ node qa-boss/check-extra-objects.mjs qa-boss/raw/ir48-hex-paper-lord-hit-v3.mp4 2600
//     max simultaneous blobs >= 2600px : 1 @f0  sizes=[37286]
//     CLEAN — never more than one object in frame                                        exit 0
// Both exit 1 at the default 400. The `worst===0` guard is BLIND to this by construction: 32651 and
// 37286 px WERE measured, so the "nothing was measured" signature never appears — this is a threshold
// that measured plenty and concluded nothing, which no verdict-shaped guard can see. Only the argument
// can carry it. The doctrine above already said minPx is calibrated and may only be LOWERED (lowering
// makes the gate stricter — the fail-safe direction), so MAX_MIN_PX is the calibrated default itself:
// anything ABOVE 400 is refused with exit 2. Both known-bad extras (764px, 2491px) then always count,
// and so does the smallest legitimate detached piece measured anywhere here (404px).
//
// ⛔ AND MAKING THE VERDICT AUTHORITATIVE TURNED IT RED ON SHIPPED-GOOD CLIPS. (phase 262)
// The moment exit 1 became real, this gate started BLOCKING legitimate DETACHED VFX on clips that are
// shipped and QA-passed. A gate that is red on good assets gets disbelieved, which is worse than no
// gate. Eight clips were named. SIX OF THE EIGHT WERE MEASURED ON THE WRONG FILE — see below.
//
// ⛔ THE PHASE-262 NUMBERS WERE READ OFF NON-ACCEPTED TAKES. (phase 263, integration verifier)
// The per-clip counts were transcribed from whichever raw's FILENAME resembled the state's name. On a
// kit with v1..v8 on disk that is not the accepted take, and a budget quoted for the wrong take
// silently WIDENS this gate on the take that actually ships. Every one was re-derived from the two
// sources of truth — src/characters/<char>.ts and the qa-boss/<char>-clipdata.json ledger — and
// RE-MEASURED. FOUR of the eight are CLEAN on their accepted take and need no declaration at all:
//
//  state                  ACCEPTED take (raw)                        SOURCE OF TRUTH (quoted line)
//  --------------------------------------------------------------------------------------------------
//  eclipse-ofuda          eclipse-special-1-v2.mp4                   eclipse-ofuda.ts:203 "RE-ROLLED
//   special_1              *** NOT eclipse-ofuda-special-1-v2.mp4,   (phase 96, v2) from qa-boss/raw/
//                          which is the older phase-31 take ***      eclipse-special-1-v2.mp4" +
//                                                                    clipdata phase81... accepted "v2"
//   -> 2 @f33 sizes=[34840,626]                          DECLARE 1   (the wrong file measures 1: CLEAN)
//
//  eclipse-ofuda          eclipse-ofuda-special-3-v2.mp4             eclipse-ofuda.ts:228 "Re-rolled
//   special_3                                                        from qa-boss/raw/eclipse-ofuda-
//                                                                    special-3-v2.mp4"
//   -> 1 @f0  sizes=[34012]                        CLEAN, NO FLAG   (phase 262 read eclipse-ofuda-
//                                                                    special_3.mp4, the v1: 4 blobs)
//
//  hollow-pale            hollow-pale-special-2.mp4                  hollow-pale-clipdata.json
//   special_2              (v1 — its two re-rolls were REJECTED)     phase79..._doc "special_2 (ships
//                                                                    as special-b.webm)" + verdict
//                                                                    "BOTH REJECTED"
//   -> 4 @f54 sizes=[34194,534,444,422]                  DECLARE 3   (unchanged — this one was right)
//
//  hollow-pale            hollow-pale-special-3-v2.mp4               hollow-pale-clipdata.json
//   special_3                                                        clips.special_3_v2.webm =
//                                                                    ".../hollow-pale/special-c.webm"
//   -> 1 @f0  sizes=[34760]                        CLEAN, NO FLAG   (phase 262 read hollow-pale-
//                                                                    special-3.mp4, the v1: 2 blobs
//                                                                    [35463,1386] — its 1386/35463 IS
//                                                                    the retired "3.91%" row)
//
//  ir48-hex-paper-lord    ir48-hex-paper-lord-special-1-v5.mp4       clipdata clips.special_1.accepted
//   special_1                                                        "v5" + reroll_chain "v5 ACCEPTED.
//                                                                    v6 (... LEFT 110), v7 (...), v8"
//   -> 12 @f47 sizes=[58213,1378,1066,989,942,875,   DECLARE 11      (phase 262 read ...-special-1.mp4,
//                     845,748,585,448,418,404]                        the REJECTED v1: 9 blobs
//                                                                    [37080,2443,...] — its 2443/37080
//                                                                    IS the retired "6.59%" row)
//
//  ir48-hex-paper-lord    ir48-hex-paper-lord-special-2.mp4          clipdata clips.special_2.accepted
//   special_2              (the only take — accepted first fire)     "v1"
//   -> 2 @f8  sizes=[28298,8945]                          DECLARE 1  (unchanged — this one was right)
//
//  ir48-hex-paper-lord    ir48-hex-paper-lord-special-3-v3.mp4       clipdata clips.special_3.accepted
//   special_3                                                        "v3" / ACCEPTED_VERSION "v3"
//   -> 1 @f0  sizes=[37304]                        CLEAN, NO FLAG   (the ledger recorded this exact
//                                                                    number itself: "extra-object gate
//                                                                    1 blob (37304px) CLEAN")
//
//  lich-scythe idle       lich-idle-v2.mp4                           key-parked-accepted.mjs:32
//                                                                    { char:'lich-scythe', out:'idle',
//                                                                     raw:'lich-idle-v2.mp4' }
//   -> 1 @f0  sizes=[25910]                        CLEAN, NO FLAG   (prompts/lich-scythe.md:256 says
//                                                                    the same: v1 "2 blobs @f64" ->
//                                                                    v2 "1 blob")
//
// THE OLD LIST RECONSTRUCTS EXACTLY OFF THE WRONG FILES, which is how "may have been measured on the
// wrong files" became "was". Measuring the six resemblance-named raws gives 4 (eclipse-ofuda-special_3),
// 2 (hollow-pale-special-3), 9 (ir48 ...-special-1), 2 (ir48 ...-special-3), 2 (lich-idle) and 1
// (eclipse-ofuda-special-1-v2) — which, with the two takes that WERE right (hollow-pale-special-2 = 4,
// ir48 ...-special-2 = 2), sorts to `2,2,2,2,4,4,9`: the phase-262 blob-count row digit for digit. It
// is seven numbers for eight clips because the eighth, eclipse special_1 on the wrong file, measured
// 1 blob — CLEAN. So the old row could not have come from the accepted takes, and the clip the old
// text called reddened was the one clip the old measurement said was clean.
//
// CORROBORATED INDEPENDENTLY OF THE LEDGERS, because "the ledger says so" is one source. Each shipped
// keyed webm was silhouette-fingerprinted (bbox-normalised 64x64 mask IoU, 7 frames) against every
// candidate raw; the accepted take wins by a wide margin wherever the method discriminates:
//   eclipse special.webm    -> eclipse-special-1-v2 0.907  vs eclipse-ofuda-special-1-v2 0.630
//   eclipse special-c.webm  -> eclipse-ofuda-special-3-v2 0.935  vs eclipse-ofuda-special_3 0.282
//   hollow-pale special-b   -> hollow-pale-special-2 0.801  vs its v2 0.357 / v3 0.355
//   hollow-pale special-c   -> hollow-pale-special-3-v2 0.771  vs special-3 0.657 / special-3b 0.628
//   ir48 special.webm       -> special-1-v5 0.833  vs v1 0.426 / v4 0.421 / v6 0.433   <-- settles the
//                              "v5/v6" ambiguity in ir48-hex-paper-lord.ts:134 in favour of v5
//   lich idle.webm          -> lich-idle-v2 0.913  vs lich-idle 0.729
// NOT DISCRIMINATIVE for ir48 special_2/special_3 (all candidates 0.27-0.44): those two were keyed with
// cut-bloom-plate, which removes the lit-plate halo and so changes the silhouette the fingerprint
// compares. For special_3 the ledger's own recorded gate reading (1 blob, 37304px) matches the
// re-measurement digit for digit, which is a tighter fingerprint than the IoU would have been.
//
// THE GEOMETRY STILL CANNOT SEPARATE THEM — re-derived on the ACCEPTED takes, every axis still
// overlaps or INVERTS, and the closest pair got CLOSER, not further apart:
//   axis            known-BAD controls              declared-GOOD clips (accepted takes)
//   2nd-blob ratio  2.34% (oni-tetsubo hit v1)      2.37% (ir48 special_1 v5)  <-- 0.03pp, INVERTED
//                   6.67% (ir48 hit v3)             1.56% (hollow-pale special_2)
//                                                   1.80% (eclipse special_1)
//                                                   31.61% (ir48 special_2)  <-- 4.7x the worst control
//   blob count      2 and 2 (both controls)         2, 2, 4, 12  <-- the controls are the MINIMUM
//   smallest extra  764px (oni hit v1)              404px .. 8945px  <-- 764 sits INSIDE the range
// So a "second blob must be subject-sized" rule inverts on the closest pair (2.34% BAD vs 2.37% GOOD)
// and would silently destroy this gate's only real detection. A minPx raise dies the same way and
// worse than phase 262 thought: clearing the declared-good tail needs minPx > 8945, which is 3.6x past
// hit v3's 2491px calibration and 11.7x past oni hit v1's 764px — and raising it is now refused
// outright (THE THRESHOLD IS A CEILING, above). A blanket `special*` exemption is worse still — a
// special is exactly where an invented extra character gets generated, it is the state the IR-48 hit
// saga was about, and it does not even cover the measured tail (`lich idle` is an IDLE — and on its
// accepted take it is CLEAN, so that tail entry was itself an artefact of the wrong file).
//
// SO THE ANSWER IS A DECLARATION, NOT A HEURISTIC — `--expect-detached <n>`, and it is a BUDGET.
// The caller states how many detached pieces this specific clip is expected to shed; n MORE than that
// is still a failure. Bounded on purpose: a declaration is not a blanket exemption, so a spurious
// extra character in a special still trips the gate that declared its charm swirl. Default is 0, so
// an undeclared clip is judged exactly as strictly as before.
//   0 = CLEAN, a `ko` clip, or DETACHED-DECLARED and within the declared budget
//   1 = a REAL DETECTED FAILURE: more simultaneous objects than were declared, in a non-ko clip
//   2 = usage/input error, nothing meaningful was measured (bad args, 0 frames, 0 blobs, wrong domain)
//
// WHY NOT DRIVE IT FROM A DATA FILE. qa-boss/arsenal.json covers 10 of 40 kits and `lich` — one of
// the eight — is not in it AND has no src/characters entry, so that source cannot even express the
// measured tail; arsenal.json's own ROSTER LAW is the OPPOSITE claim ("NOTHING in this game
// launches, throws, fires or drops a separate object"), so a "detached is fine here" field would
// contradict the contract that file exists to enforce. The qa-boss/*-clipdata.json ledgers do not
// share a schema (only ir48 has a per-clip `accepted` field; eclipse's acceptance is buried in a
// date-keyed `phase81_special_1_reroll_2026_07_31` block, hollow-pale's exists only as prose in
// `phase79_special_2_rerolls_2026_07_31.verdict`, and lich-scythe has NO ledger at all — its accepted
// take is recoverable only from a keying script, qa-boss/key-parked-accepted.mjs:32), cover 11 of 40
// kits, and record this verdict only in PROSE. Finding the eight accepted takes above took all of
// those routes plus a silhouette fingerprint; a data-driven flag would have to read a schema that
// does not exist. And a per-CHARACTER flag is the wrong granularity outright: ir48 needs the
// declaration on special_1 and special_2 while special_3 is CLEAN and `hit` — THE CLIP THIS GATE WAS
// WRITTEN FOR — must stay strict. Per-invocation is the only granularity the evidence supports.
// FAIL-SAFE DIRECTION, chosen deliberately: no declaration == strict == a multi-blob clip FAILS.
// The 30 kits with no arsenal entry therefore get MORE scrutiny, never a free pass; the cost of the
// choice is a human look at a new detached-VFX clip before it can be declared, which is the correct
// cost given the geometry above is provably blind.
//
// ⛔ AND THE DECLARATION ITSELF WAS AN OFF SWITCH WHENEVER IT DID NOT BIND. (phase 264)
// The block above ends by choosing to let an OVER-WIDE budget pass with a WARNING at exit 0. The
// adversarial sweep took exactly that door, with the flag's own legal maximum. MEASURED, on BOTH
// calibrated known-bads — the two clips that are the only evidence this gate works at all:
//   $ node qa-boss/check-extra-objects.mjs qa-boss/raw/oni-tetsubo-hit-v1.mp4 --expect-detached 12
//     max simultaneous blobs >= 400px : 2 @f8  sizes=[32655,764]
//     DETACHED OBJECT PRESENT — DECLARED EXPECTED (1 detached piece(s), declared up to 12)
//       WARNING: the declaration is WIDER than this clip — measured 1, declared 12. ...   exit 0
//   $ ... ir48-hex-paper-lord-hit-v3.mp4 --expect-detached 12   ->  2 @f9 [37322,2491]    exit 0
// Both exit 1 undeclared. The WARNING text was already correct about what had happened — "a budget
// that exceeds what the clip can shed cannot bind: anything up to 12 pieces passes here, INCLUDING
// AN INVENTED EXTRA CHARACTER" — and then exited 0 anyway. A gate that prints the reason it cannot
// fail and passes is the defect this file has been hardened against three times.
// THE RULE NOW: A DECLARATION MUST BIND. `--expect-detached n` is accepted when n equals the pieces
// actually measured (the budget binds: one more piece exits 1, which is the whole point of a budget)
// and REFUSED (exit 2) when n is larger than the clip can shed, naming the number that would bind.
// It is not a verdict — nothing was concluded about the clip — it is a refusal to run a comparison
// that cannot fail. The legitimate case is unaffected and was re-measured: ir48-hex-paper-lord-
// special-1-v5 sheds 11 pieces (12 blobs) and `--expect-detached 11` still exits 0, printing "The
// budget BINDS at this number". The cost is that a declaration copied to a re-roll that sheds LESS
// now refuses instead of passing — deliberate, because that is precisely the case where the number
// came from a different take and nobody can tell from the log.
//
// usage: node qa-boss/check-extra-objects.mjs <green-plate-raw.mp4> [minPx] [--expect-detached <n>]
import { makeArgs } from './lib/argcheck.mjs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
const require=createRequire(new URL('../package.json', import.meta.url));
const {PNG}=require('pngjs');
const isGreen=(r,g,b)=>g>110&&g>r+40&&g>b+40;
const USAGE='usage: node qa-boss/check-extra-objects.mjs <green-plate-raw.mp4> [minPx] [--expect-detached <n>]';

// ARGUMENT PARSING, because `--expect-detached 3` used to land in the minPx slot and be rejected as a
// NaN threshold. Flags are pulled out FIRST; what is left over is positional.
// EVERY MISREAD OF THIS COMMAND LINE IS REFUSED, not defaulted. A gate whose invocation does not mean
// what it says is the same defect class as a threshold nothing can cross: the log records a run the
// caller did not ask for. That holds even where the misread happens to fail SAFE (an ignored trailing
// positional leaves the gate strict) — silence is the defect, not the direction.
const argv=process.argv.slice(2);
// THE DECLARATION CEILING. `--expect-detached 999` would be the SAME defect this file is hardened
// against — an absurd numeric argument that makes the gate structurally unable to fail — just
// wearing a friendlier name, so it is capped. The cap is measured: the loudest legitimate
// detached-VFX clip is ir48-hex-paper-lord special_1 ON ITS ACCEPTED TAKE (v5) at 12 simultaneous
// blobs = 11 extra pieces (a storm of burning paper charms), re-verified in phase 264. Past the cap
// this is an input error, not a pass: a human has to look at a clip shedding that much.
// ⚠ THE CAP IS NO LONGER THE ONLY BOUND ON THIS FLAG — see the phase-264 header block: a
// declaration must also BIND on the clip in front of it, which is checked after measurement.
const MAX_DECLARED=12;
// ONE validator, imported from qa-boss/lib/argcheck.mjs and never copied. It owns --expect-detached
// entirely: the duplicate (`--expect-detached 0 --expect-detached 9`, where there is no answer to
// which budget binds), the missing value (which used to coerce to a silent "declared 0"), the empty
// value (Number('') === 0, the same silent zero), the non-integer, and the unknown flag that used to
// be demoted to a positional and read as minPx.
const A=makeArgs(argv,{tool:'check-extra-objects',usage:USAGE});
const DECL=A.num('--expect-detached',null,{min:0,max:MAX_DECLARED,integer:true,
 band:`a declaration is a BUDGET: how many detached pieces THIS clip is expected to shed, so that one more `
  +`is still caught. The loudest legitimate clip measured on its ACCEPTED take (ir48 special_1 v5) sheds 11, `
  +`so ${MAX_DECLARED} already clears the roster by one piece. A number above it can never fail, which is the `
  +`cannot-fail defect class this gate exists to kill — and a clip that really sheds more than ${MAX_DECLARED} `
  +`is a human review, not a flag.`});
const hasDecl=DECL!==null;
let DECLARED=hasDecl?DECL:0;
const args=A.positionals();
A.done();
// A THIRD POSITIONAL IS A MISREAD COMMAND LINE. `<file> 400 3` used to run at minPx 400 with the 3
// silently dropped — a caller who meant a budget of 3 gets a strict run and a log that does not say so.
if(args.length>2){
 console.error(`ERROR: too many positional arguments — ${JSON.stringify(args.slice(2))} has no slot, and used to be dropped in silence.`);
 console.error('       This tool takes at most <file.mp4> [minPx]. A budget is NOT positional — it is');
 console.error(`       --expect-detached <n>. Nothing on this command line is silently dropped.\n${USAGE}`);
 process.exit(2);
}
const SRC=args[0];
const bail=(code)=>{try{fs.rmSync(dir,{recursive:true,force:true});}catch{/* best effort */}process.exit(code);};
// See MIN_PLATE_PCT in the header: measured 81.15-89.27% on real green raws, 0.07% on a magenta raw,
// 0.00% on a keyed webm. Below this the mask is the whole frame and the blob count means nothing.
const MIN_PLATE_PCT=25;
if(!SRC){console.error(`ERROR: no input file.\n${USAGE}`);process.exit(2);}
if(!fs.existsSync(SRC)){console.error(`ERROR: no such file: ${SRC}\n${USAGE}`);process.exit(2);}
// The cheap half of the domain guard (TOOLCHAIN-AUDIT §8): .webm IS the keyed/alpha domain in this
// repo. Caught here before spending a decode; anything else still has to clear MIN_PLATE_PCT below.
if(/\.webm$/i.test(SRC)){
 console.error(`ERROR: ${path.basename(SRC)} is a KEYED WEBM — this gate reads the RAW green-plate MP4.`);
 console.error('       The decode has no `-c:v libvpx-vp9` before -i, so a webm loses its alpha plane,');
 console.error('       nothing reads as green, and the whole frame labels as ONE blob: a guaranteed');
 console.error('       "CLEAN" that measured nothing. ir48 hit: the webm said CLEAN, its raw said');
 console.error('       EXTRA OBJECT PRESENT. Run it on qa-boss/raw/<clip>.mp4 instead.');
 process.exit(2);
}
// A NaN minPx made `s>=MIN_PX` false for every blob, so `worst` stayed 0 and the gate printed CLEAN
// off zero blobs — the same cannot-fail defect by another door. (An ABSURD numeric minPx bought the
// same vacuous pass and is caught at the signature after measurement — see NOTHING WAS MEASURED.)
// DEFAULT_MIN_PX is also the CEILING: see THE THRESHOLD IS A CEILING in the header. minPx 2600 —
// finite, positive, unremarkable — printed CLEAN + exit 0 on BOTH calibrated known-bads while
// measuring 32651 / 37286 px of subject, so the "nothing was measured" signature could not fire.
// Lowering is the fail-safe direction (more blobs count); raising is a disarm, and is refused.
const DEFAULT_MIN_PX=400,MAX_MIN_PX=DEFAULT_MIN_PX; // ignore specks; never ignore more than specks
// ⚠ THE ONE ARGUMENT ARGCHECK CANNOT OWN, AND WHY IT STAYS LOCAL. minPx is POSITIONAL — the call
// shape `check-extra-objects <file.mp4> 400` predates the flag era and is what the run-book types.
// argcheck's num() locates a FLAG and its value; it has no positional-numeric form, so the three
// checks below (token shape, finite+positive, the CEILING) are hand-written here rather than in the
// shared validator. They are the LAST hand-rolled argument checks in this file: everything with a
// `--` in front of it goes through argcheck. If argcheck ever grows a positional-numeric form, this
// block is the thing to delete. (The band itself is measured and unchanged — see THE THRESHOLD IS A
// CEILING in the header: 764px and 2491px are the two known-bad extras, and minPx 2600 printed CLEAN
// + exit 0 on both.)
// Parsed as a TOKEN first: Number() accepts '', ' ', '0x190', '1e9' and 'Infinity', none of which a
// caller ever typed on purpose, and two of which sail past a finite/positive test.
if(args[1]!==undefined&&!/^\d+(\.\d+)?$/.test(String(args[1]).trim())){
 console.error(`ERROR: minPx must be a plain positive number, got ${JSON.stringify(args[1])}.`);
 console.error('       Not accepted: empty, negative, hex (0x190), exponent (1e9), Infinity, NaN — a');
 console.error(`       threshold that matches no blob makes this gate print CLEAN off nothing.\n${USAGE}`);
 process.exit(2);
}
const MIN_PX=args[1]===undefined?DEFAULT_MIN_PX:Number(args[1]);
if(!Number.isFinite(MIN_PX)||MIN_PX<=0){
 console.error(`ERROR: minPx must be a positive number, got ${JSON.stringify(args[1])}.`);
 console.error(`       A NaN threshold matches no blob at all and the gate would print CLEAN.\n${USAGE}`);
 process.exit(2);
}
if(MIN_PX>MAX_MIN_PX){
 console.error(`ERROR: minPx ${MIN_PX} is ABOVE the calibrated default ${DEFAULT_MIN_PX} — that is a disarmed gate, not a stricter one.`);
 console.error('       This threshold is calibrated against two known-bads whose extra object measures');
 console.error('       764px (oni-tetsubo hit v1) and 2491px (ir48-hex-paper-lord hit v3). Raise minPx past');
 console.error('       either and the gate stops being able to detect the very clips that prove it works:');
 console.error('       measured, `oni-tetsubo-hit-v1.mp4 2600` prints "1 @f0 sizes=[32651]" + CLEAN and exits');
 console.error('       0. It measured 32651px of subject, so the NOTHING WAS MEASURED signature cannot fire —');
 console.error('       nothing downstream of the argument can catch this. The smallest legitimate detached');
 console.error('       piece measured on an accepted take is 404px, which is also below this default.');
 console.error(`       minPx may only be LOWERED (stricter), and only with a re-run of both controls.\n${USAGE}`);
 process.exit(2);
}
// (The declaration's PARSE — value present, digits only, whole, 0..MAX_DECLARED — now happens at the
// top of the file inside argcheck. NOTE THE CORRECTION carried over from phase 262: it wrote "9 blobs
// = 8 extra" for ir48 special_1, which was read off ...-special-1.mp4, the REJECTED v1; the ACCEPTED
// take (v5) sheds three MORE. The 12 stands unchanged, deliberately — it clears the loudest real clip
// by exactly ONE piece, which is what a budget should cost. Widening a ceiling to fit a number you
// have just discovered is how a cap stops being a cap. What is NEW in phase 264 is that the cap is no
// longer the only bound: a declaration must also BIND on the clip in front of it, checked below,
// because `--expect-detached 12` passed BOTH calibrated known-bads at exit 0.)
// SCRATCH DIR — os.tmpdir() is the FALLBACK, not a nicety. With TEMP unset this line threw
// `TypeError [ERR_INVALID_ARG_TYPE]: The "path" argument must be of type string` and node exited **1**,
// and 1 in this tool's contract means A REAL DETECTED FAILURE. An environment problem that reports
// itself as a caught intruder is the mirror image of the defect this gate exists to kill: the exit
// code has to keep meaning what the header says it means.
const TMPROOT=process.env.TEMP||process.env.TMP||os.tmpdir();
const dir=path.join(TMPROOT,`bl_${process.pid}`);
fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
spawnSync('ffmpeg',['-y','-v','error','-i',SRC,'-vf','scale=480:-1','-vsync','0',path.join(dir,'f_%04d.png')]);
const fl=fs.readdirSync(dir).filter(x=>x.endsWith('.png')).sort();
// FAIL LOUD ON A VACUOUS RUN (phase 133). `worst` starts at 0 and the verdict is `worst<=1`, so a run
// that decoded NOTHING printed "CLEAN — never more than one object in frame" off zero measurements.
// Hit for real: this tool takes an MP4, and passing it a FRAMES DIRECTORY makes ffmpeg fail silently,
// after which the gate reports a clean pass. A gate that says CLEAN when it measured nothing is worse
// than no gate. Exit 2 (distinct from the verdict path) so it can never be mistaken for a pass.
if(!fl.length){
 console.error(`ERROR: decoded 0 frames from ${JSON.stringify(SRC)} — nothing was measured.`);
 console.error('       This tool takes the MP4 itself, not a frames directory: check-extra-objects.mjs <file.mp4> [minPx]');
 fs.rmSync(dir,{recursive:true,force:true});
 process.exit(2);
}
let worst=0,worstF=-1,worstSizes=null,plateSum=0;
fl.forEach((x,fi)=>{
 const p=PNG.sync.read(fs.readFileSync(path.join(dir,x)));
 const {width:w,height:h,data}=p;
 const m=new Uint8Array(w*h);
 let plate=0;
 for(let i=0;i<m.length;i++){const k=i*4;const g=isGreen(data[k],data[k+1],data[k+2]);if(g)plate++;m[i]=g?0:1;}
 plateSum+=plate/m.length*100;
 const lab=new Int32Array(w*h).fill(-1); const sizes=[];
 const st=new Int32Array(w*h);
 for(let i=0;i<m.length;i++){
  if(!m[i]||lab[i]!==-1)continue;
  let sp=0; st[sp++]=i; lab[i]=sizes.length; let n=0;
  while(sp>0){const c=st[--sp]; n++; const cx=c%w, cy=(c-cx)/w;
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=cx+dx, ny=cy+dy; if(nx<0||ny<0||nx>=w||ny>=h)continue;
    const ni=ny*w+nx; if(m[ni]&&lab[ni]===-1){lab[ni]=lab[i];st[sp++]=ni;}}}
  sizes.push(n);
 }
 const big=sizes.filter(s=>s>=MIN_PX).sort((a,b)=>b-a);
 if(big.length>worst){worst=big.length;worstF=fi;worstSizes=big;}
});
// MEASURE -> CHECK THE DOMAIN -> CHECK SOMETHING WAS ACTUALLY MEASURED -> ONLY THEN JUDGE. Both
// guards have to preempt the verdict line, because the verdict either would print is a confident,
// permanent "CLEAN".
const platePc=plateSum/fl.length;
if(platePc<MIN_PLATE_PCT){
 console.error(`ERROR: only ${platePc.toFixed(2)}% of the decoded frame is GREEN PLATE (need >= ${MIN_PLATE_PCT}%) — WRONG DOMAIN, nothing was judged.`);
 console.error('       This gate segments the subject by REMOVING a green plate. With no green in frame the');
 console.error('       mask is the whole frame, every clip labels as ONE blob, and the verdict is a');
 console.error('       guaranteed "CLEAN" that measured nothing. Real green raws measure 78-88% here.');
 console.error('       Causes: a keyed/alpha clip (0.00%), or a MAGENTA-plate kit — ir56-lion-serpent,');
 console.error('       onryo-katana, pale-choir AND sora-yari all measure <= 0.07%. This tool has NO');
 console.error('       --plate flag and is UNVERIFIED FOR MAGENTA (TOOLCHAIN-AUDIT §8): it refuses');
 console.error('       rather than guess. There is no override — with no plate there is nothing to segment.');
 console.error(`       Confirm the kit:  grep -oiE "solid saturated [A-Z]+|magenta|#[0-9a-f]{6}" qa-boss/prompts/<kit>.md`);
 bail(2);
}
// NOTHING WAS MEASURED — THE SIGNATURE, NOT THE ARGUMENT. `worst===0 / worstF===-1 / sizes=null`
// means not one blob anywhere in the clip reached MIN_PX. For a green-plate raw that is structurally
// impossible: the subject himself is always a blob (25910-58213px across the 17 clips sampled for the
// phase-262/263 tail), so this can only mean the threshold matched nothing and the CLEAN verdict below
// would be a pass off zero measurements. Guarding the SIGNATURE rather than clamping minPx is
// deliberate — it catches every route to "measured nothing", not just the absurd-argument door. It is
// STILL LIVE now that minPx is ceilinged at the default: a plate with no subject on it (a blank or
// near-blank green frame, a decode that produced only the backdrop) trips it at minPx 400 — verified
// on a synthetic all-green clip carrying a single 25px mark, which exits 2 here.
if(worst===0){
 console.error(`ERROR: NOTHING WAS MEASURED — not one blob reached the >= ${MIN_PX}px threshold in any of the ${fl.length} decoded frame(s).`);
 console.error('       A valid green-plate raw ALWAYS has at least one blob: the fighter (real subjects');
 console.error('       measure 25910-58213px at scale 480). "0 @f-1 sizes=null" is therefore not a clean');
 console.error('       clip, it is a threshold that matched nothing — and CLEAN off zero measurements is');
 console.error('       the cannot-fail defect class this gate exists to kill. Measured proof of the class:');
 console.error('       oni-tetsubo-hit-v1.mp4 at minPx 999999 printed CLEAN and exited 0, while at the');
 console.error('       default 400 it correctly exits 1. (Both 999999 and any minPx above the default are');
 console.error('       now refused at parse time, so that door is shut BEFORE the decode as well as after.)');
 console.error(`       Likely cause here (minPx is ${MIN_PX}, and cannot exceed the calibrated default 400):`);
 console.error('       the clip carries no subject at all — a blank/near-blank plate, the wrong file, or a');
 console.error('       decode that produced backdrop only. Open a frame before believing any verdict.');
 bail(2);
}
// `ko` is EXEMPT, as the caveat above has always said: a ko legitimately RELEASES props (ir48's ko
// separates fan, sword and hat) so 2+ blobs there is correct behaviour, recorded as such in
// qa-boss/ir48-hex-paper-lord-clipdata.json. Same rule and same regex shape as check-turn.mjs.
const isKo=/(^|[-_])ko([-_.]|$)/i.test(path.basename(SRC));
// EXTRA = everything beyond the fighter himself. This is what a declaration budgets.
const extra=Math.max(0,worst-1);
// ############################################################################################
// # A DECLARATION THAT DOES NOT BIND IS AN OFF SWITCH — REFUSE IT (phase 264).                #
// # This is checked BEFORE any verdict is printed, because either verdict it would replace is #
// # a confident exit 0. A budget larger than the clip can spend cannot be crossed by anything #
// # in the clip, so the run is arithmetically incapable of failing — the same shape as a      #
// # threshold past the data's ceiling, wearing a legal number and a friendly name.            #
// # MEASURED (both are the CALIBRATED KNOWN-BADS, the only evidence this gate works):         #
// #   oni-tetsubo-hit-v1.mp4  --expect-detached 12 -> "DETACHED OBJECT PRESENT — DECLARED     #
// #     EXPECTED (1 detached piece(s), declared up to 12)" + a WARNING saying it cannot bind,  #
// #     and EXIT 0. Undeclared the same clip exits 1.                                         #
// #   ir48-hex-paper-lord-hit-v3.mp4 --expect-detached 12 -> identical, EXIT 0.               #
// # The old code printed the reason it could not fail and passed anyway. It now exits 2 and    #
// # names the number that WOULD bind. The legitimate case is untouched and re-measured:        #
// # ir48-...-special-1-v5.mp4 sheds 11 and `--expect-detached 11` still exits 0.               #
// ############################################################################################
// NOTE THE POSITION: this runs BEFORE the measurement line is printed, so a refused run puts
// NOTHING on stdout — the measurement is repeated on stderr inside the refusal instead. A `ko` is
// skipped: it is exempt from the whole extra-object verdict anyway (it drops its props by spec), so
// a declaration on one is meaningless rather than disarming.
if(hasDecl&&!isKo&&DECLARED>extra){
 console.error(`\nERROR: --expect-detached ${DECLARED} does not BIND on this clip — it sheds ${extra} detached piece(s).`);
 console.error(`       max simultaneous blobs >= ${MIN_PX}px : ${worst} @f${worstF}  sizes=${JSON.stringify(worstSizes)}`);
 console.error('       A budget that exceeds what the clip can shed cannot be crossed by anything IN the clip,');
 console.error(`       so this run could not have failed: anything up to ${DECLARED} pieces passes here, including an`);
 console.error('       invented extra character. That is the cannot-fail defect class wearing a legal number —');
 console.error('       measured, `oni-tetsubo-hit-v1.mp4 --expect-detached 12` printed DECLARED EXPECTED and');
 console.error('       exited 0 on a clip that exits 1 undeclared.');
 console.error(extra===0
  ? '       This clip sheds NOTHING, so no declaration belongs on it at all: drop the flag.'
  : `       Re-run with --expect-detached ${extra} — that is the number that still catches one more piece.`);
 console.error('       Either this number came from a DIFFERENT take, or it is being used as an exemption.');
 console.error('       NOTHING WAS CONCLUDED about this clip.');
 bail(2);
}
console.log(`max simultaneous blobs >= ${MIN_PX}px : ${worst} @f${worstF}  sizes=${JSON.stringify(worstSizes)}`);
if(worst<=1){
 console.log('CLEAN — never more than one object in frame');
 bail(0);
}
if(isKo){
 console.log('EXTRA OBJECT PRESENT');
 console.log('  ko EXEMPT — a ko drops its props on purpose, so a second object here is not a defect (ko_suffix_rule).');
 bail(0);
}
// THE VERDICT VOCABULARY. "detached object present, expected here" and "unexpected extra object" are
// DIFFERENT findings and must not share a word, because the first is a shipped-good clip and the
// second is an invented attacker. The declaration separates them; the geometry provably cannot.
if(extra<=DECLARED){
 console.log(`DETACHED OBJECT PRESENT — DECLARED EXPECTED (${extra} detached piece(s), declared up to ${DECLARED})`);
 console.log('  Not a defect HERE because the caller declared it.');
 // DECLARED === extra is the ONLY way to reach here: a wider budget was refused above (it cannot
 // bind, so the run could not have failed) and a narrower one falls through to EXTRA OBJECT PRESENT.
 console.log('  The budget BINDS at this number: one more piece than declared and this exits 1, so a');
 console.log('  spurious extra character is still caught in this clip.');
 bail(0);
}
console.log('EXTRA OBJECT PRESENT');
if(DECLARED>0){
 console.log(`  OVER BUDGET: ${extra} detached piece(s) measured, only ${DECLARED} declared. Something is in frame`);
 console.log('  beyond the declared effect — this is exactly the case the budget exists to keep catching.');
}else{
 console.log('  UNDECLARED. If this clip legitimately sheds detached VFX (a charm swirl, ink wisps, embers),');
 console.log(`  VIEW the frame first, then re-run with --expect-detached ${extra} to record that as expected.`);
 console.log('  Do NOT add the flag to make a red line go away: it is a budget, not an exemption, and the');
 console.log('  geometry cannot tell your effect from an invented attacker — only your eyes can.');
}
bail(1);
