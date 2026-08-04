// CONTAINMENT gate — does any part of the character, his weapon or his effect touch a frame edge?
//
// This is the check that the CHARACTER<->PROMPT COHERENCE GATE cannot do: coherence reads the
// PROMPT, this reads the PIXELS. Prompts assert "stays fully inside the frame with a wide margin";
// only this proves it. Shipped defects it is built to catch:
//   - hollow-pale ko  : a 212px right-edge slice on the HELD prone pose
//   - hollow-pale sp3 : an opaque top-edge slab
//   - hollow-pale sp1 : the crescent arc crossing the TOP-RIGHT edge f38-54 ("v2 queued")
//   - eclipse strike_b: sustained ~0.7s horizontal cut running off the left edge
//
// TWO CRITICAL DETAILS
// 1. `-c:v libvpx-vp9` MUST come BEFORE `-i` for .webm or ffmpeg silently drops the alpha plane and
//    every clip measures as clean (the alpha trap recorded in the handoff).
// 2. The BOTTOM edge is expected to touch — feet are planted on the floor line. It is measured and
//    printed but never counts as a defect. Only TOP / LEFT / RIGHT do.
//
// Subject detection:
//   .webm (keyed) -> alpha plane via alphaextract; subject = alpha > ALPHA_MIN
//   .mp4  (raw)   -> chroma plate still present; subject = "not green" (or --plate magenta)
//
// ############################################################################################
// # ⛔ IT USED TO REPORT "scanned 1" FOR N FILE ARGUMENTS (TOOLCHAIN-AUDIT §4, fixed phase 261)#
// #                                                                                           #
// # THE DEFECT. `const target = argv[0]` … `files = [target]`. Every argument after the first  #
// # was DISCARDED without a word. Handed three clips it printed `scanned 1 | clean 1 | over    #
// # threshold 0` and exited 0 — a full green light while two clips carrying real defects       #
// # (hollow-pale special LEFT 18px, attack-block-b RIGHT 16px) were never opened. HANDOFF      #
// # §3.3 and FIRE-PLAN's "Standing verification discipline" both carry the workaround "loop    #
// # one file at a time or you are reporting a pass for unexamined clips".                       #
// #                                                                                           #
// # WHY HANDLE N RATHER THAN REFUSE N. The run-book's real call sites are a DIRECTORY          #
// # (CONTAINMENT-TRIAGE.md:80 `public/assets/characters/<char>/ --min 1`, and `qa-boss/webm`)  #
// # and a shell GLOB, which expands to N files. Directory mode was ALREADY an N-file scan —    #
// # the per-file loop, the ranking and the summary all handled N correctly. Only the argument  #
// # expansion was capped at one, so refusing N would have outlawed the glob form while the     #
// # identical work already ran fine from a directory. The fix is the expansion, nothing else.  #
// #                                                                                           #
// # `scanned N` NOW EQUALS THE NUMBER OF CLIPS RESOLVED FROM ALL ARGUMENTS, and the inputs     #
// # line shows each argument's expansion so the denominator is visible BEFORE the scan. The    #
// # guards that actually catch an unmeasured clip are: a missing path (exit 2), zero resolved  #
// # clips (exit 2), and a clip that failed to decode (exit 1). A handed-but-unmeasured clip    #
// # must never read as clean.                                                                  #
// #                                                                                           #
// # ⚠ NO `rows.length === files.length` ASSERTION — phase 262 removed it. It read as the      #
// # safety net and could not fire: `rows` takes exactly one push per entry of `files` in a     #
// # plain for-loop, so the two are equal by construction. Proven, not assumed: a directory of  #
// # 4 clips where 3 were undecodable (empty webm, truncated webm, text file named .mp4) still  #
// # printed `scanned 4 | errored 3` — the assert stayed silent and the ERRORED guard is what   #
// # produced the non-zero exit. A check that cannot fail is a claim of safety, not safety.     #
// #                                                                                           #
// # ⚠ THE DECODE IS UNTOUCHED. `-c:v libvpx-vp9` still comes BEFORE `-i` (the audit's "WHAT IS #
// # SOUND" entry for this tool). Single-clip numbers are byte-for-byte what they were.         #
// ############################################################################################
//
// Usage:
//   node scripts/check-containment.mjs qa-boss/webm                 # whole dir
//   node scripts/check-containment.mjs qa-boss/raw/foo.mp4          # one raw clip
//   node scripts/check-containment.mjs a.webm b.webm c.webm         # N clips, all scanned
//   node scripts/check-containment.mjs <path...> [--min 6] [--plate green|magenta] [--scale 480]
//
// Flag values are VALIDATED, because an unparseable or uncrossable threshold turns this gate into a
// green light over unexamined clips (see the disarmed-threshold block below):
//   --min N     whole number 1..504, AND not larger than the frame of any clip scanned, AND not
//               large enough to have hidden a clip the DEFAULT --min 6 would have caught
//   --scale N   whole number 64..1920
//   --plate S   green | magenta (LOWER CASE — see the note at the PLATE declaration; it used to
//               lower-case the value for you, and that convenience is gone as of phase 264)
// A bad value, a missing value, an unknown flag or a flag repeated twice exits 2 naming it.
//
// Exit code 1 if any clip exceeds --min on a TOP/LEFT/RIGHT edge, so it can gate a ship step.
// Exit code 2 if the run could not be trusted at all: a bad flag, an unopenable path, zero resolved
// clips, a threshold no edge of a scanned clip could ever cross, or a --min that SUPPRESSED a clip
// the calibrated default would have caught.
import { makeArgs } from '../qa-boss/lib/argcheck.mjs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const USAGE = 'usage: node scripts/check-containment.mjs <file|dir> [more...] [--min N] [--plate green|magenta] [--scale N]';

