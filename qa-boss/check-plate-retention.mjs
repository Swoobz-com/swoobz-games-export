// PLATE-RETENTION GATE — did the chroma backdrop survive the key and end up INSIDE the
// visible silhouette?
//
// ############################################################################################
// # WHY THIS EXISTS. ir48 special_1 v5, 2026-07-29: key-idle-clips.mjs left 18.4% of the      #
// # OPAQUE pixels green-dominant. Every glowing charm shipped a thick opaque GREEN HALO,       #
// # invisible on the green plate and glaringly obvious the moment it was composited over the   #
// # dark stage. No existing gate could see it: containment measures EDGES, front-turn measures #
// # POSE, extra-objects measures BLOBS, body-commitment measures MOTION. None of them look at  #
// # whether the backdrop is still there.                                                       #
// #                                                                                             #
// # ROOT CAUSE: a big TRANSLUCENT effect. The backdrop seen THROUGH a glowing charm keys to a  #
// # DARKENED plate colour (measured r~70-108 g~141-155 b~62-84 vs the pure #00b140 screen)     #
// # which the tight global key misses, and the border-seeded flood fill cannot reach it        #
// # because the glow ring encloses it. FIX: scripts/green-neutralize.mjs (or magenta-          #
// # neutralize.mjs) as a MANDATORY pass. Measured 18.4% -> 0.00%.                              #
// ############################################################################################
//
// *** THE TRAP THIS TOOL ITSELF FELL INTO — READ BEFORE BELIEVING A RESULT ***
// The gate must test for the clip's OWN PLATE colour, not for green universally. ir56-lion-
// serpent is keyed from a MAGENTA plate and its character energy is legitimately GREEN, so a
// naive green test scored it 1.05% and looked like a defect. Tested for retained MAGENTA it is
// 0.00% — perfectly clean. ALWAYS resolve the plate from the character's clipdata `chroma`
// field (or its prompt's "solid saturated <COLOUR> chroma") before running this.
//
// ROSTER BASELINE — AND THE DOMAIN IT WAS MEASURED IN, WHICH IS THE HALF THAT WAS MISSING.
// (Phase 261 deleted this note while §8 below and the runtime DOMAIN WARNING both went on citing
// it by name, so `grep -i "roster baseline"` found two pointers and nothing to point at.)
// RE-MEASURED 2026-08-04 over every shipped special — AS WEBMS, i.e. the VIDEO domain: decoded at
// scale=240:-1, every 16th frame. ALL CLEAN, 0.00% retained plate on all 23:
//     eclipse-ofuda x3 · hollow-pale x4 · ir37-pink-tessen x3 · ir48-hex-paper-lord x3 ·
//     lady-kurotachi x3 · satoshi-odachi x4          -> 0.00% GREEN   (green plates)
//     ir56-lion-serpent x3                           -> 0.00% MAGENTA (magenta plate)
// Highest olive in the roster: satoshi-odachi-special_2_quake 1.08% (under the 2.00% bar).
// So this defect class is a FORWARD risk introduced by the dense signature effects, not
// pre-existing debt. ⚠ THESE ARE WEBM NUMBERS. Do not diff them against a FRAMES-DIR run — see §8,
// which shows the two domains disagreeing in BOTH directions.
//
// ============================================================================================
// THREE DEFECTS FIXED IN PHASE 261 (catalogued in qa-boss/TOOLCHAIN-AUDIT.md). Each one is a
// way this tool USED TO HAND BACK A GREEN LIGHT THAT WAS NOT TRUE.
//
// (§3) IT COULD NOT FAIL ON A WATCH. It printed `all clean.` and exited 0 while a clip sat in
//   the 1-5% WATCH band. Reproduced on qa-boss/keyed/kt-idle: the row said `3.73 ... WATCH`,
//   the summary line said `all clean.`, EXIT=0. Any `&&` chain or `$?` test read that as a
//   pass. THE EXIT CONTRACT IS NOW EXPLICIT AND IS PRINTED ON THE LAST LINE:
//       PASS  (exit 0) — every clip < 1.00% plate AND < 2.00% olive, and every clip actually
//                        had pixels to measure.
//       WATCH (exit 1) — some clip is in the 1.00-4.99% plate band. Retained plate IS present.
//                        This is not "clean". Override with --allow-watch (then exit 0, and
//                        the summary line still says WATCH, never "clean").
//       FAIL  (exit 1) — some clip is >= 5% plate (visible halo) or >= 2% olive (r==g).
//       ERROR (exit 2) — a target does not exist / a frames dir holds no .png / a frames dir
//                        holds more than one frame SIZE / a decode failed / --plate is missing /
//                        the system temp dir resolves inside the repo. NOTHING TRUSTWORTHY WAS
//                        MEASURED, so nothing passed. (A dir of 97 transparent frames used to
//                        read `0.00 ... clean`; a mixed-size dir used to read `FRAMES 200x200
//                        3f full ... clean` while measuring 1,001,600 px.)
//
// (§5) `--plate` DEFAULTED TO GREEN SILENTLY. It is now REQUIRED, exactly like
//   cut-bloom-plate.mjs. This measurement INVERTS on the wrong plate and the wrong answer is
//   the reassuring one. Measured on qa-boss/proc/tw-idle — the SAME bytes both times:
//       --plate green   -> 87.81% BAD   exit 1
//       --plate magenta ->  0.00% clean exit 0
//   MAGENTA-PLATE CHARACTERS: ir56-lion-serpent, onryo-katana, pale-choir. Everyone else in the
//   roster is green. A silent default on a plate-sensitive measurement is the exact shape of
//   the defect that deleted ir56's armour (TOOLCHAIN-AUDIT §1).
//
// (§8) THE NUMBER IS DOMAIN-DEPENDENT AND THE DOMAIN WAS NEVER PRINTED. A webm/mp4 target is
//   decoded at scale=240:-1 taking only every 16th frame, so it measures a RESAMPLED SUBSAMPLE —
//   a different pixel population, not a cheaper look at the same one.
//
//   *** THE DIRECTION IS NOT FIXED, AND PHASE 261 GOT IT WRONG. *** That first pass wrote "a thin
//   plate fringe is averaged away", i.e. the video number is always the lower one. That is only
//   one of the two things a downscale does to a saturated fringe. It DILUTES the fringe into
//   neutral neighbours (number goes down) — but it also SPREADS it, because the resample turns the
//   ring of pixels just outside the silhouette PARTLY transparent, and every one of those that
//   clears the A>24 visibility floor is counted as a NEW visible pixel carrying blended plate
//   colour (number goes up). Which effect wins is a property of the CONTENT, not of the sampling.
//   Measured on this machine 2026-08-04 — same content, FRAMES-DIR -> the same content as a webm:
//       keyed/sy-idle          thin edge fringe      0.11% ->  0.00%   collapses
//       keyed/ir48-s1-v5       broad interior halo  13.09% -> 10.61%   barely moves
//       synthetic 960x960 subject with a 2px PURE-PLATE fringe, transparent surround carrying
//         ... black rgb                              1.42% ->  1.14%   DOWN
//         ... the plate rgb (what a keyer that only zeroes alpha leaves behind)
//                                                    1.42% ->  3.53%   *** UP, 2.5x ***
//   The last two are the same subject, the same fringe and the same encode; only the RGB under
//   the fully-transparent pixels differs, and that alone flips the direction. So there is no
//   correction factor and no safe direction: a webm number can be a false CALM or a false ALARM.
//   The ROSTER BASELINE note above is a WEBM number; FIRE-PLAN's mandatory pre-check measures a
//   FRAMES DIR. Comparing the two reads a regression (or an all-clear) that is not there.
//   FIX: every row and the summary line now name the DOMAIN and the SCALE, so the two numbers can
//   never be silently compared. The measurement itself is UNCHANGED.
//
// TWO MORE FOUND WHEN PHASE 261 WAS ATTACKED (fixed here, same session):
//
// (a) THE NEW DOMAIN COLUMN COULD PRINT A FALSE FACT. w/h were captured from the FIRST frame only
//   and stamped on the whole target, so a dir of two 200x200 frames plus one 960x960 printed
//   `FRAMES 200x200 3f full ... 1001600 ... clean` and EXITED 0 — a pixel count three 200x200
//   frames cannot reach. Mixed dimensions are now detected, named (`!! DIMS`), and treated as an
//   INPUT error (exit 2) exactly as cmp-alpha.mjs treats them. Swept every frames dir under
//   qa-boss/keyed (82 dirs holding png, 7,752 png, IHDR only): NOT ONE is mixed, so this cannot
//   fire on a real clip dir. It DOES fire on qa-boss/proc/<char> and qa-boss/frames/* — those hold
//   montages and per-state proof stills, and averaging a plate % over them was never meaningful.
//
// (b) LATENT REPO WRITE — see the tmpRoot() comment below. `process.env.TEMP || HERE` meant a
//   machine without $TEMP unpacked decoded video frames into qa-boss/ itself.
// ============================================================================================
//
// USAGE
//   node qa-boss/check-plate-retention.mjs --plate green   <clip.webm|frames-dir> ...
//   node qa-boss/check-plate-retention.mjs --plate magenta <clip.webm|frames-dir> ...
//   ... [--allow-watch]   accept the 1-5% band as a pass (exit 0); the word WATCH still prints.
// Thresholds: plate >=5% BAD (visible halo) · 1-5% WATCH · <1% clean.
// olive (neutralizer artifact) >=2% BAD — fix by LOWERING green-neutralize HARD (default 32);
// HARD=4 took ir48 special_1 from 7.02% olive to 1.06% with residual green still 0.00%.
//
// ============================================================================================
// ⛔ THREE MORE, FOUND BY AN ADVERSARIAL SWEEP AND CLOSED IN PHASE 264. This tool takes NO
// numeric argument, so it has no threshold to disarm — every one of its doors is a FLAG.
//
// (1) `--allow-watch` IS AN OFF SWITCH AND IT ANNOUNCED ITSELF ONLY AT THE BOTTOM OF STDOUT.
//     MEASURED on qa-boss/keyed/kt-idle (3.73% retained plate, a real detection):
//       $ check-plate-retention --plate green qa-boss/keyed/kt-idle              -> EXIT 1
//         RESULT: WATCH — 1 clip(s) in the 1-5% band. RETAINED PLATE IS PRESENT. ...
//       $ ... --allow-watch                                                      -> EXIT 0
//     Nothing reached STDERR in either run, so in a `&&` chain and in a log tailed for errors
//     the two are indistinguishable. It now goes through argcheck's offSwitch(), which prints
//     "⚠ this run CANNOT FAIL" on BOTH streams, up front, before a single row.
//
// (2) AN UNKNOWN FLAG WAS SILENTLY DROPPED. `targets = argv.filter(a => !a.startsWith('--'))`
//     threw away anything with a `--` that this file did not name — so `--alow-watch` ran a
//     STRICT gate while the operator believed the band was accepted, and any future flag typo
//     reads as "the flag did nothing". A.done() refuses it by name.
//
// (3) A REPEATED `--plate` TOOK THE FIRST AND INVERTED THE MEASUREMENT IN SILENCE. Measured:
//       $ ... --plate magenta --plate green qa-boss/keyed/kt-idle
//         keyed/kt-idle  FRAMES 840x834 97f full  0.00  0.00  ...  clean       <- the row is a
//     lie: those are dirty GREEN frames and they read 3.73% under --plate green. The run only
//     exited 2 because the second value, "green", was then read as a nonexistent TARGET —
//     i.e. the exit code was right by accident and the table was wrong on purpose. argcheck
//     refuses a duplicate flag by name, and consumes each flag's value by INDEX so a value can
//     never be demoted to a target.
// ============================================================================================
import { makeArgs } from './lib/argcheck.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const require = createRequire(path.join(HERE, '..', 'noop.js'));
const { PNG } = require('pngjs');

