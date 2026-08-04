// Post-key smoothstep edge feather (phase 11b law, ported from the session scratchpad):
// content that crosses the source frame boundary must DISSOLVE at the edge instead of
// cutting flat (the cut lives in the SOURCE pixels - wide-framing prompts shrink but never
// eliminate it; never re-generate for this). Applies an alpha ramp over an N-px band on the
// chosen edges of every keyed frame. Run AFTER key-idle-clips.mjs, on its output dir.
//
// ⛔ THIS TOOL MUTATES THE PNG FRAMES IN PLACE. Run it on a copy unless you mean it.
//
// ############################################################################################
// # ⛔ IT ERASED EVERY PIXEL OF A REAL CHARACTER AND REPORTED SUCCESS. (phase 262)            #
// #                                                                                          #
// # MEASURED, on qa-boss/keyed/ir48-s1-v5 (960x870) copied to scratch:                       #
// #     BEFORE  visiblePx(a>=24) = 919381   meanAlpha = 45.622                               #
// #     $ node scripts/edge-feather.mjs <dir> --top 999999                                   #
// #     EXIT=0  "feathered 6/6 frames"                          <- REPORTS SUCCESS           #
// #     AFTER   visiblePx(a>=24) = 0        meanAlpha =  0.000  <- EVERY PIXEL ERASED        #
// #                                                                                          #
// # THE MECHANISM. The ramp is `m = smooth(y / band.top)` applied wherever `y < band.top`.    #
// # A band wider than the frame therefore covers EVERY row, and every m is ~smooth(0.001)     #
// # ~= 3e-6, so every alpha rounds to 0. Nothing in the old code compared the band to the     #
// # frame, and nothing looked at how much subject the run had removed. It is dimension-       #
// # independent: the same argument destroys any frame size.                                   #
// #                                                                                          #
// # THIS IS THE PHASE-260 cut-bloom-plate DEFECT WEARING A DIFFERENT ARGUMENT — a mutating    #
// # tool handed an absurd-but-parseable number, deleting the character and exiting 0 while    #
// # every downstream gate stayed green. It is fixed the same way, and the ORDER IS THE WHOLE  #
// # POINT: MEASURE-PASS -> CHECK -> WRITE-PASS. A guard that fires after the write is a       #
// # post-mortem, not a guard (TOOLCHAIN-AUDIT §7, pad-anchor-plate).                          #
// ############################################################################################
//
// ############################################################################################
// # ⛔ AND IT STILL DID IT — VIA THE DOCUMENTED, LEGITIMATE `--top 48`. (phase 265)           #
// #                                                                                          #
// # Guards 1-3 all rule on the WHOLE RUN. Guard 3 accumulates visBefore/visAfter across EVERY #
// # frame in the directory, so it is STRUCTURALLY BLIND to a per-frame wipe: one annihilated  #
// # frame is arithmetic noise inside a 97-frame mean. REPRODUCED, on a 97-frame dir           #
// # (qa-boss/keyed/ir48-s1-v5, 960x870) copied to scratch with ONE frame replaced by a        #
// # subject sitting entirely in rows 0-9:                                                     #
// #                                                                                          #
// #     $ node scripts/edge-feather.mjs <copy> --top 48                                       #
// #     EXIT=0                                                                                #
// #     feathered 78/97 frames ... removed 8754 of 22836640 visible px = 0.038%               #
// #     f_0050.png  visiblePx(a>=24)  8000 -> 800   meanAlpha 2.443 -> 0.082                  #
// #                 md5 f6c372d9... -> 7e149ef3...                                            #
// #                                                                                          #
// # 90% of that frame's subject destroyed IN PLACE, reported as 0.038%, exit 0. None of       #
// # guards 1-3 can fire and none is wrong to stay silent: 48 is inside the [1,363] argument   #
// # band, 48 is 5.5% of 870 so the 25% geometry ceiling is nowhere near, and the directory    #
// # mean really is 0.038%. AND `--top 48` IS NOT AN ABSURD VALUE — the run-book and           #
// # qa-boss/BRIEF-hollow-pale-dropins.md both document it as THE house feather. A subject     #
// # sitting high in frame is exactly what a top-feather annihilates, and it is invisible in   #
// # the average.                                                                              #
// #                                                                                          #
// # SO THE ARGUMENT IS NOT THE DEFECT, AND CLAMPING IT WOULD HAVE FIXED NOTHING. The defect   #
// # is the ACCOUNTING UNIT. A directory mean cannot protect an individual frame, and the      #
// # FRAME IS THE ASSET. Guard 4 moves the blast-radius question onto the frame, which is the  #
// # signature form: it refuses the OUTPUT SHAPE — a frame that lost most of itself — whatever #
// # route produced it (any edge, any band width legal under guard 1, any frame size, any      #
// # number of sibling frames to dilute it) instead of guarding the one argument that got here.#
// ############################################################################################
//
// THE FOUR GUARDS, AND THE SWEEP THAT SET EACH BAND (all measured, none reasoned)
//
// 1. ARGUMENT BAND, via qa-boss/lib/argcheck.mjs — refuses before a file is opened.
//    A band is a whole number of pixels in [1, 363]. 363 = 25% of 1452, the largest keyed frame
//    dimension in this repo, so it is the widest band that could be legal on ANY frame here.
//    `--top 999999` now exits 2 at argument time. `--top 0` also exits 2: an explicitly-zero band
//    is a silently disabled edge, which is the same defect as NaN. Omit the edge instead.
//
// 2. DIMENSION CEILING — a band may not exceed 25% of the dimension it ramps (MAX_BAND_FRAC).
//    Real recorded usage in this repo is 40-48px; the widest as a fraction of its dimension is
//    48/380 = 12.63% (eclipse-ofuda-block_b-v2, the narrowest keyed frame in the set). 25% is
//    ~2x that, and it is still structurally an EDGE treatment: opposite bands at 25% each leave
//    the middle 50% of the frame at full alpha. Measured cost of the run this catches, on
//    eclipse-ofuda-block_b-v2 (380x832) --left 96 --right 96 --top 96: 14.56% of alpha mass gone.
//
// 3. DIRECTORY BLAST-RADIUS CEILING — a run may not push more than MAX_ERASE_PCT of the
//    directory's currently visible pixels (a>=24) below visibility. THE BAND, MEASURED BOTH WAYS
//    on real keyed dirs:
//      LEGITIMATE 48px feathers, visible-area removed (this is the bound that binds):
//        ir48-s1-v5      960x870  --left 48 --right 48 --top 48   0.1992%   <- worst legit run
//        eclipse-block_b 380x832  --left 48 --right 48 --top 48   0.1596%
//        eclipse-idle-v2 418x834  --left 48 --right 48 --top 48   0.1123%
//        hollow-pale-throw-b 786x888  --right 48                  0.0743%
//        eclipse-strike_a 910x938 --top 48 --left 48              0.0429%
//        lady-kurotachi-special_1 772x832 --top 48                0.0175%
//        eclipse-block_a 934x916  --top 48                        0.0028%
//      THE DISASTER: --top 999999 removes 100.000%.
//    2% sits an order of magnitude above every legitimate run measured and two orders below the
//    defeat. It is NOT the guard that catches --top 999999 (guards 1 and 2 both fire first) — it
//    catches wholesale damage that is legal on both the argument and the geometry.
//    ⚠ CORRECTION (phase 265). This guard used to claim it also caught "a legal, narrow band over a
//    frame whose subject happens to sit entirely inside it". IT DOES NOT, except by luck of the
//    frame count. It is a DIRECTORY MEAN: the phase-262 verification constructed that case in a
//    dir small enough for one frame to drag the mean past 2%, and generalised from it. Put the
//    same frame in a 97-frame dir and the mean reads 0.038% — see the phase-265 box above. That
//    case belongs to guard 4 and only to guard 4.
//
// 4. PER-FRAME BLAST-RADIUS CEILING — NO SINGLE FRAME may lose more than MAX_FRAME_ERASE_PCT of
//    its OWN visible pixels. This is the guard the directory mean cannot be: the frame is the
//    asset, so the frame is the accounting unit.
//    THE BAND, MEASURED — 100 real keyed dirs (qa-boss/keyed + qa-boss/*/keyed*), 9584 frames,
//    swept with every band shape actually recorded in this repo (--top 48 / --bottom 48 /
//    --left 48 / --right 48 / --top 48 --left 48 / all four at 48) = 57504 frame x band results:
//        WORST LEGITIMATE SINGLE FRAME     3.542%
//          lady-kurotachi-throw_b/f_052.png 692x836, all four edges 48: 133917 -> 129174 visible
//          (--left 48 alone on that clip's f_046 is 3.456%; that dir's mean is only 0.8707%,
//           which is why the worst frame has to be asked for by name)
//        next: ir37-hit-v2/f_0055 1.955% · lady-kurotachi-strike_a/f_042 1.795% ·
//              eclipse-ofuda-victory-v2/f0012 1.594% · hollow-pale-ko/f_063 1.567%
//        75 of the 57504 results exceed 3%.  ZERO exceed 4%.
//        THE DISASTER: the phase-265 --top 48 wipe removes 90.000% of one frame.
//    10% therefore sits 2.8x above the worst legitimate frame ever measured here, 2.5x above the
//    4% line under which every one of those 57504 results falls, and 9x below the defeat. The
//    band between 4% and 90% is EMPTY of real data, which is where a threshold belongs.
//    No small-frame exemption, and none is needed: the smallest subject in the whole corpus is
//    68497 visible px (eclipse-ofuda-strike_b-v2/f0016), so there is no near-empty frame here
//    whose ratio could spike on a handful of pixels. An exemption would also be an off-switch.
//
// Guards 2, 3 and 4 refuse with exit 1 (measured in full, real defect detected) and leave every
// frame BYTE-IDENTICAL — md5-verified.
//
// ⛔ WHICH GUARDS --allow-large CAN OPEN, AND WHY THAT IS NOT ALL OF THEM (phase 265)
// --allow-large relaxes GUARD 2 ONLY — the DIMENSION ceiling. It used to disable guard 3 as well,
// so relaxing a GEOMETRY bound silently switched off the ASSET-SAFETY bound as a side effect. That
// is too coarse, and it was live: on the narrowest keyed frame in the repo,
//     $ node scripts/edge-feather.mjs <copy of eclipse-ofuda-block_b-v2> --left 363 --allow-large
//     EXIT=0   feathered 97/97 ... removed 1048994 of 13694746 visible px = 7.660%
//     dir meanAlpha 111.593 -> 74.184
// ramped 95.5% of the frame width to near-zero alpha and exited 0. The two bounds answer different
// questions — "is this still an edge treatment?" (geometry, a judgement call an operator may
// legitimately overrule) versus "is this destroying the character?" (safety, which no argument
// should be able to answer for you). GUARDS 3 AND 4 ARE THEREFORE UN-DISABLEABLE: there is no flag
// that makes an asset-destroying run exit 0. Nothing is lost by that — no caller in this repo passes
// --allow-large at all, and no measured legitimate run comes within 2.3x of either ceiling.
// Because --allow-large no longer buys a run that cannot fail, it is announced on both streams from
// here rather than through argcheck's offSwitch, whose fixed "This run CANNOT FAIL." is now untrue
// for this flag — and a scrollback line that overstates is how a gate gets disbelieved.
// ⚠ --allow-large DOES NOT REOPEN GUARD 1 EITHER. `--top 999999 --allow-large` still exits 2. Guard
// 1 is a statement about what a band can ever mean, not a policy about this run: above 363 px there
// is no frame in this repo the band could be an edge treatment of, so there is nothing to override.
//
// ⛔ TWO EARLIER SILENT-SUCCESS DEFECTS, still closed (TOOLCHAIN-AUDIT §4, phase 261)
//
// 1. ZERO FRAMES USED TO EXIT 0. On an empty dir — or on a dir of mp4s, the natural mistake since
//    the neighbouring run-book steps all take video — it printed `feathered 0/0 frames` and exited
//    0. A WRONG PATH was a GREEN LIGHT inside an `&&` chain, and the clip encoded with the hard
//    frame-edge cut this tool exists to dissolve. Now: exit 2, naming the directory.
//
// 2. `--right` WITH NO VALUE BECAME NaN — AND THE REPORT HID IT AS `null`. The old parser walked
//    argv with a FIXED STRIDE OF TWO and did `band[k] = Number(argv[i+1])` with no check, so a flag
//    left last on the line read `undefined` -> NaN. `if (band.right && x >= W - band.right)` is
//    then never true, so NOTHING was feathered — and because the summary printed the band object
//    through JSON.stringify, which serialises NaN as `null`, the line read `{"right":null}`: the
//    word NaN never appeared. Exit 0. Both cases are now argcheck's, not this file's: the local
//    validator that used to live here is DELETED. There is ONE door for arguments.
//
// Usage: node scripts/edge-feather.mjs <keyedFramesDir> [--top N] [--bottom N] [--left N] [--right N] [--allow-large]
//   Only the edges you pass get feathered. Bands operate in the CROPPED frame space the
//   keyer emitted. A bottom band would eat planted feet - only pass it for effect clips
//   whose art floats (the phase 11b special used 40px bottom with a protected feet column).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { makeArgs } from '../qa-boss/lib/argcheck.mjs';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const USAGE = 'usage: node scripts/edge-feather.mjs <keyedFramesDir> [--top N] [--bottom N] [--left N] [--right N] [--allow-large]';

