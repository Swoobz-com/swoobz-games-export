// TURN GATE — does the fighter face the WRONG WAY during a clip?
//
// THE SYMPTOM THIS EXISTS FOR (Tim, node 7): "when she gets hit her model turns because she gets
// hit in the back and then turns back." The engine CANNOT cause this — isMirrored() in
// FightExperience.tsx is a pure function of (def.faces, slot), computed once per match with no
// animation-state input, so a fighter is never flipped mid-action. Any turn is baked into the ART.
//
// WHY NOT check-frontturn.mjs. That gate asks "is the fighter SQUARE TO CAMERA" via selfSym +
// aspect against the clip's own f0. Swept across a whole roster it is unusable: `ko` flags on every
// character (a prone body is a wide bbox — correct by spec, not a turn), and on a low-baseline
// character like satoshi (selfSym 0.062) the `base + 0.12` threshold is cleared by any arm
// extension, so 12 of 13 clips flag. It answers a different question and it is not a roster sweep.
//
// WHY NOT check-anchor-lock.mjs. That gate reads f0/fLAST only, and it answers "is the START pose
// wrong", not "which way is she facing". A clip can start on-anchor and turn in the middle.
//
// THE SIGNAL. Per frame, bbox-normalise the silhouette to 64x64 and compare it against the kit
// anchor BOTH ways:
//     asIs   = IoU(frame, anchor)
//     mirror = IoU(hflip(frame), anchor)
// If `mirror` beats `asIs` by MARGIN over a sustained run, that span is facing the opposite way
// from the rest of the kit. Scale-free and translation-free, so a lunge or a level change does not
// trip it — only handedness does.
//
// THE ABSTENTION RULE — this gate is USELESS without it, and the first draft shipped without it.
// A raw "mirror beats as-is" test flagged 3 of ir48's clips, a kit I had just watched frame by
// frame and which does not turn. Measured on the flagged frames:
//     ir37 hit (a REAL turn)      mean max(asIs, mirror) = 0.611
//     ir48 special / attack-throw mean max(asIs, mirror) = 0.254
// On a real turn the MIRRORED silhouette genuinely MATCHES the anchor — she is recognisably the
// character, just facing the wrong way. On the false positives NEITHER orientation matches: the
// silhouette is effect-dominated (a charm burst, a beam) or mid-lunge with the weapon extended, so
// the "mirror win" is noise between two equally bad fits. So: a frame is only JUDGED when the
// mirrored fit is actually good (mirror >= MIN_AGREE). Otherwise the gate ABSTAINS on that frame.
// This is the same discipline as check-anchor-lock's degenerate-anchor self-check — refuse to judge
// when the reference relationship is meaningless, rather than emit a confident wrong answer.
//
// CALIBRATION. Validated against the KNOWN case before being trusted anywhere else:
// ir37-pink-tessen/hit.webm (the clip Tim reported) must light up, and kits that read correctly in
// game must stay silent. `ko` is exempt — a prone body has no side to face.
//
// ⛔ IT USED TO PRINT ITS OWN FAILURE AND EXIT 0. (phase 261, TOOLCHAIN-AUDIT §3)
// `check-turn qa-boss/webm/ir37-pink-tessen-hit.webm --anchor <its idle>` printed
// "*** TURNS ***" and "1 clip(s) face the wrong way mid-action." and exited **0**, so every `&&`
// chain and every `$?` test in FIRE-PLAN read a confirmed wrong-facing clip as a pass. It also
// printed "no turns." after scanning ZERO clips (a dir with no .webm in it), which is the same
// lie with no rows to read. EXIT CODES NOW:
//    0 = scanned >= 1 clip, none turns
//    1 = a REAL DETECTED FAILURE: >= 1 non-ko clip faces the wrong way
//    2 = usage/input error — nothing was judged: no target, THE TARGET DOES NOT EXIST, no anchor,
//        no clips in the dir, or a clip ffmpeg could not decode (this gate reads the VP9-ALPHA WEBM
//        domain; a raw .mp4 is not decodable by `-c:v libvpx-vp9` and must never abstain its way
//        to "no turns")
// Read the rows AND the exit code now — they agree.
//
// ⛔ AND A TYPO'D TARGET USED TO EXIT 1 AND LEAK ITS SCRATCH. (phase 262)
// `fs.statSync(target)` was unguarded, so a nonexistent path threw an UNHANDLED ENOENT. Node exits
// **1** on an uncaught throw — the code this gate RESERVES for "a clip really does face the wrong
// way" — so a mistyped path in a sweep was indistinguishable from a caught defect, and the header
// three lines up promised exit 2 for exactly that case. The throw also bypassed die(), leaking the
// `turngate-` mkdtemp dir every time (measured 8 -> 9 dirs in %TEMP% on one bad invocation), which
// refutes the wave-1 claim that "all exits past the mkdtemp go through die()". Both are fixed below:
// the stat is wrapped, and EVERY failure past the mkdtemp now really does route through die().
//
// ⛔ AND EVERY THRESHOLD USED TO BE A DOOR OUT OF THE GATE. (phase 263, TOOLCHAIN-AUDIT §8)
// All four thresholds were read with a bare `Number(argv[i + 1])` and no check at all, so a typo in
// a numeric argument turned this gate green while it went on dutifully measuring the clip. Verified
// on qa-boss/webm/ir37-pink-tessen-hit.webm — THE CLIP THIS GATE WAS BUILT FOR — whose baseline is
// "43/97  0.850 @f7  run 28 @f69  *** TURNS ***" at EXIT 1:
//     --min-agree 0.99  -> EXIT 0   "0/97  0.000  ok  [85 frames abstained]"   / "no turns."
//     --min-gain 9      -> EXIT 0   "ok (run 28 but gain 0.850 < 9 = noise)"
//     --min-run 9999    -> EXIT 0   "no turns."
//     --margin 5        -> EXIT 0   "0/97  0.000  ok"
//     --min-run         -> EXIT 0   (flag last, NO VALUE) header reads "for >= NaN frames" and the
//                                   row LOSES its "run 28 @f69" span, so scrollback looks CLEAN
//     --min-gain zzz    -> EXIT 0   row STILL prints "run 28 @f69" and still says "ok"
// The NaN cases are the worst of the six: every comparison against NaN is false, so `worst >=
// MIN_GAIN` and `worst < MIN_GAIN` are BOTH false and the clip falls out of the flagged branch and
// the noise branch alike — the gate does not report a broken threshold, it reports "ok". Same
// defect class as the NaN threshold and the 999999 threshold already fixed elsewhere this session:
// A GATE THAT CANNOT FAIL. Every numeric argument now goes through ONE validator (qa-boss/lib/
// argcheck.mjs — see the next block) and every one of the six exits 2 naming the flag and what it
// received.
//
// ⛔ AND EVERY ARGUMENT WAS VALIDATED **HERE**, IN A COPY. (phase 264)
// The phase-263 fix above was correct and it did not travel: check-frontturn.mjs carried a VERBATIM
// duplicate of this file's numArg(), and an adversarial sweep then defeated 8 of the 12 hardened
// tools anyway, each in a file the previous round did not own. Every argument now goes through the
// ONE shared validator, qa-boss/lib/argcheck.mjs, which is imported and never copied. What it adds
// here beyond what numArg() already did:
//    · A.done() — an UNDECLARED flag is now refused instead of silently dropped, so a typo'd
//      `--min-agre 0.9` can no longer run at the default while the operator believes otherwise.
//    · A.positionals() — `check-turn a.webm b.webm` used to read argv[0] and DISCARD b.webm without
//      a word (the same defect phase 261 fixed in check-containment). A second target is refused.
//
// ⚠ MIN_AGREE RECALIBRATED 0.45 -> 0.60 (phase 264). READ THIS BEFORE MOVING IT BACK.
// The 0.45 was INTERPOLATED INTO A VOID: the calibration set had ir48's 0.290 and ir37's 0.611 and
// nothing in between, so the bar was placed in a gap that contained no data. It has data now, and
// all of it says 0.45 is too low. An independent frame-by-frame VIEW of the three SHIPPED clips this
// gate reddened found ALL THREE ARE FALSE POSITIVES, and the mechanism is proven, not inferred:
// THE BBOX IS SET BY THE PROP. This gate bbox-normalises the silhouette, so when a blade or a club
// swings to the opposite side the box grows that way and the BODY lands in the opposite half of the
// normalised square. The as-is IoU then collapses (measured mean 0.103-0.179 on the three) while the
// hat brim, the nose and both feet stay screen-right in every frame — the fighter never turns. The
// mirror "wins" only because BOTH fits are bad, which is exactly what THE ABSTENTION RULE above says
// must be abstained. Mirror-fit over the frames each clip was convicted on (re-measured here):
//     ir37 hit  (CONFIRMED REAL TURN)   min 0.479   mean 0.890   max 0.983   as-is mean 0.138
//     eclipse   attack-strike-b (FP)    min 0.451   mean 0.485   max 0.523   as-is mean 0.179
//     satoshi   victory        (FP)     min 0.456   mean 0.466   max 0.475   as-is mean 0.152
//     thorn     attack-block-b (FP)     min 0.453   mean 0.458   max 0.464   as-is mean 0.103
// The three false positives hug the bar inside a 0.07-wide band and there is an EMPTY GAP above them
// before the real turn. Swept over ALL 118 shipped clips and over ir37 (the two confirmed turns):
//     min-agree 0.49  -> 1 shipped clip still red (eclipse attack-strike-b, run 6)
//     min-agree 0.50 .. 0.97 -> 0 shipped clips red, and BOTH confirmed turns still convict
//     min-agree 0.98  -> the REAL TURN goes silent (ir37 hit run 3 < MIN_RUN)
// So the usable gap is [0.50, 0.97] and it is empty on today's data. 0.60 is chosen at its LOW end,
// not its midpoint, because the two failure modes are not symmetric: below the gap a false positive
// costs a wasted look, above it a REAL TURN IS ABSTAINED INTO SILENCE — the defect this gate exists
// for — and the judged run shrinks monotonically as the bar rises (28 frames at 0.45, 27 at 0.60,
// 25 at 0.90, 15 at 0.95, 10 at 0.97, silent at 0.98). 0.60 clears the loudest false-positive frame
// on record (0.523) by 0.077 and the last bar that still reddens one (0.49) by 0.11, while costing
// the real turn ONE frame of its run. Nothing anywhere in the measured set is red at 0.60 and silent
// at 0.70, so a higher pick buys no measured separation and spends real-turn evidence.
// MIN_GAIN IS DELIBERATELY UNCHANGED at 0.20: the view established that the gain band is the wrong
// dial (the false positives measure 0.343-0.368, inside the 0.153-0.748 gap MIN_GAIN was calibrated
// on), and moving two dials at once destroys the evidence for either.
//
// ############################################################################################
// # ⛔ AND A WRONG --anchor SILENCED THE CALIBRATED KNOWN-BAD AT EXIT 0. (phase 265)          #
// #                                                                                            #
// # THE DEFEAT. One argument. No threshold flag, no banner, nothing on stderr — every guard    #
// # above is about the THRESHOLDS and this run touched none of them. Measured on the clip this #
// # gate was built for, whose baseline is "38/97  0.850 @f7  run 27 @f70  *** TURNS ***  [47   #
// # frames abstained]" at EXIT 1:                                                              #
// #   --anchor qa-boss/webm/eclipse-ofuda-idle.webm    EXIT 0  "0/97 0.000 ok [11 abstained]"  #
// #   --anchor qa-boss/webm/satoshi-odachi-idle.webm   EXIT 0  "0/97 0.000 ok [83 abstained]"  #
// #   --anchor <the clip itself>                       EXIT 0  "0/97 0.000 ok [11 abstained]"  #
// # MECHANISM: a mismatched anchor drops EVERY mirrored fit below MIN_AGREE, so every frame    #
// # that cleared --margin ABSTAINS and the gate concludes "no turns." having compared the clip #
// # against the wrong character. The phase-264 SUPPRESSION CHECK is structurally blind to it:  #
// # `usingDefaults` lists only the four THRESHOLD flags, so supplying only --anchor skips the  #
// # re-derivation entirely — and even if it ran, the defaults would be re-derived against the  #
// # SAME wrong anchor and would find nothing to suppress either.                               #
// #                                                                                            #
// # THE GUARD IS AT THE SIGNATURE, NOT AT --anchor. Guarding the argument (a filename or kit-id #
// # check) would not catch a SAME-KIT anchor that is merely the wrong pose, and dir mode        #
// # resolves the anchor automatically, so there is no filename to check there. The signature is #
// # the question "what does this output look like when nothing was really judged?" —> THE RUN   #
// # PRODUCED NO WITNESS. See THE EVIDENCE CHECK below the measurement pass.                     #
// #                                                                                            #
// # THE HARD PART, AND THE MEASUREMENTS THAT SETTLED IT. "All frames abstained" is NOT the      #
// # signature: it is also the CORRECT reading of a clean clip, and it is exactly what the three #
// # clips phase 264 cleared now do BY DESIGN. Measured (best fit any frame reaches against the  #
// # anchor, in the BETTER of the two orientations — "bestEither"):                              #
// #     ir37 hit vs its OWN idle   (REAL TURN, exit 1)                       0.983              #
// #     eclipse attack-strike-b    (phase-264 FALSE POSITIVE, must exit 0)   0.978              #
// #     satoshi victory            (phase-264 FALSE POSITIVE, must exit 0)   0.973              #
// #     thorn attack-block-b       (phase-264 FALSE POSITIVE, must exit 0)   0.994              #
// #     ir37 hit vs eclipse idle   (THE DEFEAT)                              0.430              #
// #     ir37 hit vs satoshi idle   (THE DEFEAT)                              0.424              #
// # A clean clip and a real turn BOTH have a witness — the clean clip matches the anchor AS-IS  #
// # (0.97+) and the turn matches it MIRRORED (0.983). A wrong anchor matches NEITHER WAY. That  #
// # is the whole discriminator, and it is why the fit is taken as max(asIs, mirror): the        #
// # mirrored fit alone cannot carry it, and the note two blocks down records that a MIRROR-ONLY #
// # reachability probe was built and found WRONG for precisely this reason (known-good ir48     #
// # peaks at mirror 0.290 / 0.319 — but its bestEither is 0.980 / 0.984).                       #
// #                                                                                            #
// # SWEPT OVER ALL 118 SHIPPED CLIPS (12 kits, each against its OWN idle) AND OVER 11 CROSS-KIT #
// # PAIRINGS (117 clip-vs-WRONG-anchor measurements):                                           #
// #   · 10 of 12 kits: every clip's bestEither is 0.844-1.000 against its own anchor.           #
// #   · WRONG-anchor runs top out at 0.602 per clip (satoshi victory vs eclipse idle) and the   #
// #     highest any WRONG-anchor RUN reaches is that same 0.602.                                #
// #   · TWO REAL EXCEPTIONS, and they are findings about the ART, not about this guard:         #
// #       hollow-pale/special-b   bestEither 0.230 against its own kit anchor;                  #
// #       lady-kurotachi          the WHOLE kit is 0.398-0.632 against its own idle (its idle   #
// #                               f0 is simply not the pose the rest of that kit is locked to). #
// #     Their numbers sit INSIDE the wrong-anchor band, so no per-clip bar can separate them    #
// #     from a wrong anchor. That is why the refusal is a RUN-LEVEL question — "did ANY clip in #
// #     this run produce a witness?" — and not a per-clip veto: the lady-kurotachi DIRECTORY    #
// #     still passes on its two clips at 0.605 and 0.632 and is byte-identical apart from the   #
// #     new ⚠ line, and hollow-pale passes on its other twelve.                                 #
// #                                                                                            #
// # AND THE SELF-ANCHOR CASE IS NOT A STATISTICAL ONE. `--anchor <the clip itself>` scores      #
// # bestEither 1.000 — trivially, at f0 against itself — so no agreement bar can ever see it.   #
// # Its per-frame table shows why it must still be refused: ir37 hit reads 0.131 as-is / 0.978  #
// # mirrored against the KIT anchor, and the two columns simply SWAP when the clip is its own   #
// # anchor (1.000 / 0.132). The wrongness is baked into the reference and cancels out. So a     #
// # clip is not a WITNESS to its own handedness, and a run whose every clip is the anchor file  #
// # has measured nothing. (In dir mode idle.webm is legitimately both anchor and a scanned row: #
// # its row is unchanged, it just does not count as the run's evidence. The other clips do.)    #
// ############################################################################################
//
// Usage: node qa-boss/check-turn.mjs <file|dir> [--anchor <idle.webm>] [--margin 0.04]
//                                    [--min-run 4] [--min-agree 0.60] [--min-gain 0.20]
//                                    [--allow-unreachable-thresholds]
import { makeArgs } from './lib/argcheck.mjs';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);