// ##############################################################################################
// # ⛔ A DISARMED THRESHOLD MEASURES PLENTY AND CONCLUDES NOTHING (fixed phase 263)             #
// #                                                                                            #
// # `Number(opt('--min', 6))` was unchecked. On a clip with a 216px LEFT slice (baseline: TOP   #
// # 48px @f54 | LEFT 216px @f52 | RIGHT 28px @f4, exit 1) FOUR argument shapes each returned    #
// # `scanned 1 | clean 1 | over threshold 0` and EXIT 0 — a full green light over a measured,   #
// # decoded, obviously-broken clip:                                                             #
// #   --min zzz     -> "threshold: NaNpx"      (NaN comparisons are always false)               #
// #   --min         -> "threshold: NaNpx"      (no value; Number(undefined))                    #
// #   --min 999999  -> "threshold: 999999px"   (a number Number() loves and physics can't cross)#
// #   --min 1e999   -> "threshold: Infinitypx" (finite-looking literal, infinite value)         #
// # and a fifth on the OTHER numeric flag, which the audit had assumed was covered by luck:     #
// #   --scale -5    -> k = srcW/-5 is NEGATIVE, so every run reports as a negative px count,    #
// #                    nothing can reach MIN, and the gate prints `clean 1` and exits 0.        #
// # (`--scale zzz` really is caught by luck alone — ffmpeg rejects `scale=NaN`. `--scale 0`     #
// #  divides by zero and prints "Infinitypx"; `--scale 1` reports 960px on every edge of every  #
// #  clip. Loud, but garbage — none of it was a guard.)                                         #
// #                                                                                            #
// # THREE LAYERS, because the argv rail alone is the fix that was already made once and lost:   #
// #  1. ARGV: every numeric flag must be a finite INTEGER inside a MEASURED range, every flag   #
// #     value must exist, every enum value must be in the enum, no flag may be given twice, and #
// #     no unknown flag may be dropped. All of it now lives in qa-boss/lib/argcheck.mjs — the   #
// #     ONE validator every gate imports — because the previous round of this fix wrote a       #
// #     private copy per tool and the class survived in the tools that round did not own.       #
// #  2. VERDICT: the rail's upper bound is a guess about frame size; the per-clip guard in      #
// #     scanClip() is not. A TOP run cannot exceed the frame WIDTH and a LEFT/RIGHT run cannot  #
// #     exceed the frame HEIGHT, so a MIN above either is an edge that CANNOT be reported over. #
// #     Such a clip is refused (exit 2) and never counted as clean.                             #
// #  3. SUPPRESSION (phase 264): neither of the above catches an IN-BAND --min that happens to  #
// #     sit above every real slice in THIS run. MEASURED, and reported by the adversarial       #
// #     sweep:                                                                                  #
// #       $ node scripts/check-containment.mjs public/assets/characters/satoshi-odachi --min 505#
// #         threshold: 505px contiguous on TOP/LEFT/RIGHT, measured in source pixels            #
// #         scanned 13  |  clean 13  |  over threshold 0  |  errored 0            <- EXIT 0     #
// #     while the SAME 13 clips at the default --min 6 are `clean 3 | over threshold 10`, exit  #
// #     1, led by `special-c.webm LEFT 504px @f52`. 505 is in [1, 4096] and BELOW the 960x916   #
// #     frame, so layers 1 and 2 both pass it — the frame guard only fires above the SMALLEST   #
// #     frame dimension in the run, which for a per-character call is 756-960px. So the run is  #
// #     re-derived at the CALIBRATED DEFAULT and refused if the supplied --min turned an OVER   #
// #     clip into a clean one. It needs no judgement about where a threshold stops meaning      #
// #     something: it asks only whether this run HID something the default would have caught.   #
// #     `--min 1` (the documented triage value) is STRICTER than the default, so it can never   #
// #     trip it, and with no --min at all the check is skipped entirely.                        #
// ##############################################################################################
const USAGE_HINT = USAGE;
const A = makeArgs(argv, { tool: 'check-containment', usage: USAGE_HINT });