// SPELLING NORMALISER, NOT A VALIDATOR. `--top=48` is a documented spelling; argcheck matches flags
// by exact string, so the `=` form is rewritten to the space form BEFORE argcheck sees it. It makes
// no accept/reject decision about any value: `--top=` becomes ['--top',''] and argcheck refuses the
// empty string exactly as it refuses a missing one.
const EDGES = ['top', 'bottom', 'left', 'right'];
const VALUE_FLAGS = new Set(EDGES.map((e) => `--${e}`));
const argv = [];
for (const a of process.argv.slice(2)) {
  const eq = a.startsWith('--') ? a.indexOf('=') : -1;
  if (eq !== -1 && VALUE_FLAGS.has(a.slice(0, eq))) argv.push(a.slice(0, eq), a.slice(eq + 1));
  else argv.push(a);
}

// 363 = 25% of 1452, the largest keyed frame dimension in this repo (qa-boss/keyed swept). A band
// above it cannot be a legal edge treatment on ANY frame here, so it is refused without opening a file.
const BAND_MAX = 363;
const MAX_BAND_FRAC = 0.25;   // guard 2 — a band may not exceed this fraction of the dimension it ramps
const MAX_ERASE_PCT = 2;      // guard 3 — % of the DIRECTORY's visible px (a>=24) a run may push below visibility
// guard 4 — % of ONE FRAME's own visible px it may lose. Worst legitimate frame measured across
// 9584 real keyed frames x 6 real band shapes is 3.542%; nothing in that sweep exceeds 4%; the
// phase-265 defeat is 90.000%. See the header for the full sweep.
const MAX_FRAME_ERASE_PCT = 10;

