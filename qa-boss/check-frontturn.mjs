// FRONT-TURN GATE — does the fighter rotate SQUARE TO CAMERA mid-clip?
//
// WHY THIS EXISTS, AND WHY check-facing.mjs CANNOT DO IT.
// `scripts/check-facing.mjs` answers "is this clip MIRRORED?" by comparing IoU(anchor, clip) against
// IoU(anchor, mirror(clip)). That test is structurally blind to a FRONT-TURN: a frontal pose is
// roughly left-right SYMMETRIC, so as-is and mirrored score nearly the SAME, and BOTH score low
// against a side-profile anchor. The result reads as "weak agreement", not as a defect — which is
// exactly how ir48 strike_b v1 passed a mirror check while being square to camera for 1.9s of 4s.
//
// STANDOFF requires every clip in a kit to be a strict side profile facing the direction `faces:`
// states, because FightExperience.tsx applies ONE mirror to the whole fighter stack. A frontal
// stance has no side, so it cannot be mirrored into agreement with the rest of the kit — it is
// wrong in BOTH slots.
//
// THE TWO SIGNALS (both scale-free, both read off the silhouette, neither needs an anchor file):
//   selfSym = IoU(mask, mirror(mask)) after bbox-normalising to 64x64.
//             A side profile is asymmetric (one arm/leg occludes the other) -> LOW.
//             Square to camera is near-symmetric                            -> HIGH.
//   aspect  = bboxWidth / bboxHeight.
//             Side profile is narrow; a frontal stance spreads the arms and widens the box.
//
// The baseline is the clip's OWN frame 0 (the anchor pose), so this works per-character with no
// calibration: a character whose anchor is naturally wide simply starts from a higher aspect.
//
// Measured on ir48 strike_b v1 (the clip that motivated this gate):
//   f0-f24   aspect 0.59  selfSym 0.238   side profile, correct
//   f28-f72  aspect 1.32  selfSym 0.475   FRONTAL - 45 frames, 1.9s of a 4.0s clip
//   f84-f96  aspect 0.59  selfSym 0.237   recovered to anchor
//
// ############################################################################################
// # THE FALSE-POSITIVE MODE — A FLAG IS A REASON TO LOOK, NEVER A VERDICT (phase 87)          #
// # selfSym rises whenever the silhouette becomes COMPACT, and a body can become compact       #
// # without rotating one degree. Every one of these tripped the gate while being CORRECT:      #
// #                                                                                            #
// #   oni ko v1          sym 0.117->0.789  aspect 1.02->4.14   he is PRONE. The aspect IS the  #
// #                      proof he collapsed properly (the ledger cites 4.10 as the pass        #
// #                      criterion). A ko can never pass this gate — treat ko as EXEMPT, the   #
// #                      same way check-anchor-lock exempts its END.                           #
// #   eclipse special_1  sym 0.251->0.411  aspect 0.42->0.75   a deep CROUCH. Verified frame   #
// #     v2               by frame across the whole clip: strict side profile throughout, and   #
// #                      the katana hangs POINT-DOWN in every frame.                           #
// #   eclipse strike_a   sym 0.244->0.652  aspect 0.42->1.12   a committed LUNGE; the aspect   #
// #     v5               rise is the extended blade, not a torso.                              #
// #   ir37 strike_b v4   sym 0.147->0.415  aspect 0.66->0.67   the box BARELY MOVED; the sym   #
// #                      rise is the war-fan OPENING - a fan is a symmetric object.            #
// #                                                                                            #
// # So: crouch, lunge, prone, and any opening symmetric prop all raise selfSym with no          #
// # rotation. A clip is only front-turned once you have SEEN both shoulders square to camera.   #
// # Tell them apart by eye, not by threshold — composite the flagged frame and LOOK.            #
// #                                                                                            #
// # The gate is still worth its keep: it is the ONLY gate that caught oni victory v1, which     #
// # scored 0.995/0.995 anchor-lock, clean containment and an ok body-commitment while being     #
// # square to camera at f42 and holding its club fully vertical overhead at f70.                #
// ############################################################################################
//
// ############################################################################################
// # CALIBRATION STATUS: VALIDATED WITHIN ONE KIT. **NOT CALIBRATED TO CONVICT ACROSS THE      #
// # ROSTER.** Do not read a flag from this tool as a defect without viewing the frames.       #
// ############################################################################################
//
// Measured 2026-07-28: run over all 97 SHIPPED clips at the default thresholds it flags **77**.
// That is not a 79% defect rate, it is a miscalibrated gate, and the reasons are known:
//
//   1. `ko` IS STRUCTURALLY EXEMPT FROM THE ASPECT SIGNAL. Every ko ends COLLAPSED ON THE
//      GROUND (that is the spec — see the ko_suffix_rule), and a prone body is genuinely wider
//      than it is tall. Measured ko aspects: 2.67 / 2.68 / 2.83 / 2.89 / 2.99 / 3.41 / 3.69 /
//      3.84. All correct, all flagged. Never apply --aspect-margin to a ko.
//   2. SOME ANCHORS ARE ALREADY WIDE (base aspect 1.21 / 1.23 / 1.36 — characters holding a
//      long weapon or a tail out to the side). A RELATIVE widening threshold means something
//      different for them than for a narrow anchor at 0.43.
//   3. THE SYM MARGIN IS TOO TIGHT FOR VERY ASYMMETRIC ANCHORS. Kits with base sym 0.06-0.08
//      clear base+0.12 on any ordinary pose change without ever going square to camera.
//
// WHERE IT IS TRUSTWORTHY: comparing clips WITHIN a single character's kit against that same
// character's own anchor, where the base is constant. That is the case it was built for and the
// case it was validated on — ir48 idle 0.63 / strike_a v2 0.74 / strike_b v1 1.32, which
// separated a clean clip, a wind-up coil and a true front-turn in one pass.
//
// THE HARD TELL, when the anchor is narrow: **aspect crossing 1.0** — a silhouette wider than it
// is tall cannot be a side profile. That is what distinguishes ir48 strike_b v1 (1.32, square to
// camera, 48 frames) from strike_a v2 (0.74, a coil, 9 frames).
//
// ############################################################################################
// # ⛔ IT USED TO GREEN-LIGHT MAGENTA RAWS IN SILENCE. --plate IS NOW REQUIRED FOR A RAW,     #
// #    AND A FULL-FRAME MASK IS NOW A REFUSAL. (phase 261, TOOLCHAIN-AUDIT §5)                #
// #                                                                                            #
// # THE DEFECT. On a raw the mask is `NOT plate`. `--plate` silently defaulted to green, so an #
// # ir56-lion-serpent raw — shot on a MAGENTA plate precisely because the creature is green —  #
// # matched isGreen() almost nowhere, and EVERY pixel in the frame became "subject":           #
// #     node qa-boss/check-frontturn.mjs qa-boss/raw/ir56-lion-serpent-idle.mp4                #
// #       [ ok  ] ir56-lion-serpent-idle.mp4   sym 0.999->0.999  aspect 1.00->1.00  run 0/97   #
// #       scanned 1  |  front-turns 0                                        <- EXIT 0         #
// #     ...--plate magenta                                                                     #
// #       [ ok  ] ir56-lion-serpent-idle.mp4   sym 0.287->0.289  aspect 1.23->1.24  run 0/97   #
// # A 960x960 frame at aspect 1.00 and sym 0.999 IS THE FRAME ITSELF. The gate measured        #
// # NOTHING and reported [ok]. It inverts in BOTH directions — a GREEN raw read with           #
// # `--plate magenta` degenerates identically (measured: eclipse-ofuda-idle, mean frame fill   #
// # 99.85%). Unlike check-containment, which at least screams 960px, this one was silent.      #
// #                                                                                            #
// # THE GUARD. Measured per-frame mask fill (share of the WHOLE FRAME the mask covers):        #
// #     ir56 idle       --plate green    99.93%   <- inverted                                  #
// #     eclipse idle    --plate magenta  99.85%   <- inverted                                  #
// #     ir56 idle       --plate magenta  26.65%       ir56 ko  --plate magenta   23.95%        #
// #     eclipse idle    --plate green    15.00%       eclipse special_3          16.33%        #
// #     hollow-pale special-1 --green    16.85%       _ec-block-v2-test.webm     15.17%        #
// # Worst real subject 26.8%, inversion 99.9% — the gap is an order of magnitude, so a mask    #
// # covering >= 90% of the frame is not a fighter, it is the key inverted. REFUSE (exit 2).    #
// #                                                                                            #
// # AND THE CHECK RUNS BEFORE THE TABLE IS PRINTED, not after. Every clip is MEASURED first,   #
// # the degeneracy check runs, and only then is a verdict printed — so an inverted run can     #
// # never put the string "[ ok  ]" into scrollback for someone to quote later. A guard that    #
// # fires after the verdict is a post-mortem, not a guard (TOOLCHAIN-AUDIT §7).                #
// #                                                                                            #
// # --plate is required only for a RAW (.mp4). A keyed .webm takes its mask from the ALPHA     #
// # plane, where the plate colour is not consulted at all; demanding a flag that changes       #
// # nothing would just train people to type a value at random.                                 #
// # Confirm a kit's plate before running:                                                      #
// #   node qa-boss/build-prompt.mjs qa-boss/prompts/<kit>.md idle | grep -oiE "solid saturated [A-Z]+"
// ############################################################################################
//
// Usage:
//   node qa-boss/check-frontturn.mjs <file.mp4|file.webm|dir> [--plate green|magenta]
//                                    [--sym-margin 0.12] [--aspect-margin 0.35] [--min-run 3]
//   --plate is REQUIRED when any target is a raw (.mp4); it is not used for a keyed .webm.
// Exit 1 if any clip has a flagged run >= --min-run frames, so it can gate a ship step —
// but see the calibration box above before wiring it into anything.
// Exit 2 = usage/input error, or a refusal: nothing measurable, no verdict printed.
//
// ############################################################################################
// # ⛔ THIS FILE CARRIED A VERBATIM COPY OF check-turn's VALIDATOR, AND IT WAS DEFEATED       #
// #    ANYWAY. (phase 264)                                                                    #
// #                                                                                            #
// # The phase-263 note below says "identical to the one in check-turn.mjs; keep them in step". #
// # Two copies is two things to forget, and the copy is exactly how coverage rots: the round   #
// # that hardened both copies is the round an adversarial sweep still defeated 8 of 12 tools,  #
// # each in a file that round did not own. The duplicate is DELETED. Every argument now goes   #
// # through qa-boss/lib/argcheck.mjs, which is IMPORTED and must never be copied again.        #
// #                                                                                            #
// # AND IT DISCARDED EVERY TARGET BUT THE FIRST — the phase-261 check-containment defect,      #
// # alive in this file. `const target = argv.find(...)` took ONE positional. MEASURED before   #
// # the fix, on the clip this gate was BUILT for:                                              #
// #   $ check-frontturn ir48-...-idle.webm ir48-...-strike_b.webm                              #
// #     [ ok  ] ir48-hex-paper-lord-idle.webm  sym 0.222->0.265  aspect 0.59->0.63  run 0/97   #
// #     scanned 1  |  front-turns 0                                              <- EXIT 0     #
// # strike_b — `[FRONT] run 23/97 @f33`, EXIT 1 on its own — was never opened, and "scanned 1" #
// # was the only tell. EVERY positional is now a target and A.done() refuses an unknown flag.  #
// ############################################################################################
//
// ############################################################################################
// # ⛔ AND AN ERRORED CLIP READ AS A CLEAN SWEEP. (phase 265; PRE-EXISTING AT HEAD, not a      #
// #    regression of the phase-263/264 wave — HEAD:229 has the same `continue`.)               #
// #                                                                                            #
// # THE DEFECT. A clip ffmpeg could not decode printed `[ERR ]` and then `continue`d WITHOUT   #
// # incrementing `bad`, so it never reached the exit code. MEASURED, before the fix:           #
// #   $ node qa-boss/check-frontturn.mjs <a zero-byte .webm>                                   #
// #     [ERR ] zero.webm: [in#0 @ ...] EBML header parsing failed                              #
// #     scanned 1  |  front-turns 0                                             <- EXIT 0      #
// # and on a directory holding ir48 idle plus a TRUNCATED ir48 strike_b — the clip this gate   #
// # was BUILT for, which exits 1 on its own with `[FRONT] run 23/97 @f33`:                     #
// #     [ ok  ] ir48-idle.webm      sym 0.222->0.265  aspect 0.59->0.63  run 0/97              #
// #     [ERR ] ir48-strike_b.webm: [in#0/matroska,webm @ ...] File ended prematurely           #
// #     scanned 2  |  front-turns 0                                             <- EXIT 0      #
// # `scanned 2` counts a clip that was NEVER MEASURED, and `front-turns 0` over it reads as a  #
// # clean kit in a && chain. Same class as every other defect in this file: A GATE THAT        #
// # CANNOT FAIL, here reached by handing it a file it could not open rather than a threshold.  #
// #                                                                                            #
// # THE FIX IS COPIED, NOT INVENTED. scripts/check-containment.mjs already had this right, and #
// # two gates in one chain that disagree about what an undecodable clip means is its own       #
// # defect. Its three lines are reproduced here verbatim in behaviour: the errored clips are   #
// # COUNTED, the count is printed NEXT TO THE VERDICT (not only in a per-row line that scrolls #
// # away), the sentence `... — this is not a clean result.` goes to stderr, and the run exits  #
// # non-zero. The ONE deliberate difference: check-containment always prints `errored 0`,      #
// # while this line already prints its DEGENERATE count only when non-zero, so `errored`       #
// # follows the convention of the line it is joining. That keeps every run in which nothing    #
// # errored BYTE-IDENTICAL to before this edit, which is how the change was verified.          #
// ############################################################################################
import { makeArgs } from './lib/argcheck.mjs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const USAGE = 'usage: node qa-boss/check-frontturn.mjs <file|dir> [more...] --plate green|magenta [--sym-margin N] [--aspect-margin N] [--min-run N]\n'
  + '       --plate is REQUIRED for a raw (.mp4); it is not used for a keyed .webm.';