// ############################################################################################
// # EVERY ARGUMENT GOES THROUGH qa-boss/lib/argcheck.mjs — IMPORTED, NEVER COPIED.            #
// # This file used to carry its own numArg()/str() pair and check-frontturn.mjs carried a     #
// # VERBATIM DUPLICATE of it. Two copies is two things to forget, and the round that hardened #
// # the copies is the round the adversarial sweep defeated anyway. The validator now lives in #
// # ONE file that every gate imports, so a new tool inherits it and no tool can drift.        #
// # What it refuses — all of which used to end in the same place, a gate that measures the     #
// # clip in full and can only ever conclude "ok":                                              #
// #   1. A MISSING VALUE. `--min-run` last on the line, or its value slot eaten by the next    #
// #      FLAG (`--min-run --min-agree 0.45`). Number(undefined) is NaN.                        #
// #   2. A NON-FINITE VALUE. `zzz`, ``, `Infinity`. Number() gives NaN/Infinity.               #
// #   3. AN IN-RANGE-LOOKING BUT UNCROSSABLE VALUE. `--min-gain 9`, `--margin 5`,              #
// #      `--min-agree 0.99`. These are perfectly valid numbers; they are just bars no real     #
// #      measurement can clear, which is the same disarmed gate with none of the tells.        #
// #   4. A REPEATED FLAG, because indexOf() reads the FIRST occurrence and silently drops the  #
// #      rest — `--min-run 4 --min-run 9999` runs at 4 and READS as 9999, or vice versa.       #
// #   5. AN UNDECLARED FLAG, via A.done(). Without it `--min-agre 0.9` is dropped in silence   #
// #      and the run uses the DEFAULT while the command line says otherwise.                   #
// #   6. A SECOND POSITIONAL, via A.positionals(). `check-turn a.webm b.webm` used to judge    #
// #      a.webm and never open b.webm, printing a verdict for a set it did not scan.           #
// #                                                                                            #
// # WHY A RANGE AND NOT A REACHABILITY PROBE. The obvious guard — "refuse if the bar you set   #
// # was never reached by any frame in this run" — was BUILT AND MEASURED, and it is WRONG. On  #
// # the known-good ir48 kit the mirrored fit peaks at 0.290 (strike_b) and 0.319 (special_1),  #
// # both BELOW the default --min-agree of 0.45. "No frame reached the bar" is precisely what a #
// # clean kit looks like, so that probe would refuse the known-good case at the DEFAULT        #
// # threshold. The band is a property of the THRESHOLD; reachability is a property of the      #
// # CLIP. Only the first can be judged before anything is measured.                            #
// ############################################################################################
// The one exception that is decided AFTER measuring is --min-run, because a run is bounded by the
// FRAME COUNT of the clips and by nothing about the fighter — see the crossability check below.
//
// EXPLICIT OPT-OUT. A caller who genuinely wants a threshold outside the meaningful band must SAY
// so. It is then accepted LOUDLY — a banner on stderr and a stamp in the header — so an out-of-band
// threshold can never be the silent result of a typo. It relaxes the RANGE only: a missing value or
// a non-finite value stays fatal, because neither is ever anything but a mistake.
const USAGE = 'usage: node qa-boss/check-turn.mjs <file|dir> [--anchor <idle.webm>] [--margin 0.04] [--min-run 4]\n'
  + '                                   [--min-agree 0.60] [--min-gain 0.20] [--allow-unreachable-thresholds]';