const A = makeArgs(argv, { tool: 'edge-feather', usage: USAGE });
const bandOpts = (edge) => ({
  min: 1,
  max: BAND_MAX,
  integer: true,
  band: `--${edge} is a band width in WHOLE PIXELS. 0 is a silently disabled edge (omit it instead); `
      + `${BAND_MAX} is 25% of the largest keyed frame in this repo, and a band wider than its frame `
      + `ramps EVERY pixel to ~zero alpha — that is how --top 999999 erased ir48-s1-v5 and exited 0.`,
});
const band = {
  top: A.num('--top', 0, bandOpts('top')),
  bottom: A.num('--bottom', 0, bandOpts('bottom')),
  left: A.num('--left', 0, bandOpts('left')),
  right: A.num('--right', 0, bandOpts('right')),
};
// --allow-large opens GUARD 2 (geometry) ONLY. It is deliberately NOT argcheck's offSwitch: that
// helper appends a fixed "This run CANNOT FAIL.", which stopped being true when guards 3 and 4 were
// made un-disableable. The offSwitch CONTRACT — announce on stdout AND stderr, because a silent
// off-switch is indistinguishable from a pass in scrollback — is kept verbatim below; only the
// sentence that would now be a lie is replaced.
const ALLOW_LARGE = A.bool('--allow-large');
if (ALLOW_LARGE) {
  const msg = '⚠ edge-feather: --allow-large is set — the 25% DIMENSION ceiling (guard 2) is disabled, so a band '
    + 'that ramps deep into the subject will be written. The blast-radius ceilings (guards 3 and 4) still apply '
    + 'and CANNOT be disabled: this run can still refuse.';
  console.log(msg);
  console.error(msg);
}
const pos = A.positionals();
A.done();