// THE CALIBRATED DEFAULT, named because it is now used twice: as the fallback, and as the reference
// the supplied --min is re-derived against in the suppression check below.
const DEFAULT_MIN = 6;
// contiguous px on an edge before it counts.
// ⚠ THE UPPER BOUND IS MEASURED, NOT REASONED (phase 264). It used to be 4096 — a number chosen to
// be "past any frame", which is exactly the hole `--min 505` walked through. Re-derived by scanning
// all 118 SHIPPED clips at --min 1 and taking the loudest edge run anywhere in the roster:
//     satoshi-odachi/special-c.webm  LEFT 504px @f52     <- the largest overrun on disk
//     ir56-lion-serpent/special-c    RIGHT 438px @f59
//     ir56-lion-serpent/special-b    RIGHT 364px @f29 · satoshi-odachi/special-b TOP 348px @f54
// So --min 504 can still convict exactly one real clip and --min 505 can convict NOTHING in this
// repo — measured, not assumed: at 505 the whole satoshi kit reports `clean 13`, exit 0.
const MIN = A.num('--min', DEFAULT_MIN, {
  min: 1, max: 504, integer: true,
  band: 'a threshold below 1 flags every clip; one above 504 cannot be crossed by any clip in this repo — '
    + 'the loudest edge run on all 118 shipped clips is 504px (satoshi-odachi/special-c.webm LEFT @f52), so '
    + 'at 505 every clip reports CLEAN and the gate cannot fail. Real use is --min 1 (triage) or --min 6 '
    + '(ship gate). A value between the two is checked again after the scan — see the SUPPRESSION layer.',
});
// analyse at this width; runs are reported in SOURCE px via k = srcW/SCALE, so SCALE must be a
// positive integer or k is negative/Infinity and the reported numbers are fiction.
// ⚠ ALSO MEASURED (phase 264). Swept on the SMALLEST known overrun — satoshi-odachi/attack-block.webm,
// TOP 32px RIGHT 10px at the default scale — because if any --scale can hide anything it is that one:
//     scale  64 -> TOP 45 LEFT 30 RIGHT 30 · 96 -> 40/20/20 · 120 -> 40/8/16 · 240 -> 36/-/8
//     scale 480 -> TOP 32 RIGHT 10 (default) · 960 -> 32/8 · 1920 -> 32/8      ALL EXIT 1
// A coarse scale INFLATES a short run (a quantised sample becomes a whole k-pixel block) and a fine
// one converges on the true source number, so no value in the band disarms it. 1920 is the largest
// VERIFIED value; 4096 was never run and is no longer accepted on the strength of not being tried.
const SCALE = A.num('--scale', 480, {
  min: 64, max: 1920, integer: true,
  band: 'runs are scaled back to source px by srcW/SCALE. A negative SCALE makes every measurement negative '
    + '(nothing can ever exceed the threshold); 0 makes it Infinity; a tiny SCALE quantises a whole edge into '
    + 'one pixel. Measured at 64/96/120/240/480/960/1920 on the smallest known overrun, every one still '
    + 'convicts; 1920 is the largest value verified, so the band ends there.',
});
// ⚠ NO LONGER CASE-INSENSITIVE (phase 264): the shared validator compares the value exactly, so
// `--plate MAGENTA` is now REFUSED (exit 2) where it used to be lower-cased and accepted. That is a
// deliberate loss of convenience for one shared door — and the refusal is the safe direction: the
// silent-wrong-plate defect this guard exists for (ANCHOR-BUDGETS.md §trap 1) is an exit 0, never an
// exit 2. Type it lower case.
const PLATE = A.str('--plate', 'green', {
  oneOf: ['green', 'magenta'],
  why: 'The plate colour decides which pixels count as SUBJECT. Getting it wrong inverts the test and every '
    + 'number is meaningless. Lower case only.',
});
const ALPHA_MIN = 40;