// Argument parsing runs BEFORE the mkdtemp below, so a refusal here has no scratch dir to clean up
// and needs no onFail hook. Keep it that way — everything PAST the mkdtemp must exit through die().
const A = makeArgs(argv, { tool: 'check-turn', usage: USAGE });
const ALLOW_UNREACHABLE = A.bool('--allow-unreachable-thresholds');
const relaxed = [];
// THE BAND IS ENFORCED BY ARGCHECK. This wrapper is NOT a second validator: when the caller has
// explicitly opted out it hands argcheck the unbounded range and RECORDS the relaxation so the
// banner below can announce it. Everything else — a missing value, an empty value, a non-finite
// value, a fractional frame count, a duplicate flag, an unknown flag — is argcheck's and is fatal
// with or without the opt-out, because none of those is ever anything but a mistake.
const num = (flag, dflt, { min, max, integer = false, band }) => {
  const v = ALLOW_UNREACHABLE
    ? A.num(flag, dflt, { integer, band })
    : A.num(flag, dflt, { min, max, integer, band });
  if (ALLOW_UNREACHABLE && (v < min || v > max)) relaxed.push(`${flag} ${v} is outside [${min}, ${max}]`);
  return v;
};
// A REPEATED --anchor is the same silent-config defect as a repeated threshold and worse in its
// consequences: the anchor is the reference EVERY IoU in this gate is taken against, so silently
// using the first of two judges the whole kit against a reference the operator cannot see on the
// command line. Measured before it was guarded: `--anchor <ir37 idle> --anchor <eclipse idle>` ran
// against ir37's and exited 1 with the header naming only the winner. argcheck refuses it by name,
// and refuses `--anchor` with no value instead of dying later on "no anchor clip at undefined".
const anchorArg = A.str('--anchor', null, { why: '--anchor takes the path of the kit\'s idle clip.' });
// THE CALIBRATED DEFAULTS, in one place, because they are now used TWICE: as the fallback when a
// flag is absent, and as the reference the supplied thresholds are re-derived against below.
const DEFAULTS = { margin: 0.04, minRun: 4, minGain: 0.20, minAgree: 0.60 };
const MARGIN = num('--margin', DEFAULTS.margin, {
  min: 0.001,
  // 0.80 is the MEASURED ceiling, not the mathematical one. (-1, 1) is the band the arithmetic
  // allows, but the calibrated clip (ir37 hit, loudest gain 0.850) still convicts at 0.84 and goes
  // silent at 0.85 — a high margin kills the RUN before it kills the gain, because only the single
  // loudest frame survives it (re-swept at the new --min-agree 0.60: run 27 at margin 0.04, 22 at
  // 0.80, 9 at 0.84, 1 at 0.85). 0.80 is the published bound and sits INSIDE the last value that
  // still convicts, which is the safe side; a mathematical bound would have left 0.85..0.999 open,
  // the same silent disarm as --margin 5 with a more plausible-looking number.
  max: 0.80,
  band: 'gain = IoU(mirrored frame, anchor) - IoU(frame, anchor). Both are IoUs in [0, 1], so the gain '
    + 'lies in (-1, 1) by construction, and a margin at or below 0 flags every frame where the mirror '
    + 'merely ties. The USEFUL ceiling is far lower and is measured: on ir37 hit (loudest gain 0.850) '
    + 'the gate still convicts at --margin 0.80 and is silent at 0.85, because a high margin leaves too '
    + 'few frames to form a run.',
});
const MIN_RUN = num('--min-run', DEFAULTS.minRun, {
  min: 1,
  integer: true,
  // The REAL ceiling is the frame count of the clips, which cannot be known until they are decoded.
  // It is enforced by the crossability check further down; this bound only catches nonsense.
  max: 100000,
  band: 'a run is a count of frames, so it must be a whole number of at least 1. Its real ceiling is the '
    + 'length of the clips being scanned and is checked once they have been decoded.',
});
// MIN_GAIN — calibrated from measured data, not guessed. Real turns are LOUD; noise is quiet:
//   ir37 hit / victory (confirmed turns, visually verified)      gain 0.861
//   eclipse attack-block v1 (confirmed turn)                     gain 0.748
//   ir48 kit (known-good, watched frame by frame)          ceiling 0.144
//   eclipse attack-block v3 (visually verified NOT a turn)       gain 0.153  <-- false positive
// A 5-frame run at 0.153 sat just over MIN_RUN and produced a confident wrong answer, so a run alone
// is not enough — the run must also be LOUD. 0.20 sits in the empty band between 0.153 and 0.748.
const MIN_GAIN = num('--min-gain', DEFAULTS.minGain, {
  min: 0,
  // Measured: the calibrated clip still convicts at 0.85 and goes silent at 0.86 (its worst gain is
  // 0.850). Not 0.90 — that would leave a 0.86..0.90 hole that reports "ok (run 28 but gain 0.850 <
  // 0.88 = noise)" and exits 0, which is exactly the reported --min-gain 9 defect wearing a
  // believable number.
  max: 0.85,
  band: 'gain is a difference of two IoUs. The confirmed turns this gate is calibrated on measure 0.748 '
    + '(eclipse attack-block v1), 0.850 (ir37 hit) and 0.861 (ir37 victory), and the known-good ceiling '
    + 'is 0.144. Measured: the gate still convicts at --min-gain 0.85 and is silent at 0.86, so a bar '
    + 'above 0.85 is louder than any turn on record here and nothing can clear it.',
});
// Below this mirrored-fit the silhouette is not recognisably the character in EITHER orientation,
// so the comparison carries no information and the frame is abstained. See THE ABSTENTION RULE, and
// the MIN_AGREE RECALIBRATION note at the top for why the default is 0.60 and not the original 0.45.
const MIN_AGREE = num('--min-agree', DEFAULTS.minAgree, {
  min: 0,
  // 0.95, not 1.0, and the number is MEASURED, not guessed. min-agree is an IoU so [0, 1] is the
  // mathematical band and 0.99 sits comfortably inside it — which is exactly why the reported disarm
  // had no tell. Swept against the calibrated clip (ir37 hit): the gate still convicts at 0.90 (run
  // 25), 0.95 (run 15) and 0.97 (run 10), and goes SILENT at 0.98 (run 3 < MIN_RUN), with the
  // mirrored fit peaking at 0.983. The last crossable value is 0.97 and 0.95 sits inside it.
  max: 0.95,
  band: 'min-agree is an IoU, so [0, 1] is only the mathematical band — the USEFUL band ends far below 1. '
    + 'Measured on ir37 hit (the clip this gate was calibrated on) the mirrored fit peaks at 0.983: the '
    + 'gate still convicts at 0.97 and goes silent at 0.98, printing "0/97  0.000  ok  [85 frames '
    + 'abstained]". Above 0.95 every frame of a REAL turn is abstained and nothing can be judged.',
});
const THRESHOLDS = { margin: MARGIN, minRun: MIN_RUN, minGain: MIN_GAIN, minAgree: MIN_AGREE };
// When nothing was overridden the two verdicts are identical by construction, so the suppression
// check below is skipped entirely and a default run does exactly what it always did.
const usingDefaults = ['--margin', '--min-run', '--min-gain', '--min-agree'].every((f) => !argv.includes(f));
// EVERY non-flag argument is a positional, and there must be exactly ONE. `const target = argv[0]`
// meant a flag typed first was read as the filename, and — the defect that matters — a SECOND clip
// was DISCARDED without a word: `check-turn good.webm bad.webm` judged good.webm, printed "no
// turns." and exited 0 while bad.webm was never opened. That is phase 261's check-containment
// defect living in this file. A.done() runs last so an unknown flag is refused rather than dropped.
const targets = A.positionals();
A.done();
if (targets.length !== 1) {
  // 2, not 1: nothing was judged. 1 is reserved for "a clip really does face the wrong way".
  console.error(targets.length === 0
    ? '\nERROR: no target. This gate takes ONE VP9-alpha .webm file, or ONE directory of them.'
    : `\nERROR: ${targets.length} targets were given (${targets.map((t) => JSON.stringify(t)).join(', ')}), and this gate reads ONE.`);
  if (targets.length > 1) {
    console.error('  Only the first used to be scanned and the rest were dropped in silence, so "no turns."');
    console.error('  was printed for clips that were never opened. Pass their DIRECTORY, or one clip per run.');
  }
  console.error(USAGE);
  process.exit(2);
}
const target = targets[0];
if (relaxed.length) {
  // LOUD, never silent. The band was deliberately overridden, so say so on stderr AND stamp the
  // header below, because the header is what ends up quoted in a handoff.
  console.error('\n############################################################################');
  console.error('# --allow-unreachable-thresholds: RUNNING WITH A THRESHOLD OUTSIDE ITS BAND #');
  for (const r of relaxed) console.error(`#   ${r.padEnd(72)}#`);
  console.error('# A bar nothing can clear makes "no turns." meaningless. This run cannot be #');
  console.error('# used as evidence that a kit is clean.                                     #');
  console.error('############################################################################\n');
}