const die = (...lines) => { for (const l of lines) console.error(l); console.error(USAGE); process.exit(2); };

if (pos.length === 0) die('ERROR: no frames directory given.');
if (pos.length > 1) die(`ERROR: unexpected extra argument "${pos[1]}". Bands must be passed as --<edge> N.`);
const dir = pos[0];
if (!fs.existsSync(dir)) die(`ERROR: no such directory: ${dir}`);
if (!fs.statSync(dir).isDirectory()) die(`ERROR: not a directory (this tool takes a DIR of PNG frames): ${dir}`);

if (!EDGES.some((e) => band[e])) {
  die('ERROR: no edge given — nothing would be feathered, and this tool would have reported success.',
      '  Pass at least one of --top / --bottom / --left / --right.');
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
// A mutating tool that processes ZERO frames must never report success — it used to print
// "feathered 0/0" and exit 0, so a wrong path was a green light in a && chain (TOOLCHAIN-AUDIT §4).
if (!files.length) {
  const n = fs.readdirSync(dir).length;
  die(`ERROR: no .png frames in ${dir} — nothing was measured, nothing was feathered.`,
      `  This tool takes a DIRECTORY OF PNG FRAMES, not a webm/mp4 (${n} entr${n === 1 ? 'y' : 'ies'} here, none .png).`);
}

// Echo the DIR and the RESOLVED bands before touching a pixel, so scrollback can never confuse a
// real run with a no-op one. Printed as plain numbers, NOT through JSON.stringify, which is what
// disguised the NaN as `null`.
console.log(`edge-feather: dir=${dir}  frames=${files.length}  bands top=${band.top} bottom=${band.bottom} left=${band.left} right=${band.right}`);

const smooth = (t) => t * t * (3 - 2 * t); // smoothstep 0..1

// THE ONE RAMP, shared by the measure pass and the write pass so they cannot drift apart. Returns
// the new alpha for a pixel, or -1 when the pixel is untouched (m === 1), which is what decides
// whether a frame is rewritten at all.
const rampedAlpha = (a, x, y, W, H) => {
  if (a === 0) return -1;
  let m = 1;
  if (band.top && y < band.top) m = Math.min(m, smooth(y / band.top));
  if (band.bottom && y >= H - band.bottom) m = Math.min(m, smooth((H - 1 - y) / band.bottom));
  if (band.left && x < band.left) m = Math.min(m, smooth(x / band.left));
  if (band.right && x >= W - band.right) m = Math.min(m, smooth((W - 1 - x) / band.right));
  return m < 1 ? Math.round(a * m) : -1;
};

// ---------------------------------------------------------------------------------------------
// PASS 1 — MEASURE ONLY. Not one byte is written in this loop. Every guard below runs on its
// results, BEFORE pass 2 opens a file for writing.
// ---------------------------------------------------------------------------------------------
const VIS = 24; // the visibility floor the QA tools use throughout this repo
let visBefore = 0, visAfter = 0, touchedFrames = 0;
// THE FRAME IS THE ACCOUNTING UNIT (guard 4). The directory totals above are kept for guard 3, but
// they cannot see a single wiped frame, so every frame's own before/after is carried out of this
// loop and the worst one is what guard 4 rules on.
let worstFrame = null;   // { file, before, after, pct }
const dims = new Map();
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, f)));
  const { width: W, height: H, data: d } = png;
  dims.set(`${W}x${H}`, (dims.get(`${W}x${H}`) || 0) + 1);
  let changed = false;
  let fBefore = 0, fAfter = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = d[(y * W + x) * 4 + 3];
      if (a >= VIS) fBefore += 1;
      const na = rampedAlpha(a, x, y, W, H);
      if (na === -1) { if (a >= VIS) fAfter += 1; continue; }
      changed = true;
      if (na >= VIS) fAfter += 1;
    }
  }
  visBefore += fBefore;
  visAfter += fAfter;
  // A FULLY TRANSPARENT FRAME MUST BE SKIPPED, NOT SCORED. Its ratio is 0/0 = NaN, and NaN would
  // not merely be wrong, it would DISARM GUARD 4: the first frame sets worstFrame, every later
  // `pct > NaN` is false so the real worst frame can never replace it, and `NaN > ceiling` is false
  // so the guard never fires. That is argcheck's NaN-threshold defect reproduced inside a
  // comparison. A blank frame also has nothing to lose, so skipping costs nothing. An
  // all-transparent DIRECTORY is a different thing and is refused above.
  if (fBefore > 0) {
    const pct = ((fBefore - fAfter) / fBefore) * 100;
    if (!worstFrame || pct > worstFrame.pct) worstFrame = { file: f, before: fBefore, after: fAfter, pct };
  }
  if (changed) touchedFrames += 1;
}