// EVERY positional is a target, not just argv[0]. argcheck has already consumed each flag WITH its
// value, so `--min 6` can never become a path, and done() is a hard stop on an unknown flag — a
// typo'd flag used to fall through to the target list and then die in statSync, or worse, silently
// keep a default.
const targets = A.positionals();
A.done();
if (!targets.length) { console.error(USAGE); process.exit(2); }

const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;
const isMagenta = (r, g, b) => r > 90 && b > 40 && g < r - 40 && g < b + 20;

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', file], { encoding: 'utf8' });
  const m = (r.stdout || '').trim().match(/(\d+)x(\d+)/);
  return m ? { w: +m[1], h: +m[2] } : null;
}

// Longest contiguous run of `true` along a scanline — a single stray keying crumb is not a slice.
function longestRun(get, n) {
  let best = 0, cur = 0;
  for (let i = 0; i < n; i++) {
    if (get(i)) { cur++; if (cur > best) best = cur; } else cur = 0;
  }
  return best;
}

function scanClip(file, tmpDir) {
  const dim = probe(file);
  if (!dim) return { file, error: 'ffprobe failed' };
  const srcW = dim.w;
  // THE VERDICT GUARD, not an argv rail. A TOP run is at most the frame WIDTH and a LEFT/RIGHT run
  // is at most the frame HEIGHT. If MIN is above either, that edge can NEVER be reported over for
  // this clip: it would be decoded, measured, found broken, and printed as clean. Refuse before the
  // decode. The rail above is a guess about frame size; these are the frame's actual numbers.
  if (MIN > dim.w || MIN > dim.h) return { file, disarmed: { w: dim.w, h: dim.h } };
  const isWebm = /\.webm$/i.test(file);

  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  // NOTE the decoder flag position — before -i, or alpha is dropped.
  const pre = isWebm ? ['-c:v', 'libvpx-vp9'] : [];
  const vf = isWebm
    ? `alphaextract,scale=${SCALE}:-1`
    : `scale=${SCALE}:-1`;
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...pre, '-i', file,
    '-vf', vf, '-vsync', '0', path.join(tmpDir, 'f_%04d.png')], { encoding: 'utf8' });
  if (r.status !== 0) return { file, error: (r.stderr || '').split('\n')[0] };

  const frames = fs.readdirSync(tmpDir).filter((f) => f.endsWith('.png')).sort();
  if (!frames.length) return { file, error: 'decoded 0 frames' };

  const worst = { top: 0, left: 0, right: 0, bottom: 0 };
  const at = { top: -1, left: -1, right: -1, bottom: -1 };

  frames.forEach((fn, idx) => {
    const p = PNG.sync.read(fs.readFileSync(path.join(tmpDir, fn)));
    const { width: w, height: h, data } = p;
    const present = (x, y) => {
      const k = (y * w + x) * 4;
      if (isWebm) return data[k] > ALPHA_MIN;                    // alphaextract -> grey = alpha
      const [r0, g0, b0] = [data[k], data[k + 1], data[k + 2]];
      return PLATE === 'magenta' ? !isMagenta(r0, g0, b0) : !isGreen(r0, g0, b0);
    };
    const t = longestRun((x) => present(x, 0), w);
    const b = longestRun((x) => present(x, h - 1), w);
    const l = longestRun((y) => present(0, y), h);
    const rr = longestRun((y) => present(w - 1, y), h);
    if (t > worst.top) { worst.top = t; at.top = idx; }
    if (b > worst.bottom) { worst.bottom = b; at.bottom = idx; }
    if (l > worst.left) { worst.left = l; at.left = idx; }
    if (rr > worst.right) { worst.right = rr; at.right = idx; }
  });

  fs.rmSync(tmpDir, { recursive: true, force: true });
  const k = srcW / SCALE; // report in source pixels
  return {
    file, frames: frames.length,
    top: Math.round(worst.top * k), left: Math.round(worst.left * k),
    right: Math.round(worst.right * k), bottom: Math.round(worst.bottom * k),
    at,
  };
}