// ONE validator, imported. It also removes the hand-rolled "skip the valued flags then take the
// first non-flag" dance that used to find the target: argcheck consumes each flag with its value,
// so what positionals() returns is exactly what the caller did not spend on a flag.
const A = makeArgs(argv, { tool: 'check-frontturn', usage: USAGE });
// ############################################################################################
// # ⛔ AND EVERY THRESHOLD WAS A DOOR OUT OF THE GATE. (phase 263, TOOLCHAIN-AUDIT §8)        #
// #                                                                                            #
// # --sym-margin, --aspect-margin and --min-run were read with a bare `Number(opt(...))` and   #
// # no check at all, so a typo turned this gate green while it went on measuring. Verified on  #
// # qa-boss/webm/ir48-hex-paper-lord-strike_b.webm — the clip this gate was BUILT for — whose  #
// # baseline is "[FRONT] ... run 23/97 @f33" at EXIT 1:                                        #
// #     --min-run zzz                      -> EXIT 0  "[ ok  ] ... run 23/97"                  #
// #        note the run is STILL 23 and the tag still says ok — the row does not even hint     #
// #     --sym-margin zzz --aspect-margin zzz -> EXIT 0  "run 0/97"                             #
// #     --min-run 9999                     -> EXIT 0  "run 23/97"                              #
// # Every comparison against NaN is false, so `r.sym > base.sym + NaN` is false for every      #
// # frame and `r.run >= NaN` is false for every clip: the gate measures everything and reports #
// # a clean sweep. Same class as the NaN and 999999 thresholds fixed elsewhere this session:   #
// # A GATE THAT CANNOT FAIL.                                                                   #
// #                                                                                            #
// # THE BAND ALONE IS NOT ENOUGH HERE, AND THAT IS MEASURED. The two signals are OR-ed, so     #
// # each margin on its own can be pushed to an absurd value and the OTHER still convicts:      #
// # --sym-margin 0.99 alone still exited 1, --aspect-margin 10 alone still exited 1. The gate  #
// # only went silent when BOTH were raised together (both at 0.5 -> run 14; both at 0.68 ->    #
// # run 1). No per-flag range can catch a COMBINATION of two individually reasonable values,   #
// # so the real guard is the suppression check further down.                                   #
// # ⚠ RE-MEASURED IN PHASE 264, AND THE "-> EXIT 0" THIS BLOCK USED TO CLAIM FOR THE           #
// # COMBINATION IS STALE: with the suppression check in place `--sym-margin 0.68               #
// # --aspect-margin 0.68` already exited **2**, not 0. It is now refused earlier still, at     #
// # parse time, because 0.68 is outside both re-measured bands. Two layers, in that order.     #
// ############################################################################################
// EXPLICIT OPT-OUT — see the identical block in check-turn.mjs. It relaxes the RANGE only; a
// missing value, an empty value, a non-finite value, a duplicate flag and an unknown flag all stay
// fatal inside argcheck, because none of them is ever anything but a mistake.
const ALLOW_UNREACHABLE = A.bool('--allow-unreachable-thresholds');
const relaxed = [];
// NOT a validator — argcheck owns every check. When the caller has explicitly opted out this hands
// argcheck the unbounded range and RECORDS the relaxation so the banner below can announce it.
const num = (flag, dflt, { min, max, integer = false, band }) => {
  const v = ALLOW_UNREACHABLE
    ? A.num(flag, dflt, { integer, band })
    : A.num(flag, dflt, { min, max, integer, band });
  if (ALLOW_UNREACHABLE && (v < min || v > max)) relaxed.push(`${flag} ${v} is outside [${min}, ${max}]`);
  return v;
};
// The calibrated defaults in one place — used as the fallback AND as the reference the supplied
// thresholds are re-derived against in the suppression check.
const DEFAULTS = { symMargin: 0.12, aspectMargin: 0.35, minRun: 3 };
// ⚠ BOTH MARGIN BANDS WERE RE-MEASURED IN PHASE 264 AND BOTH WERE FAR TOO WIDE — the old ones were
// derived from the LOUDEST FLAG ON THE ROSTER (oni ko: a PRONE body, and the header above says a ko
// can never pass this gate), which is a FALSE POSITIVE. A band justified by a false positive is not
// a band. Re-derived against the clip this gate was BUILT for, ir48-hex-paper-lord-strike_b.webm
// (base.sym 0.2231, peakSym 0.4268 -> max rise 0.2037; base.aspect 0.5861, peakAspect 0.9862 -> max
// widening ratio 1.6825), sweeping each signal with the OTHER disabled and MIN_RUN at its default 3:
//     sym-margin      0.12 run 6 · 0.15 run 5 · 0.17 run 3 CONVICTS | 0.18 run 1 · 0.20 run 1 SILENT
//     aspect-margin   0.35 run 23 · 0.60 run 10 · 0.66 run 5 · 0.67 run 4 CONVICTS | 0.68 run 1 SILENT
// So the last value that can still convict is 0.17 / 0.67, and the old 0.70 / 10 left a hole four
// and fifteen times wider than the usable range — `--sym-margin 0.5` and `--aspect-margin 2` were
// accepted as reasonable-looking numbers that no clip in this repo can cross.
const SYM_MARGIN = num('--sym-margin', DEFAULTS.symMargin, {
  min: 0.001,
  max: 0.17,
  band: 'sym is an IoU in [0, 1] measured against the clip\'s own frame 0. MEASURED on ir48 strike_b (the '
    + 'clip this gate was built for) the sym signal still produces a convicting run at --sym-margin 0.17 '
    + 'and goes silent at 0.18: its whole sym rise is 0.2037 and a run of 3 needs most of it. A larger '
    + 'margin is not a stricter gate, it is a bar the calibration clip itself cannot cross.',
});
const ASPECT_MARGIN = num('--aspect-margin', DEFAULTS.aspectMargin, {
  min: 0.001,
  max: 0.67,
  band: 'aspect-margin is a RELATIVE widening: the bar is base.aspect * (1 + margin). MEASURED on ir48 '
    + 'strike_b the aspect signal still convicts at 0.67 (run 4) and goes silent at 0.68 (run 1), because '
    + 'its widest frame is 1.6825x its base. The old ceiling of 10 was read off a PRONE ko — a clip the '
    + 'header says can never pass this gate — so it was a band justified by a false positive.',
});
const MIN_RUN = num('--min-run', DEFAULTS.minRun, {
  min: 1,
  integer: true,
  // The real ceiling is the frame count, enforced by the crossability check after decoding.
  max: 100000,
  band: 'a run is a count of frames, so it must be a whole number of at least 1. Its real ceiling is the '
    + 'length of the clips being scanned and is checked once they have been decoded.',
});
// --plate: the VALUE is validated here (green|magenta, once, non-empty). Whether it is REQUIRED
// depends on whether any resolved target is a raw, which is not known until the targets are
// expanded — so that half stays below, next to the file list it is a fact about.
const plateArg = A.str('--plate', null, {
  oneOf: ['green', 'magenta'],
  why: 'On a raw the mask is "NOT the plate colour", so the wrong plate INVERTS it to the whole frame '
    + 'and this gate reads sym 0.999 aspect 1.00 [ok] off a measurement of nothing (ir56-lion-serpent). '
    + 'It is not used for a keyed .webm, whose mask is the alpha plane.',
});
// EVERY positional is a target. The old `argv.find(...)` took ONE and dropped the rest in silence —
// measured: `check-frontturn <idle> <strike_b>` printed "scanned 1 | front-turns 0" and exited 0
// while strike_b, which exits 1 on its own, was never opened. done() runs last and refuses an
// unknown flag, so a typo'd `--min_run 9999` can no longer run at the default without a word.
const targets = A.positionals();
A.done();
if (!targets.length) { console.error(USAGE); process.exit(2); }
const THRESHOLDS = { symMargin: SYM_MARGIN, aspectMargin: ASPECT_MARGIN, minRun: MIN_RUN };
// When nothing was overridden the two verdicts are identical by construction, so the suppression
// check is skipped and a default run does exactly what it always did.
const usingDefaults = ['--sym-margin', '--aspect-margin', '--min-run'].every((f) => !argv.includes(f));
if (relaxed.length) {
  console.error('\n############################################################################');
  console.error('# --allow-unreachable-thresholds: RUNNING WITH A THRESHOLD OUTSIDE ITS BAND #');
  for (const r of relaxed) console.error(`#   ${r.padEnd(72)}#`);
  console.error('# A bar nothing can clear makes "[ ok  ]" meaningless. This run cannot be   #');
  console.error('# used as evidence that a kit is clean.                                     #');
  console.error('############################################################################\n');
}
const SCALE = 480;
const ALPHA_MIN = 40;
const N = 64;
// A mask covering this share of the WHOLE FRAME is the key inverted, not a fighter. See the
// measured table in the header: worst real subject 26.8%, both inversions 99.9%.
const FULL_FRAME_PCT = 90;