if (!visBefore) {
  die(`ERROR: every frame in ${dir} is already fully transparent (0 px at alpha >= ${VIS}).`,
      '  There is nothing to feather, and a percentage of zero visible pixels is undefined — so this',
      '  run could only ever report success off an empty measurement. Check the keyer output first.');
}

// --- GUARD 2: DIMENSION CEILING. Runs on measured dimensions, before any write. ---------------
const maxW = Math.max(...[...dims.keys()].map((k) => Number(k.split('x')[0])));
const maxH = Math.max(...[...dims.keys()].map((k) => Number(k.split('x')[1])));
const tooWide = [
  ['top', band.top, maxH, 'height'], ['bottom', band.bottom, maxH, 'height'],
  ['left', band.left, maxW, 'width'], ['right', band.right, maxW, 'width'],
].filter(([, v, dim]) => v > dim * MAX_BAND_FRAC);
if (tooWide.length && !ALLOW_LARGE) {
  console.error(`\n⛔ REFUSING — NOTHING WAS WRITTEN. Frame size ${[...dims.keys()].join(', ')}.`);
  for (const [edge, v, dim, which] of tooWide) {
    console.error(`  --${edge} ${v} is ${((v / dim) * 100).toFixed(1)}% of the frame ${which} (${dim}), past the ${MAX_BAND_FRAC * 100}% ceiling.`);
  }
  console.error('  A feather is an EDGE treatment. Real recorded usage in this repo is 40-48px, at most');
  console.error('  12.6% of its dimension; a band this wide ramps the subject itself, and one wider than');
  console.error('  the frame ramps EVERY pixel to zero alpha (--top 999999 erased ir48-s1-v5 and exited 0).');
  console.error('  LIKELY CAUSE: a band meant for a different frame size, or a px value typed in the wrong unit.');
  console.error('  If the overrun really is this deep, the clip needs a re-roll, not a feather — see FIRE-PLAN.md.');
  console.error('  To override anyway: --allow-large (it announces itself on both streams).');
  process.exit(1);
}