// Expand EVERY argument: a directory contributes its clips, a file contributes itself. A path that
// does not exist stops the run — a mistyped path that quietly contributes zero clips is the same
// silent-under-measurement defect in a different coat.
const files = [];
const expansion = [];
for (const t of targets) {
  let st;
  try { st = fs.statSync(t); } catch (e) {
    console.error(`ERROR: no such file or directory: ${t} (${e.code || e.message})`);
    console.error('  NOTHING WAS SCANNED. A path that cannot be opened is never counted as clean.');
    process.exit(2);
  }
  if (st.isDirectory()) {
    const found = fs.readdirSync(t).filter((f) => /\.(webm|mp4)$/i.test(f)).map((f) => path.join(t, f));
    files.push(...found);
    expansion.push(`${t} -> ${found.length}`);
  } else {
    files.push(t);
    expansion.push(`${t} -> 1`);
  }
}
if (!files.length) {
  console.error(`ERROR: ${targets.length} argument(s) resolved to 0 .webm/.mp4 clips — nothing was scanned.`);
  console.error(`  ${expansion.join('  ·  ')}`);
  console.error('  "clean 0 | over threshold 0" over an empty set is not a pass.');
  process.exit(2);
}

// ##############################################################################################
// # ⛔ A BASENAME IS NOT AN IDENTITY ONCE N KITS ARE SCANNED IN ONE RUN (fixed phase 263)       #
// #                                                                                            #
// # The N-argument fix (phase 261) made the full-roster sweep possible, and the report unusable #
// # in exactly the mode it enabled. Rows printed `path.basename(r.file)`, which was unambiguous #
// # only while the tool scanned ONE directory. A 12-kit sweep flags 47 of 118 clips and 46 of   #
// # those rows share a basename with another row — 6x attack-block.webm, 5x each of             #
// # attack-throw / attack-throw-b / attack-strike / attack-strike-b / attack-block-b, 4x hit.   #
// # Every row was TRUE and not one could be attributed to a character, so the only way to find  #
// # out what to fix was to re-run the gate kit by kit — the sweep reported the work and hid it. #
// #                                                                                            #
// # The label is the SHORTEST path suffix that is unique across the scanned set, never fewer    #
// # than 2 segments, so it always names the character directory: `hollow-pale/attack-block.webm`#
// # It only grows past 2 if two kits really do collide at that depth (e.g. two `.../old/` dirs).#
// # Absolute paths are NOT dumped: they push the measurements off the line and the leading      #
// # segments are identical on every row, which is what made the basename tempting in the first  #
// # place. Column width follows the widest label so the numbers stay aligned.                   #
// ##############################################################################################
const segsOf = (p) => path.resolve(p).split(/[\\/]+/).filter(Boolean);
const labelFor = (() => {
  const segs = files.map(segsOf);
  const suffix = (s, k) => s.slice(Math.max(0, s.length - k)).join('/');
  const deepest = Math.max(...segs.map((s) => s.length));
  let k = 2; // ALWAYS at least <dir>/<clip>: the character directory is the unit a human acts on
  for (; k < deepest; k++) {
    if (new Set(segs.map((s) => suffix(s, k))).size === segs.length) break;
  }
  const map = new Map();
  files.forEach((f, i) => map.set(f, suffix(segs[i], k)));
  return (f) => map.get(f) || path.basename(f);
})();