// ---------------------------------------------------------------------------------------------
// WHERE A DECODED VIDEO IS UNPACKED. This used to be
//     path.join(process.env.TEMP || HERE, 'pr_' + basename)
// and HERE is qa-boss/ — so on any machine or CI runner WITHOUT $TEMP, the gate wrote its decoded
// scratch frames INTO THE ASSET TREE IT EXISTS TO AUDIT. Proven 2026-08-04 by running this exact
// file (relocated, one line patched) with TEMP and TMP unset: it created 20 `pr_*` directories
// beside itself. It cleans them up on the way out, so a green run hides it completely.
// os.tmpdir() has no such fallback, and mkdtempSync additionally stops two parallel runs on one
// clip from sharing (and rm-ing) a single fixed directory name.
// os.tmpdir() DOES still honour $TEMP/$TMPDIR, so a temp var pointed inside the repo would put us
// straight back — that is refused below, BEFORE anything is created. To trip it deliberately:
//     TEMP=<repo>/qa-boss node qa-boss/check-plate-retention.mjs --plate green <clip.webm>
let _tmpRoot = null;
function tmpRoot() {
  if (_tmpRoot) return _tmpRoot;
  const root = path.resolve(os.tmpdir());
  const rel = path.relative(REPO, root);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
    console.error(`ERROR: the system temp dir resolves INSIDE this repo — refusing to run.`);
    console.error(`         temp: ${root}`);
    console.error(`         repo: ${REPO}`);
    console.error('       Decoding a VIDEO target would unpack scratch frames into the asset tree, and the');
    console.error('       asset tree is irreplaceable. Point TEMP/TMPDIR outside the repo and re-run.');
    console.error('       NOTHING WAS MEASURED.');
    process.exit(2);
  }
  _tmpRoot = root;
  return root;
}