// EVERY argument is expanded: a directory contributes its clips, a file contributes itself. A path
// that cannot be opened stops the run — a mistyped path contributing zero clips is the same
// silent-under-measurement defect in a different coat.
const files = [];
const expansion = [];
for (const t of targets) {
  let st;
  try { st = fs.statSync(t); } catch (e) {
    console.error(`ERROR: no such file or directory: ${t} (${e.code || e.message})`);
    console.error('  NOTHING WAS MEASURED. A path that cannot be opened is never counted as clean.');
    process.exit(2);
  }
  if (st.isDirectory()) {
    const found = fs.readdirSync(t).filter((f) => /\.(webm|mp4)$/i.test(f)).map((f) => path.join(t, f));
    files.push(...found);
    expansion.push(`${t} -> ${found.length}`);
  } else { files.push(t); expansion.push(`${t} -> 1`); }
}
// Zero clips is not a pass. It used to print "scanned 0 | front-turns 0" and exit 0, which reads
// as a clean gate in a && chain — the vacuous-pass class of TOOLCHAIN-AUDIT §4.
if (!files.length) {
  console.error(`ERROR: ${targets.length} argument(s) resolved to 0 .mp4/.webm clips — nothing was measured, so nothing was cleared.`);
  console.error(`  ${expansion.join('  ·  ')}`);
  process.exit(2);
}