const N = 64;
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'turngate-'));
// Every exit past this point goes through die() so the decode scratch is never left behind.
const die = (code) => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ } process.exit(code); };

function decode(webm) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'f-'));
  let err = null;
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', webm, '-pix_fmt', 'rgba', path.join(dir, 'f_%04d.png')],
      { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) { err = e; }
  const frames = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(dir, f));
  // A clip that decoded to nothing produces no flags, and no flags used to read as "ok". That is
  // the vacuous pass this gate exists to stop, so it is an INPUT error, not a verdict.
  if (err || !frames.length) {
    console.error(`\nERROR: ffmpeg decoded ${frames.length} frame(s) from ${webm} — nothing could be judged.`);
    console.error('       This gate reads the KEYED domain: VP9-alpha .webm. A raw .mp4 is not decodable by');
    console.error('       `-c:v libvpx-vp9` (which must precede -i or the alpha plane is dropped silently).');
    const tail = String(err?.stderr || '').trim().split('\n')[0];
    if (tail) console.error(`       ffmpeg: ${tail}`);
    die(2);
  }
  return frames;
}

// Alpha silhouette, cropped to its own bbox and resampled to N x N. Normalising away position AND
// size is what makes a lunge or a crouch invisible to this gate — only handedness survives.
function normMask(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      if (p.data[(y * p.width + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const m = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const sx = x0 + Math.floor((i + 0.5) * w / N);
      const sy = y0 + Math.floor((j + 0.5) * h / N);
      m[j * N + i] = p.data[(sy * p.width + sx) * 4 + 3] > 8 ? 1 : 0;
    }
  }
  return m;
}
const mirror = (m) => { const o = new Uint8Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) o[j * N + i] = m[j * N + (N - 1 - i)]; return o; };
function iou(a, b) { let inter = 0, uni = 0; for (let k = 0; k < a.length; k++) { if (a[k] & b[k]) inter++; if (a[k] | b[k]) uni++; } return uni ? inter / uni : 0; }