const tmpRoot = path.join(process.env.TEMP || '.', `containment_${process.pid}`);
console.log('=== CONTAINMENT GATE ===');
console.log(`    (bottom edge is EXPECTED — feet on the floor line — and never counts as a defect)`);
console.log(`    threshold: ${MIN}px contiguous on TOP/LEFT/RIGHT, measured in source pixels`);
console.log(`    inputs: ${targets.length} argument(s) -> ${files.length} clip(s)   [${expansion.join('  ·  ')}]\n`);

const rows = [];
for (const f of files) rows.push(scanClip(f, tmpRoot));

// THE DISARMED-THRESHOLD REFUSAL. These clips were opened, their frame measured, and the threshold
// found to be larger than any run their edges can physically produce. Reporting them alongside
// `clean N` would be the 999999 defect surviving the argv rail on a frame smaller than the rail's
// guess. They are not clean, not errored, and not counted — the run refuses.
const disarmed = rows.filter((r) => r.disarmed);
if (disarmed.length) {
  console.error(`\nERROR: --min ${MIN}px is larger than the frame of ${disarmed.length} of ${rows.length} clip(s) — no edge of those clips could ever reach it.`);
  for (const r of disarmed.slice(0, 8)) {
    console.error(`  ${labelFor(r.file)}  frame ${r.disarmed.w}x${r.disarmed.h}  (max possible run: TOP ${r.disarmed.w}px, LEFT/RIGHT ${r.disarmed.h}px)`);
  }
  if (disarmed.length > 8) console.error(`  ... and ${disarmed.length - 8} more`);
  console.error('  A threshold nothing can cross reports every clip as CLEAN. That is a disarmed gate, not a pass.');
  process.exit(2);
}