// A REPEATED --plate is the same silent-config defect the numeric flags refuse, and on a raw it
// decides whether the mask is the fighter or the whole frame: `--plate green --plate magenta` used
// the first silently. The wrong plate is precisely what green-lit ir56 (see the header block).
// argcheck refuses the duplicate by name, so only the "is it REQUIRED here" half is left below.
const raws = files.filter((f) => !/\.webm$/i.test(f));
// NO SILENT GREEN DEFAULT ON A RAW, DELIBERATELY. The default is what green-lit ir56: on the wrong
// plate the mask inverts and this gate reports a perfect [ok] off a measurement of the whole frame.
if (raws.length && plateArg === null) {
  console.error('ERROR: --plate is REQUIRED for a raw (.mp4) and must be green or magenta.');
  console.error('  On a raw the mask is "NOT the plate colour". Guess the plate wrong and the mask');
  console.error('  INVERTS to the whole frame: ir56-lion-serpent read sym 0.999 aspect 1.00 [ok] and');
  console.error('  exited 0 while measuring nothing at all. It will not guess.');
  console.error('  Magenta-plate characters: ir56-lion-serpent, onryo-katana, pale-choir.');
  console.error(`  ${raws.length} raw(s) in this run, e.g. ${path.basename(raws[0])}`);
  console.error(USAGE);
  process.exit(2);
}
// A mistyped value must not fall through to green either — that is the same silent wrong answer.
// argcheck's oneOf refuses it (and refuses `--plate` with no value) before anything is decoded.
const PLATE = plateArg === null ? 'green' : plateArg;   // .webm only; unreachable for a raw