// GUARDED, and it must stay guarded: an unhandled throw here exits 1 (a real detected failure) and
// skips die(), so it both lies about WHAT happened and leaks the scratch dir. try/catch rather than
// existsSync so a permission error or a broken link lands here too, not just ENOENT.
let stat;
try {
  stat = fs.statSync(target);
} catch (e) {
  console.error(`\nERROR: cannot read target ${JSON.stringify(target)} — ${e.code || e.message}. Nothing was judged.`);
  console.error('       This is a usage/input error (exit 2). Exit 1 is RESERVED for "a clip really');
  console.error('       does face the wrong way", so a typo must never be able to produce it.');
  console.error('       This gate takes a VP9-alpha .webm file, or a directory of them.');
  die(2);
}
const dir = stat.isDirectory() ? target : path.dirname(target);
// --anchor was READ up top (argcheck owns the parse); its default can only be resolved here, once
// the target has been stat'ed and the kit directory is known.
const anchorPath = anchorArg ?? path.join(dir, 'idle.webm');
if (!fs.existsSync(anchorPath)) { console.error('no anchor clip at ' + anchorPath); die(2); }
const anchor = normMask(decode(anchorPath)[0]);
// DEGENERATE ANCHOR — the SAME class as the unguarded stat above, found by constructing it (phase 262).
// normMask returns null when f0 has no alpha above 8, i.e. the anchor frame is BLANK. Every IoU in
// this gate is taken against that mask, so `iou(m, null)` threw a TypeError -> exit 1 -> scratch
// leaked (measured 10 -> 11 turngate- dirs). Worse, when the CLIP is blank too the null short-circuits
// at `if (!m) return` and the gate printed "no turns." at exit 0 having compared nothing at all.
// Both readings are wrong for the same reason: with no reference silhouette there is no handedness to
// measure. Refuse, exactly as THE ABSTENTION RULE refuses a frame whose mirrored fit carries no
// information — abstain on a frame, but on the anchor there is nothing left to judge, so exit 2.
if (!anchor) {
  console.error(`\nERROR: the anchor frame ${path.basename(anchorPath)} f0 is BLANK — no alpha above 8, so there is`);
  console.error('       no reference silhouette and every IoU in this gate would be taken against nothing.');
  console.error('       Nothing could be judged: this is an input error (2), not "no turns" (0) and not a');
  console.error('       detected turn (1). Point --anchor at a keyed VP9-alpha idle clip whose f0 has a subject.');
  die(2);
}