// --- GUARD 3: DIRECTORY BLAST-RADIUS CEILING. Measured before/after, before any write. ---------
// NOT overridable. --allow-large opens the GEOMETRY ceiling above; it must not decide whether the
// character survives (phase 265 — `--left 363 --allow-large` erased 7.660% of eclipse-block_b at
// exit 0 purely because relaxing a geometry bound also switched this one off).
const erased = visBefore - visAfter;
const erasedPct = (erased / visBefore) * 100;
if (erasedPct > MAX_ERASE_PCT) {
  console.error(`\n⛔ REFUSING — NOTHING WAS WRITTEN. This feather would remove ${erased} of ${visBefore} visible px (${erasedPct.toFixed(3)}%), past the ${MAX_ERASE_PCT}% ceiling.`);
  console.error('  A legitimate 48px feather removes under 0.2% of visible area on every keyed dir in this');
  console.error('  repo. A number this large means the band is eating the SUBJECT, not an overrunning edge.');
  console.error('  LIKELY CAUSE: the subject sits against the edge you are feathering (check the keyer bbox —');
  console.error('  a tight crop puts the body inside the band), or the wrong edge was named.');
  console.error('  THERE IS NO OVERRIDE. --allow-large relaxes the 25% DIMENSION ceiling only: it is a');
  console.error('  judgement about whether a band is still an edge treatment, not a licence to delete the');
  console.error('  character. If this much really must go, the clip needs a re-roll — see FIRE-PLAN.md.');
  process.exit(1);
}