const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;
const isMagenta = (r, g, b) => r > 90 && b > 40 && g < r - 40 && g < b + 20;

function bbox(m, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
function norm(m, w, h, b) {
  const o = new Uint8Array(N * N);
  const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    o[y * N + x] = m[(b.y0 + Math.floor(y * bh / N)) * w + (b.x0 + Math.floor(x * bw / N))];
  }
  return o;
}
const mirror = (a) => {
  const o = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) o[y * N + x] = a[y * N + (N - 1 - x)];
  return o;
};
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] || b[k]) u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; };

function scan(file, tmpDir) {
  const isWebm = /\.webm$/i.test(file);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  // decoder flag BEFORE -i or the alpha plane is silently dropped
  const pre = isWebm ? ['-c:v', 'libvpx-vp9'] : [];
  const vf = isWebm ? `alphaextract,scale=${SCALE}:-1` : `scale=${SCALE}:-1`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...pre, '-i', file, '-vf', vf, '-vsync', '0',
    path.join(tmpDir, 'f_%04d.png')], { encoding: 'utf8' });
  if (r.status !== 0) return { file, error: (r.stderr || '').split('\n')[0] };
  const frames = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.png')).sort();
  if (!frames.length) return { file, error: 'decoded 0 frames' };

  const rows = [];
  const fills = [];
  for (const fn of frames) {
    const p = PNG.sync.read(fs.readFileSync(path.join(tmpDir, fn)));
    const { width: w, height: h, data } = p;
    const m = new Uint8Array(w * h);
    let on = 0;
    for (let i = 0; i < m.length; i++) {
      const k = i * 4;
      if (isWebm) m[i] = data[k] > ALPHA_MIN ? 1 : 0;
      else {
        const [r0, g0, b0] = [data[k], data[k + 1], data[k + 2]];
        m[i] = (PLATE === 'magenta' ? !isMagenta(r0, g0, b0) : !isGreen(r0, g0, b0)) ? 1 : 0;
      }
      if (m[i]) on += 1;
    }
    // Share of the WHOLE FRAME the mask covers. Every other number this tool prints is derived
    // from the bbox and is therefore scale-free — which is exactly why an inverted mask produces
    // a beautiful, meaningless reading. This is the one quantity that can see the inversion.
    fills.push((on / (w * h)) * 100);
    const b = bbox(m, w, h);
    if (b.x1 < 0) { rows.push({ sym: 0, aspect: 0, empty: true }); continue; }
    const n = norm(m, w, h, b);
    rows.push({
      sym: iou(n, mirror(n)),
      aspect: (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1),
      height: b.y1 - b.y0 + 1,
      empty: false,
    });
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const base = rows.find((r) => !r.empty) || { sym: 0, aspect: 1 };
  // The flag/run arithmetic, unchanged, but as a function of a THRESHOLD SET so the same code can
  // be re-run at the calibrated defaults for the suppression check below.
  const runFor = (t) => {
    const flags = rows.map((r) => !r.empty
      && (r.sym > base.sym + t.symMargin || r.aspect > base.aspect * (1 + t.aspectMargin)));
    // longest contiguous flagged run
    let best = 0, cur = 0, bestStart = -1, curStart = 0;
    flags.forEach((f, i) => {
      if (f) { if (cur === 0) curStart = i; cur++; if (cur > best) { best = cur; bestStart = curStart; } }
      else cur = 0;
    });
    return { best, bestStart, flagged: flags.filter(Boolean).length };
  };
  const supplied = runFor(THRESHOLDS);
  // The same clip judged at the CALIBRATED DEFAULTS, carried out of scan() for the suppression check.
  const dflt = runFor(DEFAULTS);
  // report each signal's OWN maximum — reading aspect at the peak-sym frame understates a
  // front-turn whose widest frame is not its most symmetric one.
  const peakSym = Math.max(...rows.filter((r) => !r.empty).map((r) => r.sym));
  const peakAspect = Math.max(...rows.filter((r) => !r.empty).map((r) => r.aspect));

  // #########################################################################################
  // # dropPct — THE CONFOUND SIGNAL (phase 142). The header above already says a crouch, a  #
  // # lunge and a prone pose all raise selfSym with no turn at all, and that you must tell   #
  // # them apart BY EYE. That is correct but it gives no signal for WHEN to distrust the     #
  // # number, so the reading has to be re-derived by hand every time — it cost a verdict on  #
  // # lich attack_strike v2, whose beat is a deep forward fold ("hips folding deep, ribcage  #
  // # coming down over his leading knee"): sym read 0.373 with the body arguably never       #
  // # turning at all.                                                                        #
  // #                                                                                         #
  // # A fold/crouch/prone collapses the bbox HEIGHT. A genuine turn to camera does not — the #
  // # fighter stays upright and the box gets WIDER, not shorter. So the height drop separates #
  // # the two confounds cheaply, and it is the same quantity already trusted elsewhere as     #
  // # dropPct for judging sinking beats. This does NOT decide the verdict; it labels the      #
  // # reading so a flag on a crouch cannot be mistaken for a measured front-turn.             #
  // #########################################################################################
  const heights = rows.filter((r) => !r.empty).map((r) => r.height);
  const dropPct = heights.length ? (1 - Math.min(...heights) / base.height) * 100 : 0;

  const degen = fills.filter((v) => v >= FULL_FRAME_PCT).length;
  return {
    file, frames: rows.length, baseSym: base.sym, baseAspect: base.aspect,
    peakSym, peakAspect, dropPct,
    run: supplied.best, runStart: supplied.bestStart, flagged: supplied.flagged,
    dfltRun: dflt.best, dfltRunStart: dflt.bestStart,
    isWebm, degen, meanFill: fills.reduce((a, v) => a + v, 0) / Math.max(1, fills.length),
  };
}