// Bands — UNCHANGED from the pre-phase-261 tool. Only what they DO to the exit code changed.
const PLATE_BAD = 5;
const PLATE_WATCH = 1;
const OLIVE_BAD = 2;

// VIDEO-domain sampling. These two constants BUILD the ffmpeg filter string below, so the
// domain label printed on a VIDEO row can never drift from what was actually measured.
const VID_STRIDE = 16;   // only every Nth frame is decoded
const VID_SCALE_W = 240; // ... and it is downscaled to this width first

const argv = process.argv.slice(2);
const USAGE = 'usage: node qa-boss/check-plate-retention.mjs --plate green|magenta <clip.webm|framesDir> ... [--allow-watch]';
const A = makeArgs(argv, { tool: 'check-plate-retention', usage: USAGE });
// NO DEFAULT PLATE, DELIBERATELY. See §5 in the header: the same bytes read 87.81% BAD as green
// and 0.00% clean as magenta, and the silent default handed you the reassuring one. `required`
// makes the absence fatal; `oneOf` makes a mistyped value fatal instead of a silent fall-through;
// and argcheck consumes the value by INDEX, so a target whose name happens to be "green" is safe
// and a REPEATED --plate is refused rather than silently resolved to the first.
const PLATE = A.str('--plate', null, {
  oneOf: ['green', 'magenta'],
  required: true,
  why: 'This measurement INVERTS on the wrong plate, and the wrong answer is the calm one:\n'
    + '  on qa-boss/proc/tw-idle (dirty GREEN frames) --plate green reads 87.81% BAD / exit 1\n'
    + '  and --plate magenta reads 0.00% "all clean" / exit 0 — same bytes, opposite verdict.\n'
    + '  A silent green default on a plate-sensitive measurement is the exact shape of the\n'
    + "  defect that deleted 28% of ir56-lion-serpent's armour while every gate stayed green.\n"
    + '  MAGENTA-PLATE CHARACTERS: ir56-lion-serpent, onryo-katana, pale-choir.\n'
    + '  (pale-choir is one of the six MK FINAL kits queued to fire next.) All others: green.\n'
    + '  Confirm a kit before running:\n'
    + '    node qa-boss/build-prompt.mjs qa-boss/prompts/<kit>.md idle | grep -oiE "solid saturated [A-Z]+"',
});
// AN OFF SWITCH THAT ANNOUNCES ITSELF ON BOTH STREAMS. It converts a real detection (WATCH, exit 1)
// into exit 0, and it used to say so only on the last line of STDOUT — invisible to a `&&` chain and
// to anyone reading stderr. offSwitch() states it up front, on stdout AND stderr, before any row.
const ALLOW_WATCH = A.offSwitch('--allow-watch',
  'the 1.00-4.99% WATCH band is ACCEPTED as a pass, so a clip with retained plate in it exits 0');