// --- GUARD 4: PER-FRAME BLAST-RADIUS CEILING. Measured before/after, before any write. ---------
// The guard above is a DIRECTORY MEAN and is structurally blind to a single wiped frame: the
// phase-265 defeat destroyed 90% of one frame and the mean read 0.038%, exit 0. This one asks the
// only question that protects an individual asset — did ANY ONE FRAME lose most of itself? — so it
// holds however many intact siblings are averaged in beside it. Also NOT overridable.
// worstFrame is non-null here by construction: visBefore > 0 was just enforced, and visBefore is
// the sum of the per-frame counts, so at least one frame had fBefore > 0 and set it. It is read
// unguarded on purpose — a `worstFrame &&` here would be a branch no input can take, and an
// untrippable branch on a guard is how a guard quietly becomes optional.
if (worstFrame.pct > MAX_FRAME_ERASE_PCT) {
  console.error(`\n⛔ REFUSING — NOTHING WAS WRITTEN. One frame loses ${worstFrame.pct.toFixed(3)}% of its own visible pixels, past the ${MAX_FRAME_ERASE_PCT}% per-frame ceiling.`);
  console.error(`  WORST FRAME: ${worstFrame.file}   visible px (a >= ${VIS}) ${worstFrame.before} -> ${worstFrame.after}`);
  console.error(`  The whole-directory number for this same run is only ${erasedPct.toFixed(3)}% (${erased} of ${visBefore} px),`);
  console.error(`  which is why the ${MAX_ERASE_PCT}% directory ceiling did not fire: ${files.length} intact frames average one`);
  console.error('  destroyed frame away. A feather that erases a frame is not a soft edge, it is a deletion.');
  console.error('  LIKELY CAUSE: on THAT frame the subject sits inside the band you named — a high-reaching');
  console.error('  pose under --top, a lunge or a thrown prop under --left/--right, a planted foot under');
  console.error('  --bottom. Open the frame before overruling anything.');
  console.error('  The worst legitimate frame measured anywhere in this repo loses 3.542% (9584 keyed frames');
  console.error('  x the 6 recorded 48px band shapes; nothing in that sweep exceeds 4%).');
  console.error('  THERE IS NO OVERRIDE, deliberately — see the header. Feather a narrower band, feather a');
  console.error('  different edge, or re-roll the clip so the subject is contained.');
  process.exit(1);
}

// ---------------------------------------------------------------------------------------------
// PASS 2 — WRITE. Only reached once every guard above has passed.
// ---------------------------------------------------------------------------------------------
let touched = 0;
for (const f of files) {
  const p = path.join(dir, f);
  const png = PNG.sync.read(fs.readFileSync(p));
  const { width: W, height: H, data: d } = png;
  let changed = false;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const na = rampedAlpha(d[i + 3], x, y, W, H);
      if (na === -1) continue;
      d[i + 3] = na;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, PNG.sync.write(png));
    touched += 1;
  }
}
console.log(`feathered ${touched}/${files.length} frames in ${dir} (bands top=${band.top} bottom=${band.bottom} left=${band.left} right=${band.right}; removed ${erased} of ${visBefore} visible px = ${erasedPct.toFixed(3)}%)`);
// REPORT THE PER-FRAME NUMBER ON SUCCESS TOO, not only on refusal. The directory percentage above
// is the number that read 0.038% while a frame was being wiped; printing the worst frame beside it
// is what lets scrollback tell those two runs apart. A quantity that is measured and only ever
// shown when it fails is a quantity nobody calibrates.
console.log(`  worst single frame: ${worstFrame.file}  ${worstFrame.before} -> ${worstFrame.after} visible px = ${worstFrame.pct.toFixed(3)}% (per-frame ceiling ${MAX_FRAME_ERASE_PCT}%)`);