console.log('=== FRONT-TURN GATE ===');
console.log('    selfSym = IoU(silhouette, its own mirror). side profile LOW, square-to-camera HIGH.');
console.log('    aspect  = bbox width / height. a frontal stance spreads the arms and widens the box.');
console.log(`    baseline = each clip's OWN frame 0; flag if sym > base+${SYM_MARGIN} or aspect > base*${1 + ASPECT_MARGIN}`);
console.log(`    a flagged run of >= ${MIN_RUN} frames is a defect\n`);
// NOTE the header stays HERE, above the measurement, and the --allow-unreachable-thresholds stamps
// are printed further down instead. Moving this block below the refusals would have been tidier but
// it would change the bytes of the existing inversion-refusal path, which is verified byte-identical
// against the pre-edit copy. The stamps only ever appear when the new opt-out flag is passed.

const tmpRoot = path.join(process.env.TEMP || '.', `frontturn_${process.pid}`);

// PASS 1 — MEASURE ONLY. Nothing is judged and nothing is printed yet, so the degeneracy check
// below runs BEFORE any "[ ok  ]" line can reach scrollback for an inverted run. See the header.
const results = files.map((f) => scan(f, tmpRoot));

// THE CHECK, BETWEEN THE PASSES. A mask covering (essentially) the whole frame is not a fighter.
const inverted = results.filter((r) => !r.error && r.degen >= r.frames / 2);
if (inverted.length) {
  console.error(`\n⛔ REFUSING — NO VERDICT WAS PRINTED. ${inverted.length} of ${results.length} clip(s) produced a mask covering the WHOLE FRAME.`);
  for (const r of inverted) {
    console.error(`  ${path.basename(r.file)}: ${r.degen}/${r.frames} frames >= ${FULL_FRAME_PCT}% of the frame (mean fill ${r.meanFill.toFixed(2)}%)`);
  }
  console.error('  The silhouette IS the frame, so selfSym and aspect measured nothing — that reading');
  console.error('  is the instrument, not the clip (it comes out sym ~0.999 aspect ~1.00 [ok], exit 0).');
  if (inverted.some((r) => !r.isWebm)) {
    console.error(`  LIKELY CAUSE: the WRONG --plate. You passed "${PLATE}"; on a raw the mask is "NOT the`);
    console.error('  plate colour", so the wrong plate matches nothing and every pixel becomes subject.');
    console.error('  Magenta-plate characters: ir56-lion-serpent, onryo-katana, pale-choir.');
    console.error('  Check the kit:  node qa-boss/build-prompt.mjs qa-boss/prompts/<kit>.md idle | grep -oiE "solid saturated [A-Z]+"');
  }
  if (inverted.some((r) => r.isWebm)) {
    console.error('  For a .webm the mask is the ALPHA plane, so a full-frame mask means the clip is');
    console.error('  fully OPAQUE — it was never keyed, or its alpha was dropped in encoding.');
  }
  process.exit(2);
}