const targets = A.positionals();
A.done();
if (!targets.length) { console.error(USAGE); process.exit(2); }

// Resolved (and validated) ONCE, up front, so an unsafe scratch location refuses BEFORE the table
// starts printing rather than half-way down a run — and only when a VIDEO target is actually
// present, because a frames-dir-only run never needs scratch space at all. tmpRoot() memoises, so
// the call in sample() below is the same answer, not a second chance to disagree.
if (targets.some((t) => { try { return !fs.statSync(t).isDirectory(); } catch { return false; } })) tmpRoot();

const isPlate = PLATE === 'magenta'
  ? (r, g, b) => r > 90 && b > 90 && r > g + 30 && b > g + 30
  : (r, g, b) => g > 90 && g > r + 30 && g > b + 30;

// *** RUN THIS BEFORE green-neutralize, NOT AFTER — READ THIS OR THE RESULT IS MEANINGLESS ***
// green-neutralize pulls G down to max(R,B), so AFTER it runs g <= max(r,b) BY CONSTRUCTION and
// isPlate() can never fire. A post-neutralize 0.00% is a TAUTOLOGY, not evidence. Caught 2026-07-29
// on ir48 special_2 v4: the gate said 0.00% while the flame tips were plainly CHARTREUSE on screen.
//
// SECOND SIGNAL — THE NEUTRALIZER FINGERPRINT. green-neutralize sets G := max(R,B), so a pixel
// that WAS green-contaminated comes out with r EXACTLY EQUAL TO g and b well below. At low
// brightness that renders as sickly OLIVE/khaki. Measured on the charm rims of ir48 special_1:
// 164,164,77 · 152,152,65 · 142,142,77 — all exactly r==g.
//
// The discriminator matters and my first attempt got it WRONG. Legitimate warm GOLD is r > g > b
// (247,200,121), so a test of "g >= r - 20" catches gold too and fired on a perfectly good clip.
// Requiring |r-g| <= 2 isolates the artifact: no natural material lands exactly on r==g at scale.
// Only DARK ones (g < 190) read as olive — bright r==g is just a yellow highlight and is fine.
const isNeutralizerOlive = (r, g, b) =>
  PLATE === 'green' && Math.abs(r - g) <= 2 && b < g - 40 && g > 100 && g < 190;