const files = stat.isDirectory()
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.webm')).sort().map((f) => path.join(dir, f))
  : [target];
// ZERO CLIPS IS NOT "NO TURNS". Pointed at a dir of .mp4s (or an empty one) this printed the header,
// zero rows and "no turns." at exit 0 — a green light off zero measurements (TOOLCHAIN-AUDIT §3/§4).
if (!files.length) {
  console.error(`ERROR: no .webm clips in ${dir} — zero clips were judged, so "no turns" would be vacuous.`);
  console.error('       This gate reads the KEYED domain: a directory of VP9-alpha .webm clips, or one such file.');
  die(2);
}

// ############################################################################################
// # PASS 1 — MEASURE ONLY. Nothing is printed yet, so the --min-run crossability check below  #
// # runs BEFORE any "ok" row can reach scrollback for a run whose bar could never be crossed. #
// # check-frontturn.mjs was already restructured this way for its inversion refusal, and for  #
// # the same stated reason: a guard that fires after the verdict is a post-mortem, not a      #
// # guard (TOOLCHAIN-AUDIT §7). The rows are built here and printed verbatim below, so the    #
// # output of a normal run is byte-for-byte what it was.                                      #
// ############################################################################################
// The whole verdict for one clip, as a pure function of the per-frame (asIs, mirror) pair list and a
// threshold set. Pulled out of the loop so the SAME arithmetic can be re-run at the CALIBRATED
// DEFAULTS — see the suppression check below. Byte-for-byte the arithmetic that was inline here.
function verdictFor(pairs, t) {
  const flags = [];
  let worst = 0, worstAt = -1, abstained = 0;
  pairs.forEach((p, i) => {
    if (!p) return;
    if (p.b - p.a < t.margin) return;
    // ABSTAIN: the flip only means something if the flipped shape IS the character.
    if (p.b < t.minAgree) { abstained += 1; return; }
    flags.push(i);
    if (p.b - p.a > worst) { worst = p.b - p.a; worstAt = i; }
  });
  // longest contiguous run
  let run = 0, best = 0, bestStart = -1, cur = -1;
  for (let i = 0; i < pairs.length; i++) {
    if (flags.includes(i)) { if (run === 0) cur = i; run++; if (run > best) { best = run; bestStart = cur; } }
    else run = 0;
  }
  return { n: flags.length, worst, worstAt, abstained, best, bestStart, hit: best >= t.minRun && worst >= t.minGain };
}

// Two paths are the SAME FILE, resolved through links and (on win32) case. Used only to decide
// whether a scanned clip can count as the run's WITNESS — a clip compared with itself is not
// evidence about its own handedness. It never changes a row or a verdict.
const samePath = (a, b) => {
  const norm = (p) => {
    let r;
    try { r = fs.realpathSync(p); } catch { r = path.resolve(p); }
    return process.platform === 'win32' ? r.toLowerCase() : r;
  };
  return norm(a) === norm(b);
};

let bad = 0;
const rows = [];
let maxFrames = 0;
const suppressed = [];
// THE EVIDENCE CHECK'S RAW MATERIAL, gathered in the measurement pass so the refusal can fire
// BEFORE any "ok" row reaches scrollback. One entry per scanned clip.
const evidence = [];
for (const f of files) {
  const frames = decode(f);
  const pairs = frames.map((fr) => {
    const m = normMask(fr);
    if (!m) return null;
    return { a: iou(m, anchor), b: iou(mirror(m), anchor) };
  });
  // The best agreement this clip reaches with the anchor in the BETTER of the two orientations.
  // as-is OR mirrored, deliberately: a clean clip's witness is its as-is fit and a real turn's is
  // its mirrored fit, and only a WRONG reference has neither. See the phase-265 block up top.
  let bestEither = 0;
  for (const p of pairs) { if (!p) continue; const e = p.a > p.b ? p.a : p.b; if (e > bestEither) bestEither = e; }
  evidence.push({ file: path.basename(f), bestEither, isAnchor: samePath(f, anchorPath) });
  const { n, worst, worstAt, abstained, best, bestStart, hit } = verdictFor(pairs, THRESHOLDS);
  const isKo = /(^|[-_])ko\.webm$/.test(path.basename(f));
  // THE SUPPRESSION CHECK — the guard that does not depend on my band arithmetic being right.
  // Re-derive the verdict at the CALIBRATED DEFAULTS. If the defaults convict this clip and the
  // thresholds actually supplied do not, then a threshold turned a detected turn into a pass. That
  // is true whatever combination of flags did it, so it closes the class rather than the six
  // reported doors. It cannot misfire on a clean clip: if the defaults find nothing there is
  // nothing to suppress, and when no threshold flag is passed at all the two runs are identical.
  if (!isKo && !usingDefaults) {
    const dflt = verdictFor(pairs, DEFAULTS);
    if (dflt.hit && !hit) {
      suppressed.push({ file: path.basename(f), dflt });
    }
  }
  // A run must be BOTH long enough and LOUD enough — see MIN_GAIN. A quiet run is noise.
  const flagged = best >= MIN_RUN && worst >= MIN_GAIN;
  const quiet = best >= MIN_RUN && worst < MIN_GAIN;
  const verdict = flagged
    ? (isKo ? 'ok (ko exempt: a prone body has no side)' : '*** TURNS ***')
    : quiet ? `ok (run ${best} but gain ${worst.toFixed(3)} < ${MIN_GAIN} = noise)` : 'ok';
  if (flagged && !isKo) bad++;
  if (frames.length > maxFrames) maxFrames = frames.length;
  rows.push(`  ${path.basename(f).padEnd(28)} ${String(n).padStart(5)}/${String(frames.length).padEnd(5)} ${worst.toFixed(3).padStart(10)}${worstAt >= 0 ? ' @f' + worstAt : '   '}   ${best >= MIN_RUN ? 'run ' + best + ' @f' + bestStart + '  ' : ''}${verdict}${abstained ? '   [' + abstained + ' frames abstained]' : ''}`);
}