// ############################################################################################
// # THE CROSSABILITY CHECK. A run is a count of FRAMES, capped by the length of the clips and #
// # by nothing about the fighter. If --min-run is longer than the LONGEST clip scanned, no    #
// # clip could produce a run that long and the gate is arithmetically incapable of failing.   #
// # `--min-run 9999` did exactly that to a 97-frame clip: EXIT 0, "[ ok  ] ... run 23/97" —   #
// # the offending run PRINTED ON THE SAME LINE as the ok. Compared against the LONGEST clip,  #
// # not each clip, so a short clip in a mixed directory is still a normal reading.            #
// ############################################################################################
const measured = results.filter((r) => !r.error);
const maxFrames = measured.length ? Math.max(...measured.map((r) => r.frames)) : 0;
if (measured.length && MIN_RUN > maxFrames) {
  console.error(`\n⛔ REFUSING — NO VERDICT WAS PRINTED. --min-run is ${MIN_RUN}, but the longest clip scanned is ${maxFrames} frames.`);
  console.error(`  ${measured.length} clip(s) were measured in full and NONE could produce a run of ${MIN_RUN} frames, so this`);
  console.error('  gate could not have failed whatever the clips contain. "[ ok  ]" would mean only that the');
  console.error(`  bar was set above the ceiling. Use a --min-run of at most ${maxFrames} (the default is ${DEFAULTS.minRun}).`);
  process.exit(2);
}

// ############################################################################################
// # THE SUPPRESSION CHECK — the guard that does not rely on my bands being right.              #
// # Re-derive every clip's run at the CALIBRATED DEFAULTS and refuse when the thresholds       #
// # actually supplied turned a flagged clip into a clean one. This is the only guard that      #
// # catches the COMBINATION disarm measured in the header block above, where --sym-margin and  #
// # --aspect-margin are each individually reasonable but together leave a bar no frame can     #
// # cross. It does not care which flag did it or how plausible the number looked; it asks the  #
// # one question that matters: DID A SUPPLIED THRESHOLD HIDE A RUN THIS GATE WOULD OTHERWISE   #
// # HAVE FLAGGED?                                                                              #
// # It cannot misfire on a clean kit — if the defaults flag nothing there is nothing to        #
// # suppress — and it is skipped outright when no threshold flag was passed.                   #
// ############################################################################################
const hidden = usingDefaults
  ? []
  : measured.filter((r) => r.dfltRun >= DEFAULTS.minRun && r.run < MIN_RUN && r.degen === 0);