function sample(target) {
  if (!fs.existsSync(target)) return { error: 'NO SUCH PATH — nothing measured' };
  let dir = target, tmp = null, kind = 'FRAMES-DIR';
  if (!fs.statSync(target).isDirectory()) {
    kind = 'VIDEO';
    // Guaranteed outside the repo (see tmpRoot above) and unique per run.
    // An UNUSABLE temp root is an environment error, not a plate defect. Unwrapped, this threw an
    // unhandled stack trace and exited **1** — and in this repo 1 means "a real detected failure",
    // so `TEMP=Z:\no\such\place` read exactly like a clip with a green halo. Reproduced 2026-08-04.
    try {
      tmp = fs.mkdtempSync(path.join(tmpRoot(), 'plate-retention-'));
    } catch (e) {
      console.error(`\nERROR: cannot create a scratch dir under ${tmpRoot()} — ${e.code || e.message}`);
      console.error('       A VIDEO target has to be decoded somewhere. Point TEMP/TMPDIR at a writable');
      console.error('       directory outside the repo and re-run. NOTHING WAS MEASURED.');
      process.exit(2);
    }
    const pre = /\.webm$/i.test(target) ? ['-c:v', 'libvpx-vp9'] : [];
    const vf = `select='not(mod(n\\,${VID_STRIDE}))',scale=${VID_SCALE_W}:-1`;
    const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...pre, '-i', target,
      '-vf', vf, '-vsync', '0', path.join(tmp, 'f_%03d.png')],
      { encoding: 'utf8' });
    if (r.status !== 0) { fs.rmSync(tmp, { recursive: true, force: true }); return { error: 'DECODE FAILED — nothing measured' }; }
    dir = tmp;
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  // A gate that measured ZERO frames must never report a pass — that is the phase-230 /
  // TOOLCHAIN-AUDIT §4 class. An empty dir used to print `0.00  0.00  0  clean` and exit 0.
  if (!files.length) {
    if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
    return { error: kind === 'VIDEO' ? 'DECODED 0 FRAMES — nothing measured' : 'NO .png FRAMES IN DIR — nothing measured' };
  }
  let plate = 0, hue = 0, opaque = 0, w = 0, h = 0, mixed = null;
  for (const fn of files) {
    const p = PNG.sync.read(fs.readFileSync(path.join(dir, fn)));
    // THE DOMAIN COLUMN USED TO BE A GUESS FROM FRAME 0, STAMPED ON THE WHOLE TARGET. A dir of two
    // 200x200 frames plus one 960x960 printed `FRAMES 200x200 3f full` beside an opaquePx of
    // 1,001,600 — a count three 200x200 frames cannot physically produce (max 120,000). The stated
    // domain was not the measured one, and the row still said `clean` and exited 0.
    // cmp-alpha.mjs makes the same call on `!! DIMS`: a dimension mismatch is an INPUT error, not a
    // verdict. Recorded here, reported as ERROR (exit 2) at the print site.
    if (!w) { w = p.width; h = p.height; }
    else if (!mixed && (p.width !== w || p.height !== h)) {
      mixed = `${w}x${h} (${files[0]}) vs ${p.width}x${p.height} (${fn})`;
    }
    const d = p.data;
    for (let i = 0; i < p.width * p.height; i++) {
      const k = i * 4, R = d[k], G = d[k + 1], B = d[k + 2], A = d[k + 3];
      if (A <= 24) continue;
      opaque++;
      if (isPlate(R, G, B)) plate++;
      if (isNeutralizerOlive(R, G, B)) hue++;
    }
  }
  if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
  // Frames existed but not one visible pixel — a fully transparent clip. 0/0 is not 0.00% clean.
  if (!opaque) return { error: `0 VISIBLE PX across ${files.length} frame(s) — nothing measured` };
  return { kind, w, h, mixed, frames: files.length, pct: 100 * plate / opaque, huePct: 100 * hue / opaque, opaque };
}