// ############################################################################################
// # THE CROSSABILITY CHECK — the one bound that can only be known AFTER measuring.            #
// # A run is a count of FRAMES, so it is capped by the length of the clips and by nothing     #
// # about the fighter. If --min-run is longer than the LONGEST clip in this run, no clip in   #
// # it could ever produce a run that long: the gate is arithmetically incapable of failing,   #
// # and "no turns." means only that the bar was set above the ceiling. That is what           #
// # `--min-run 9999` did to a 97-frame clip — EXIT 0, "no turns.", nothing amiss on screen.   #
// #                                                                                            #
// # It compares against the LONGEST clip, not each clip, on purpose: in a mixed directory a    #
// # short clip that cannot reach the bar is a normal reading, and refusing the whole sweep for #
// # it would be the opposite mistake. This fires only when NO clip could have failed.          #
// ############################################################################################
if (MIN_RUN > maxFrames) {
  console.error(`\n⛔ REFUSING — NO VERDICT WAS PRINTED. --min-run is ${MIN_RUN}, but the longest clip scanned is ${maxFrames} frames.`);
  console.error(`  ${files.length} clip(s) were measured in full and NONE of them could produce a run of ${MIN_RUN} frames,`);
  console.error('  so this gate could not have failed whatever the clips contain. "no turns." would mean');
  console.error('  only that the bar was set above the ceiling — it is not evidence that a kit is clean.');
  console.error(`  Use a --min-run of at most ${maxFrames} (the default is 4), or pass --allow-unreachable-thresholds`);
  console.error('  if you really intend to run a gate that cannot fail.');
  if (ALLOW_UNREACHABLE) {
    console.error('  (--allow-unreachable-thresholds relaxes the parse-time BAND, not this check: this one is');
    console.error('   measured against the clips themselves and is the difference between a pass and a no-op.)');
  }
  die(2);
}

// ############################################################################################
// # THE EVIDENCE CHECK — the guard for a WRONG REFERENCE, which no threshold guard can see.   #
// # Every other refusal in this file asks whether a THRESHOLD could be crossed. This one asks  #
// # the prior question: was the thing the thresholds are measured against a valid reference at #
// # all? A wrong --anchor needs no bad number — it drops BOTH fits, every frame abstains, and  #
// # the gate prints "no turns." at exit 0 for a kit it compared against another character.     #
// #                                                                                            #
// # A WITNESS is a scanned clip that (a) is not the anchor file itself and (b) reaches          #
// # --min-agree against the anchor in the BETTER of the two orientations. A clean clip is a     #
// # witness through its AS-IS fit, a turned clip through its MIRRORED fit. A run with no        #
// # witness has compared its clips against a silhouette that resembles them in neither          #
// # direction, so "no turns." is a statement about the reference, not about the kit.            #
// #                                                                                            #
// # WHY THIS IS NOT THE MIRROR-ONLY REACHABILITY PROBE THAT WAS BUILT AND REJECTED (see the     #
// # box above the parser). That probe asked "did any frame reach --min-agree MIRRORED", and it  #
// # refused the known-good ir48 kit at the DEFAULT threshold, because ir48's mirrored fit peaks #
// # at 0.290 / 0.319 — which is what a CLEAN clip looks like. Taking max(asIs, mirror) is what  #
// # changes the question from "is this clip turned" (a property of the clip, unknowable before  #
// # measuring) to "is this anchor a reference for this clip" (a property of the PAIR). Re-      #
// # measured on that same ir48 kit: bestEither 0.976-1.000 on all 13 clips. It does not fire.   #
// #                                                                                            #
// # RUN-LEVEL, NOT PER-CLIP, AND THAT IS MEASURED TOO. Two shipped sets sit inside the wrong-   #
// # anchor band against their OWN anchor (hollow-pale/special-b at 0.230; the whole lady-       #
// # kurotachi kit at 0.398-0.632), so a per-clip veto would redden real kits. A per-clip veto   #
// # would also fire on every dir-mode run, where idle.webm is legitimately its own anchor. So   #
// # the refusal needs the run to have produced NO witness at all, and the per-clip readings are #
// # reported instead as the ⚠ line under the verdict.                                           #
// ############################################################################################
const unjudgeable = evidence.filter((e) => e.bestEither < MIN_AGREE);
const witnesses = evidence.filter((e) => !e.isAnchor && e.bestEither >= MIN_AGREE);
if (!witnesses.length) {
  const selfOnly = evidence.every((e) => e.isAnchor);
  const bestSeen = Math.max(...evidence.map((e) => e.bestEither));
  console.error('\n⛔ REFUSING — NO VERDICT WAS PRINTED. NOTHING IN THIS RUN COULD BE JUDGED AGAINST THIS ANCHOR.');
  console.error(`  anchor = ${path.basename(anchorPath)} f0`);
  if (selfOnly) {
    console.error(`  Every clip scanned (${files.length}) IS the anchor file, so the only comparison this run performed was`);
    console.error('  a clip against ITS OWN frame 0. IoU(f0, f0) is 1 by construction and the mirrored fit is taken');
    console.error('  against the very pose whose handedness is the question: if the clip starts turned, the turn is');
    console.error('  baked into the reference and cancels out. Measured on the calibrated known-bad — against its');
    console.error('  KIT anchor it reads 0.131 as-is / 0.978 mirrored; against ITSELF the two columns simply swap to');
    console.error('  1.000 / 0.132 and every frame abstains. A clip is not a witness to its own handedness.');
  } else {
    console.error(`  ${files.length} clip(s) were decoded and measured in full, and the BEST agreement any frame reached with`);
    console.error(`  the anchor — in EITHER orientation, as-is or mirrored — is ${bestSeen.toFixed(3)}, below --min-agree ${MIN_AGREE}.`);
    console.error('  Every frame that cleared --margin therefore ABSTAINED, so "no turns." would say only that the');
    console.error('  reference carries no information about these clips. That is a measured-nothing pass, and this');
    console.error('  gate exits 2 for those whatever route reached them — no threshold had to be touched to get here.');
  }
  for (const e of evidence.slice(0, 12)) {
    console.error(`  ${e.file.padEnd(30)} best fit as-is-or-mirrored ${e.bestEither.toFixed(3)}${e.isAnchor ? '   <- this IS the anchor file' : ''}`);
  }
  if (evidence.length > 12) console.error(`  ... and ${evidence.length - 12} more`);
  // Same rule as THE CROSSABILITY CHECK above, for the same reason: the opt-out relaxes the
  // parse-time BAND, and this check is measured against the clips themselves. A --min-agree the
  // data cannot reach is not a stricter gate, it is a gate with nothing left to judge. MEASURED:
  // `--min-agree 0.99 --allow-unreachable-thresholds` on the calibrated known-bad used to print
  // "0/97  0.000  ok  [85 frames abstained]" and "no turns." at EXIT 0, banners and all.
  if (ALLOW_UNREACHABLE) {
    console.error('  (--allow-unreachable-thresholds relaxes the parse-time BAND, not this check: this one is');
    console.error('   measured against the clips themselves and is the difference between a pass and a no-op.)');
  }
  // The hint is a HINT — the guard above is the signature, and it fires on a same-kit anchor that is
  // merely the wrong POSE too, which no filename check could see. Name the likeliest cause anyway.
  if (selfOnly) {
    console.error('  FIX: point --anchor at the kit\'s idle clip — never at the clip under test — or pass the kit');
    console.error('  DIRECTORY and let the gate resolve <dir>/idle.webm. A directory holding only the anchor lands');
    console.error('  here for the same reason: there is no second clip for the anchor to be a reference FOR.');
  } else {
    console.error('  MOST LIKELY: --anchor points at ANOTHER CHARACTER\'S clip. Point it at THIS kit\'s own idle, or');
    console.error('  pass the kit DIRECTORY and let the gate resolve <dir>/idle.webm. It can also mean the clips are');
    console.error('  genuinely off-anchor from the idle they were given — read the per-clip numbers above and LOOK.');
  }
  die(2);
}