if (hidden.length && ALLOW_UNREACHABLE) {
  // THE OPT-OUT MUST NEVER BE SILENT. A suppression can be caused by thresholds that are all
  // comfortably IN band (e.g. --min-run 24 against a run of 23), in which case `relaxed` is empty
  // and the band banner never fires. Without this, --allow-unreachable-thresholds would be a
  // brand-new silent door into exit 0 — the very class this phase exists to close.
  console.error('\n############################################################################');
  console.error('# --allow-unreachable-thresholds: A FLAGGED CLIP IS BEING SUPPRESSED        #');
  for (const r of hidden) {
    console.error(`#   ${`${path.basename(r.file)} flags at the defaults (run ${r.dfltRun}/${r.frames} @f${r.dfltRunStart})`.padEnd(72)}#`);
  }
  console.error('# This run is NOT evidence that these clips are clean.                      #');
  console.error('############################################################################\n');
}
if (!ALLOW_UNREACHABLE) {
  if (hidden.length) {
    console.error(`\n⛔ REFUSING — NO VERDICT WAS PRINTED. The thresholds you supplied SUPPRESSED ${hidden.length} flagged clip(s).`);
    for (const r of hidden) {
      console.error(`  ${path.basename(r.file)}: at the calibrated defaults this clip flags — run ${r.dfltRun}/${r.frames} @f${r.dfltRunStart}`
        + `  (sym ${r.baseSym.toFixed(3)}->${r.peakSym.toFixed(3)}, aspect ${r.baseAspect.toFixed(2)}->${r.peakAspect.toFixed(2)})`);
    }
    const shown = [
      SYM_MARGIN !== DEFAULTS.symMargin ? `--sym-margin ${SYM_MARGIN} (default ${DEFAULTS.symMargin})` : null,
      ASPECT_MARGIN !== DEFAULTS.aspectMargin ? `--aspect-margin ${ASPECT_MARGIN} (default ${DEFAULTS.aspectMargin})` : null,
      MIN_RUN !== DEFAULTS.minRun ? `--min-run ${MIN_RUN} (default ${DEFAULTS.minRun})` : null,
    ].filter(Boolean);
    console.error(`  You changed: ${shown.join(', ')}`);
    console.error('  The threshold is the only reason this run would have printed "[ ok  ]" at exit 0. Note the');
    console.error('  calibration box at the top of this file: a flag here is a reason to LOOK, not a verdict, so');
    console.error('  the right answer to a false positive is to view the frames, not to move the bar until it');
    console.error('  stops flagging. Re-run at the defaults, or pass --allow-unreachable-thresholds to say you');
    console.error('  mean it (a ko is expected to flag — see the ko_suffix_rule note above).');
    process.exit(2);
  }
}

// PASS 2 — REPORT.
// Stamped on STDOUT, not just stderr, because these rows are what get pasted into a handoff and an
// "[ ok  ]" row produced under a suppressed threshold must carry its warning with it.
if (relaxed.length) console.log('  ⛔ THRESHOLD OUT OF BAND (--allow-unreachable-thresholds): ' + relaxed.join('; '));
if (hidden.length) console.log(`  ⛔ SUPPRESSED (--allow-unreachable-thresholds): ${hidden.map((r) => `${path.basename(r.file)} flags at the defaults (run ${r.dfltRun})`).join('; ')}`);
let bad = 0, degenClips = 0, frontTurns = 0, errored = 0;
for (const r of results) {
  // AN ERRORED CLIP IS NOT A CLEAN CLIP. It was handed in, it was never opened, and nothing about
  // it was measured — so it must reach the exit code. It used to `continue` past `bad` entirely.
  if (r.error) { console.log(`  [ERR ] ${path.basename(r.file)}: ${r.error}`); errored++; continue; }
  // A MINORITY of full-frame frames is not the whole-clip inversion refused above, but those
  // frames still measured the frame and not the fighter, so the clip cannot be cleared either.
  const partial = r.degen > 0
    ? `  <- ${r.degen}/${r.frames} frames MEASURED THE WHOLE FRAME (>= ${FULL_FRAME_PCT}% fill): not cleared`
    : '';
  const isBad = r.run >= MIN_RUN || r.degen > 0;
  if (isBad) bad++;
  if (r.degen > 0) degenClips++; else if (r.run >= MIN_RUN) frontTurns++;
  const tag = r.degen > 0 ? '[DEGEN]' : (isBad ? '[FRONT]' : '[ ok  ]');
  // A fold/crouch/prone collapses bbox HEIGHT; a genuine turn to camera does not. So a big drop
  // means the sym/aspect reading is confounded and must be settled by eye, not by the number.
  const confound = r.dropPct >= 15
    ? `  drop ${r.dropPct.toFixed(0)}% <- SINK/FOLD: sym+aspect CONFOUNDED, judge by eye`
    : '';
  console.log(`  ${tag} ${path.basename(r.file).padEnd(44)} sym ${r.baseSym.toFixed(3)}->${r.peakSym.toFixed(3)}  aspect ${r.baseAspect.toFixed(2)}->${r.peakAspect.toFixed(2)}  run ${r.run}/${r.frames}${r.run >= MIN_RUN ? ` @f${r.runStart}` : ''}${confound}${partial}`);
}
// THE UNMEASURED COUNT SITS NEXT TO THE VERDICT, not only in the [ERR ] row above it. `scanned N`
// counts clips that were HANDED IN, and an errored clip is in that N while contributing no
// measurement at all — so without this the denominator and the verdict disagree in silence.
console.log(`\nscanned ${files.length}  |  front-turns ${frontTurns}${degenClips ? `  |  DEGENERATE (measured the frame, not the fighter) ${degenClips}` : ''}${errored ? `  |  errored (NOT measured) ${errored}` : ''}`);
// Verbatim from scripts/check-containment.mjs, so the two gates say the same thing about the same
// input. See the phase-265 block at the top of this file for the measured before-behaviour.
if (errored) console.error(`${errored} clip(s) could not be decoded and were NOT measured — this is not a clean result.`);
process.exit(bad || errored ? 1 : 0);