// The domain label. FRAMES-DIR is the full-fidelity domain; VIDEO is a downscaled subsample and
// says so on every row, because its number is NOT comparable to a FRAMES-DIR number (§8).
// A target whose frames are not all one size has no single resolution to name, and says THAT.
const domainLabel = (r) => r.mixed
  ? `${r.kind === 'VIDEO' ? 'VIDEO' : 'FRAMES'} !!MIXED-DIMS ${r.frames}f`
  : r.kind === 'VIDEO'
    ? `VIDEO ${r.w}x${r.h} ${r.frames}f 1/${VID_STRIDE}`
    : `FRAMES ${r.w}x${r.h} ${r.frames}f full`;

const SEP = '-'.repeat(118);
console.log(`plate=${PLATE}`);
console.log('clip'.padEnd(52) + 'domain'.padEnd(26) + 'plate%  olive%   opaquePx   verdict');
console.log(SEP);

let nBad = 0, nWatch = 0, nErr = 0, nClean = 0;
const kinds = new Set();
for (const t of targets.sort()) {
  const r = sample(t);
  const name = path.basename(path.dirname(t)) + '/' + path.basename(t);
  if (r.error) { console.log(name.padEnd(52) + 'ERROR'.padEnd(26) + r.error); nErr++; continue; }
  // MIXED DIMENSIONS = INPUT ERROR, the call cmp-alpha.mjs makes on `!! DIMS`. The percentage is an
  // average over frames of different sizes and there is no single resolution to print, so the row
  // cannot be believed even though pixels were counted. The numbers print anyway, as evidence.
  // Not added to `kinds`: this target has no statable domain, so it must not colour the summary.
  if (r.mixed) {
    console.log(name.padEnd(52) + domainLabel(r).padEnd(26)
      + r.pct.toFixed(2).padStart(6) + '   ' + r.huePct.toFixed(2).padStart(5)
      + '   ' + String(r.opaque).padStart(8) + '   ERROR  frames are not all one size');
    console.log(`    !! DIMS ${r.mixed}`);
    console.log('       A real clip dir is dimensionally uniform, so this target holds frames from more than');
    console.log('       one take. The % above averages incompatible frames and the domain cannot be stated.');
    nErr++; continue;
  }
  kinds.add(r.kind);
  const v = r.pct >= PLATE_BAD ? 'BAD  plate halo - run the neutralize pass'
    : r.huePct >= OLIVE_BAD ? 'BAD  OLIVE residue (r==g) - translucent effect blended with the plate; lower green-neutralize HARD'
      : r.pct >= PLATE_WATCH ? 'WATCH  retained plate IS present - NOT clean'
        : 'clean';
  if (r.pct >= PLATE_BAD || r.huePct >= OLIVE_BAD) nBad++;
  else if (r.pct >= PLATE_WATCH) nWatch++;
  else nClean++;
  console.log(name.padEnd(52) + domainLabel(r).padEnd(26)
    + r.pct.toFixed(2).padStart(6) + '   ' + r.huePct.toFixed(2).padStart(5)
    + '   ' + String(r.opaque).padStart(8) + '   ' + v);
}
console.log(SEP);