// ############################################################################################
// # THE SUPPRESSION CHECK — the guard that does not rely on my bands being right.              #
// # Every band above is a judgement call about where a threshold stops being meaningful, and a #
// # judgement call is exactly the thing that has now failed three times in this repo. This     #
// # check needs no judgement: it re-derives the verdict at the CALIBRATED DEFAULTS and refuses #
// # when the thresholds actually supplied turned a conviction into a pass.                     #
// #                                                                                            #
// # It closes the class rather than the list. It does not care WHICH flag did it, or whether   #
// # the value looked reasonable, or whether two individually-sane values combined into a bar   #
// # nothing can clear — it only asks the one question that matters: DID A SUPPLIED THRESHOLD   #
// # HIDE A TURN THIS GATE WOULD OTHERWISE HAVE CAUGHT?                                         #
// #                                                                                            #
// # It cannot misfire on a clean kit: if the defaults find nothing there is nothing to         #
// # suppress. And it is skipped outright when no threshold flag was passed, so the default     #
// # path is untouched.                                                                         #
// #                                                                                            #
// # NOTE the guard NOT built here, because it was built, measured and found WRONG: "refuse if  #
// # the bar was never reached by any frame" would fire on the known-good ir48 kit at the       #
// # DEFAULT --min-agree, since its mirrored fit peaks at 0.290 against a default bar of 0.45.  #
// # "No frame reached the bar" is what a CLEAN clip looks like. Reachability is a property of  #
// # the clip; only the threshold can be judged before anything is measured.                    #
// ############################################################################################
if (suppressed.length && ALLOW_UNREACHABLE) {
  // THE OPT-OUT MUST NEVER BE SILENT. A suppression can be caused by thresholds that are all
  // comfortably IN band (e.g. --min-run 29 against a run of 28), in which case `relaxed` is empty
  // and the band banner above never fires. Without this, --allow-unreachable-thresholds would be a
  // brand-new silent door into exit 0 — the very class this phase exists to close.
  console.error('\n############################################################################');
  console.error('# --allow-unreachable-thresholds: A DETECTED TURN IS BEING SUPPRESSED       #');
  for (const s of suppressed) {
    console.error(`#   ${`${s.file} turns at the defaults (run ${s.dflt.best} @f${s.dflt.bestStart})`.padEnd(72)}#`);
  }
  console.error('# This run is NOT evidence that these clips are clean.                      #');
  console.error('############################################################################\n');
}
if (suppressed.length && !ALLOW_UNREACHABLE) {
  console.error(`\n⛔ REFUSING — NO VERDICT WAS PRINTED. The thresholds you supplied SUPPRESSED ${suppressed.length} detected turn(s).`);
  for (const s of suppressed) {
    console.error(`  ${s.file}: at the calibrated defaults this clip TURNS — run ${s.dflt.best} @f${s.dflt.bestStart}, worst gain ${s.dflt.worst.toFixed(3)} @f${s.dflt.worstAt}`);
  }
  const shown = [
    MARGIN !== DEFAULTS.margin ? `--margin ${MARGIN} (default ${DEFAULTS.margin})` : null,
    MIN_RUN !== DEFAULTS.minRun ? `--min-run ${MIN_RUN} (default ${DEFAULTS.minRun})` : null,
    MIN_GAIN !== DEFAULTS.minGain ? `--min-gain ${MIN_GAIN} (default ${DEFAULTS.minGain})` : null,
    MIN_AGREE !== DEFAULTS.minAgree ? `--min-agree ${MIN_AGREE} (default ${DEFAULTS.minAgree})` : null,
  ].filter(Boolean);
  console.error(`  You changed: ${shown.join(', ')}`);
  console.error('  The clip was measured in full and it does face the wrong way; the threshold is the only');
  console.error('  reason this run would have printed "no turns." at exit 0. A gate that reports clean');
  console.error('  because its bar was moved is the defect this tool exists to catch, so it will not do it.');
  console.error('  Re-run at the defaults, or pass --allow-unreachable-thresholds to say you mean it.');
  die(2);
}

// PASS 2 — REPORT. Same lines, same order, same bytes as before the restructure.
console.log('=== TURN GATE ===  anchor = ' + path.basename(anchorPath) + ' f0');
console.log('    mirror beats as-is by >= ' + MARGIN + ' for >= ' + MIN_RUN + ' frames == that span faces the WRONG WAY');
// Stamped on STDOUT, not just stderr, because the header is what gets pasted into a handoff.
if (relaxed.length) console.log('    ⛔ THRESHOLD OUT OF BAND (--allow-unreachable-thresholds): ' + relaxed.join('; '));
if (suppressed.length) console.log(`    ⛔ SUPPRESSED (--allow-unreachable-thresholds): ${suppressed.map((s) => `${s.file} turns at the defaults (run ${s.dflt.best})`).join('; ')}`);
console.log('');
console.log('  clip                            turned/frames   worst gain   span');
console.log('  ' + '-'.repeat(74));
for (const r of rows) console.log(r);
console.log('  ' + '-'.repeat(74));
console.log(bad ? `  ${bad} clip(s) face the wrong way mid-action.` : '  no turns.');
// THE UNJUDGEABLE COUNT SITS NEXT TO THE VERDICT, not only in the per-row [N frames abstained]
// note that scrolls away. These clips were scanned and counted in the rows above, but nothing in
// them ever resembled the anchor either way, so the verdict says nothing about THEM. The run is
// not refused — at least one other clip in it was a witness (see THE EVIDENCE CHECK) — but the
// coverage the verdict actually has must be readable in the same place as the verdict.
if (unjudgeable.length) {
  console.log(`  ⚠ ${unjudgeable.length} of ${files.length} clip(s) NEVER REACHED --min-agree ${MIN_AGREE} against this anchor in either`);
  console.log('    orientation, so every frame of them abstained and the verdict does not cover them:');
  console.log('    ' + unjudgeable.map((e) => `${e.file} (best ${e.bestEither.toFixed(3)})`).join(', '));
}
// THE VERDICT AND THE EXIT CODE MUST AGREE. This line is the whole phase-261 fix: the sentence
// above used to be printed at exit 0, so a caught wrong-facing clip passed every && chain.
die(bad ? 1 : 0);