// ##############################################################################################
// # THE SUPPRESSION CHECK — THE LAYER THAT NEEDS NO JUDGEMENT ABOUT WHERE A BAND ENDS.          #
// # Every bound above is an opinion about where a threshold stops meaning something, and an     #
// # opinion is precisely what has failed here four times. This asks one question instead:       #
// # DID THE --min YOU SUPPLIED HIDE A CLIP THE CALIBRATED DEFAULT WOULD HAVE CAUGHT? The clips  #
// # are already measured, so re-deriving the verdict at --min 6 is free and cannot be argued    #
// # with. It closes the CLASS (`--min 505`, `--min 100`, `--min 45` on a kit whose worst slice  #
// # is 44px) rather than the one number the sweep happened to use.                              #
// # It cannot misfire: if nothing is over at the default there is nothing to suppress, `--min 1`#
// # is stricter than the default so it never trips, and with no --min at all it is skipped.     #
// ##############################################################################################
const overAt = (r, m) => !r.error && !r.disarmed && (r.top >= m || r.left >= m || r.right >= m);
const suppressed = MIN === DEFAULT_MIN ? [] : rows.filter((r) => overAt(r, DEFAULT_MIN) && !overAt(r, MIN));
if (suppressed.length) {
  console.error(`\n⛔ REFUSING — NO VERDICT WAS PRINTED. --min ${MIN}px SUPPRESSED ${suppressed.length} of ${rows.length} clip(s) that the calibrated default (${DEFAULT_MIN}px) catches.`);
  for (const r of suppressed.slice(0, 12)) {
    const parts = [];
    if (r.top >= DEFAULT_MIN) parts.push(`TOP ${r.top}px @f${r.at.top}`);
    if (r.left >= DEFAULT_MIN) parts.push(`LEFT ${r.left}px @f${r.at.left}`);
    if (r.right >= DEFAULT_MIN) parts.push(`RIGHT ${r.right}px @f${r.at.right}`);
    console.error(`  ${labelFor(r.file)}  ${parts.join(' | ')}`);
  }
  if (suppressed.length > 12) console.error(`  ... and ${suppressed.length - 12} more`);
  console.error(`  These clips were decoded, measured, and found to touch an edge — the ONLY reason this run`);
  console.error(`  would have printed "clean" is the threshold. Measured: satoshi-odachi at --min 505 printed`);
  console.error(`  "scanned 13 | clean 13 | over threshold 0" and exited 0 with a 504px left-edge slice in it.`);
  console.error(`  Re-run at the default (--min ${DEFAULT_MIN}) or lower. There is deliberately no override:`);
  console.error('  --min may be LOWERED freely (stricter, and --min 1 is the documented triage value); raising');
  console.error('  it past a real slice is not a looser gate, it is a gate that cannot fail.');
  process.exit(2);
}

const bad = rows.filter((r) => !r.error && (r.top >= MIN || r.left >= MIN || r.right >= MIN));
bad.sort((a, b) => Math.max(b.top, b.left, b.right) - Math.max(a.top, a.left, a.right));

// Width follows the widest label actually printed, floored so short runs keep the old column feel
// and capped so one deep path cannot push every row's numbers off the screen.
const shown = [...bad, ...rows.filter((r) => r.error)].map((r) => labelFor(r.file).length);
const labelW = Math.min(56, Math.max(30, ...shown));

for (const r of bad) {
  const parts = [];
  if (r.top >= MIN) parts.push(`TOP ${r.top}px @f${r.at.top}`);
  if (r.left >= MIN) parts.push(`LEFT ${r.left}px @f${r.at.left}`);
  if (r.right >= MIN) parts.push(`RIGHT ${r.right}px @f${r.at.right}`);
  console.log(`  [OVER] ${labelFor(r.file).padEnd(labelW)} ${parts.join(' | ')}`);
}
for (const r of rows.filter((r) => r.error)) console.log(`  [ERR ] ${labelFor(r.file)}: ${r.error}`);

// `scanned N` is the number this gate is trusted on. It is `files.length` — the clips resolved from
// ALL arguments, printed above as the inputs expansion — because the loop pushes exactly one row per
// resolved clip. That structural equality is why there is no assertion here: it could not fail, and
// a check that cannot fail is decoration (phase 262). The claim is kept honest by the guards that
// DO fire: a bad/missing/repeated flag value refuses with exit 2 before anything is opened, an
// unopenable path and a zero-clip resolution refuse with exit 2 before any scanning, a threshold no
// edge could cross refuses with exit 2 after the frames are measured, and an undecodable clip is
// counted, named and exits non-zero below. Every one of them has been fired against a real input.
const errored = rows.filter((r) => r.error).length;
const clean = rows.length - bad.length - errored;
console.log(`\nscanned ${rows.length}  |  clean ${clean}  |  over threshold ${bad.length}  |  errored ${errored}`);
// An errored clip was handed in and NOT measured. Exiting 0 on it would report a pass for a clip
// nobody looked at — the same failure as the discarded arguments.
if (errored) console.error(`${errored} clip(s) could not be decoded and were NOT measured — this is not a clean result.`);
process.exit(bad.length || errored ? 1 : 0);