// The domain phrase that goes on the summary line, so a frames-dir number and a webm number can
// never be lifted out of scrollback and compared as if they meant the same thing (§8).
const domain = kinds.size === 0 ? 'domain=NONE (nothing measured)'
  : kinds.size > 1 ? `domain=MIXED (FRAMES-DIR + VIDEO) - THESE ROWS ARE NOT COMPARABLE TO EACH OTHER`
    : kinds.has('VIDEO')
      ? `domain=VIDEO (decoded at scale=${VID_SCALE_W}:-1, every ${VID_STRIDE}th frame)`
      : 'domain=FRAMES-DIR (native PNG resolution, every frame)';

if (kinds.has('VIDEO')) {
  console.log(`! DOMAIN WARNING — a VIDEO number is NOT comparable to a FRAMES-DIR number.`);
  console.log(`  VIDEO targets are decoded at scale=${VID_SCALE_W}:-1, every ${VID_STRIDE}th frame — a RESAMPLED SUBSAMPLE,`);
  console.log('  not a cheaper look at the same pixels. THE DIRECTION OF THE GAP IS NOT FIXED: the downscale');
  console.log('  DILUTES a fringe into its neighbours, but it also SPREADS one, because the resample makes the');
  console.log('  ring just outside the silhouette partly transparent and every such pixel over the A>24 floor');
  console.log('  counts as NEW visible plate-tinted area. Which wins is a property of the CONTENT. Measured here,');
  console.log('  same content, FRAMES-DIR -> as a webm:');
  console.log('    keyed/sy-idle 0.11% -> 0.00%   ·   keyed/ir48-s1-v5 13.09% -> 10.61%      (down)');
  console.log('    960x960 subject, 2px pure-plate fringe, transparent surround carrying the plate rgb:');
  console.log('                  1.42% -> 3.53%                                              (UP, 2.5x)');
  console.log('  So a webm number can be a false CALM or a false ALARM. There is no correction factor.');
  console.log("  This file's ROSTER BASELINE note (top of the source, 23 shipped specials 0.00%) is itself a");
  console.log("  WEBM number; FIRE-PLAN's mandatory pre-check measures a FRAMES DIR. Re-measure in ONE domain.");
}

// EXIT CONTRACT — printed, not implied. 2 = could not measure · 1 = a real detection · 0 = pass.
if (nErr) {
  console.log(`RESULT: ERROR — ${nErr} target(s) could not be measured, ${nBad} BAD, ${nWatch} WATCH, ${nClean} clean · plate=${PLATE} · ${domain}`);
  console.log('  Nothing was certified. Fix the paths / decode and re-run.');
  process.exit(2);
}
if (nBad) {
  console.log(`RESULT: FAIL — ${nBad} clip(s) need the neutralize pass, ${nWatch} at WATCH, ${nClean} clean · plate=${PLATE} · ${domain}`);
  process.exit(1);
}
if (nWatch) {
  console.log(`RESULT: WATCH — ${nWatch} clip(s) in the ${PLATE_WATCH}-${PLATE_BAD}% band. RETAINED PLATE IS PRESENT. THIS IS NOT CLEAN. (${nClean} clean) · plate=${PLATE} · ${domain}`);
  if (!ALLOW_WATCH) {
    console.log(`  Exiting 1. Look at the WATCH row(s) before shipping; re-run with --allow-watch to accept the band.`);
    process.exit(1);
  }
  console.log('  --allow-watch given: exiting 0. The band was ACCEPTED, not cleared.');
  process.exit(0);
}
console.log(`RESULT: PASS — ${nClean} clip(s) all clean (<${PLATE_WATCH.toFixed(2)}% plate, <${OLIVE_BAD.toFixed(2)}% olive) · plate=${PLATE} · ${domain}`);
process.exit(0);
