// Alpha-plane comparator for two VP9-alpha webms.
//   node qa-boss/cmp-alpha.mjs <a.webm> <b.webm> [--mirror] [--min-iou 0.90]
// --mirror compares A against the horizontal MIRROR of B (the flip proof).
// `-c:v libvpx-vp9` MUST precede `-i` or ffmpeg silently drops the alpha plane.
//
// ⛔ IT USED TO EXIT 0 AFTER COMPARING NOTHING. (phase 261, TOOLCHAIN-AUDIT §3)
// `cmp-alpha qa-boss/webm/hollow-pale-idle.webm qa-boss/webm/hollow-pale-hit.webm` printed
// `!! DIMS 776x890 vs 786x906` and exited **0**. That line is a `break` out of the compare loop on
// the FIRST frame — zero frames were compared, no IoU was ever computed — and the run-book's `&&`
// chains read it as a pass. A dimension mismatch is therefore an INPUT error, not a verdict:
// nothing was measured, so there is nothing to have a verdict about.
//
// WHICH OUTCOME IS WHICH — the split this file now enforces:
//   exit 2 (usage/input, NOTHING COMPARABLE WAS MEASURED)
//     · missing/extra positional args, a path that does not exist
//     · ffmpeg refused a file, or decoded 0 frames (e.g. the raw .mp4 domain, which `-c:v
//       libvpx-vp9` cannot decode)
//     · `!! DIMS` — different frame sizes: the loop compared 0 frames
//     · `!! FRAME COUNT` — different lengths: only the overlap could be paired, so the answer is
//       not the comparison that was asked for. The overlap numbers are still printed first.
//   exit 1 (a REAL DETECTED FAILURE)
//     · both decoded, same size, same length, compared in full — AND THE ALPHAS DIFFER:
//       worst-frame alphaIoU < --min-iou.
//   exit 0 — compared in full and they agree.
//
// MIN_IOU IS CALIBRATED, NOT GUESSED. Measured on this repo (phase 261), worst-FRAME alphaIoU:
//   byte-identical pair (qa-boss/flip/webm/hit.webm vs the shipped lady-kurotachi/hit.webm)  1.00000
//   genuine flip pair through a VP9 re-encode, --mirror  (lk hit)                            0.98836
//   the same, on a clip that falls and fades             (lk ko)                             0.98851
//   two DIFFERENT clips of one character (hollow-pale idle vs special_3-v2)                  0.53748
//   a flip proof run the WRONG way round (lk hit vs its own hflip, no --mirror)              0.34280
// 0.90 sits in the empty band between 0.53748 and 0.98836.
//
// ⚠ THE 0.98836 AND 0.98851 ROWS ABOVE NO LONGER REPRODUCE, AND THAT IS NOT A BUG IN THEM.
// Re-measured phase 262: `qa-boss/flip/webm/hit.webm` vs the shipped `lady-kurotachi/hit.webm` now
// reads 1.00000 WITHOUT --mirror and 0.34301 WITH it — exactly inverted from the row above. The
// reason is that the flip SHIPPED: the file those rows were measured against has since been
// replaced by the flipped build, so the two paths now name the same content. Every candidate pair
// left on disk is either byte-identical (1.00000) or a wrong-way mirror; there is no genuine
// match-through-a-re-encode pair to read off the tree any more. The band below was therefore
// measured on a re-encode CONSTRUCTED for the purpose (decode a shipped clip to rgba PNGs, re-encode
// VP9 yuva420p crf30 -auto-alt-ref 0, compare against the original), which is the same physical
// situation those rows described.
//
// ############################################################################################
// # ⛔ --min-iou WAS DEFEATED FIVE WAYS, ALL EXIT 0, ALL ON THE KNOWN-BAD PAIR. (phase 262)   #
// # Known-bad: public/assets/characters/hollow-pale/{idle,special-c}.webm -> worst 0.53748,   #
// # which with no flag exits 1. Literal before-behaviour:                                     #
// #   --min-iou 0.5       EXIT=0   and NOT ONE WORD of warning on either stream               #
// #   --min-iou 0.001     EXIT=0                                                              #
// #   --min-iou 0         EXIT=0   documented off-switch, but SILENT on both streams          #
// #   --min-iou 0.53748   EXIT=0   the reported figure pasted back in — the gate goes green    #
// #   --min-iou ""        EXIT=0   Number('') === 0 passes isFinite && >=0 && <=1             #
// #   --bogus             EXIT=1   unknown flag silently DROPPED, no refusal                  #
// # Empty-string, duplicate and unknown-flag are now argcheck's. The rest is the BAND below.  #
// ############################################################################################
//
// THE MEASURED BAND FOR --min-iou: [0.55, 0.99]. Both edges were swept, not reasoned.
//   LOWER EDGE — the largest value that still goes SILENT on the known-bad (worst 0.53748):
//     --min-iou 0.5      exit 0 SILENT      --min-iou 0.53749  exit 1 CONVICTS
//     --min-iou 0.53747  exit 0 SILENT      --min-iou 0.54     exit 1 CONVICTS
//     --min-iou 0.53748  exit 0 SILENT  <-  --min-iou 0.55     exit 1 CONVICTS
//   So anything <= 0.53748 is a disarmed gate on this input. 0.55 is set just above that edge.
//   LOWER EDGE, SECOND REASON: 0.55 also sits above every WRONG-WAY-FLIP reading on the current
//   tree (lk hit 0.34301, eclipse hit 0.12265), the other failure this tool exists to catch.
//   UPPER EDGE — the smallest value that raises a FALSE ALARM on a genuine match. Four clips
//   re-encoded and compared against themselves (worst-frame alphaIoU):
//     hollow-pale idle 0.99401 · special-c 0.99388 · hit 0.99142 · victory 0.99133  <- worst
//   Swept against that worst genuine match:
//     --min-iou 0.99     exit 0 passes        --min-iou 0.99133  exit 1 FALSE ALARM
//     --min-iou 0.9913   exit 0 passes        --min-iou 0.995    exit 1 FALSE ALARM
//   So 0.99 is the largest bound that still passes every genuine re-encode. Default stays 0.90,
//   which is mid-band and unchanged.
//
// THE COMPARISON IS `worst < MIN_IOU`, i.e. MIN_IOU IS AN INCLUSIVE FLOOR: worst == MIN_IOU PASSES.
// That is decided and documented here because it used to be the fifth defeat — the operator reads
// `worst=0.53748` off a failing run, pastes it back as --min-iou, and the gate goes green having
// measured exactly the same thing. The band above now refuses 0.53748 outright, so the tie case is
// unreachable from the known-bad; `<` is kept because a floor should admit a value that meets it.
// NOTE the printed worst is rounded to 5dp, so a value copied off the report is NOT the exact
// comparand — never calibrate by pasting the printed number back in.
//
// TO PRINT THE NUMBERS WITHOUT A VERDICT, use --no-verdict. `--min-iou 0` no longer does this: 0 is
// outside the band and exits 2, because a threshold that cannot be crossed is indistinguishable
// from a pass. --no-verdict announces itself on stdout AND stderr (argcheck's offSwitch), which
// `--min-iou 0` never did.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeArgs } from './lib/argcheck.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const require = createRequire(`${ROOT}/package.json`);
const { PNG } = require('pngjs');

const USAGE = 'usage: node qa-boss/cmp-alpha.mjs <a.webm> <b.webm> [--mirror] [--min-iou 0.90] [--no-verdict]';

// ONE DOOR FOR ARGUMENTS. The local checks that used to sit here — a hand-rolled indexOf/filter
// parser plus an isFinite/0..1 test — are DELETED. They passed `--min-iou ""` (Number('') === 0),
// accepted a repeated flag by reading only the first, and dropped `--bogus` without a word.
// Flags and their values must not be mistaken for filenames either — `cmp-alpha --mirror a b` used
// to hand ffmpeg the literal string "--mirror" and die in a stack trace; argcheck consumes each
// flag's value slot, so positionals() cannot return one.
const Args = makeArgs(process.argv.slice(2), { tool: 'cmp-alpha', usage: USAGE });
const MIRROR = Args.bool('--mirror');
const NO_VERDICT = Args.offSwitch('--no-verdict', 'the alphaIoU verdict is OFF — the numbers are printed but nothing can fail');
const MIN_IOU = Args.num('--min-iou', 0.90, {
  min: 0.55,
  max: 0.99,
  band: 'Measured, both edges: <= 0.53748 goes SILENT on the known-bad pair (hollow-pale idle vs '
      + 'special-c, worst 0.53748) and 0.53749 convicts, so 0.55 is the lowest bound that still '
      + 'discriminates; a genuine clip compared against its own VP9 re-encode scores 0.99133 at '
      + 'worst, so 0.99 is the highest bound that does not false-alarm on a real match. '
      + 'For numbers WITHOUT a verdict use --no-verdict — `--min-iou 0` was a SILENT off-switch.',
});
const pos = Args.positionals();
Args.done();

const [A, B] = pos;
if (pos.length !== 2) { console.error(`ERROR: need exactly two clips, got ${pos.length}.\n${USAGE}`); process.exit(2); }
for (const f of [A, B]) if (!fs.existsSync(f)) { console.error(`ERROR: no such file: ${f}\n${USAGE}`); process.exit(2); }

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cmpalpha-'));
const die = (code) => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ } process.exit(code); };

function decode(src, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-c:v', 'libvpx-vp9', '-i', src,
    '-pix_fmt', 'rgba', `${dir}/f_%03d.png`], { encoding: 'utf8' });
  const frames = fs.readdirSync(dir).sort();
  // It used to `throw` here: an unhandled stack trace, exit 1, and the temp dir left behind. An
  // undecodable input is an INPUT error (2) — exit 1 must only ever mean "the alphas differ".
  if (r.status !== 0 || !frames.length) {
    console.error(`ERROR: ffmpeg decoded ${frames.length} frame(s) from ${src} — nothing was compared.`);
    console.error('       This tool reads VP9-ALPHA WEBMs. A raw .mp4 is not decodable by `-c:v libvpx-vp9`.');
    const tail = String(r.stderr || '').trim().split('\n')[0];
    if (tail) console.error(`       ffmpeg: ${tail}`);
    die(2);
  }
  return frames;
}
const fa = decode(A, `${tmp}/a`);
const fb = decode(B, `${tmp}/b`);
const countMismatch = fa.length !== fb.length;
if (countMismatch) console.log(`!! FRAME COUNT ${fa.length} vs ${fb.length}`);

let worst = 1, worstAt = -1, sumIoU = 0, sumMAD = 0, n = 0, dimMsg = '';
for (let i = 0; i < Math.min(fa.length, fb.length); i++) {
  const pa = PNG.sync.read(fs.readFileSync(`${tmp}/a/${fa[i]}`));
  const pb = PNG.sync.read(fs.readFileSync(`${tmp}/b/${fb[i]}`));
  if (pa.width !== pb.width || pa.height !== pb.height) {
    dimMsg = `!! DIMS ${pa.width}x${pa.height} vs ${pb.width}x${pb.height}`;
    break;
  }
  const W = pa.width, H = pa.height;
  let inter = 0, uni = 0, absSum = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const ia = (y * W + x) * 4 + 3;
      const bx = MIRROR ? W - 1 - x : x;
      const ib = (y * W + bx) * 4 + 3;
      const av = pa.data[ia], bv = pb.data[ib];
      const ab = av >= 128, bb = bv >= 128;
      if (ab && bb) inter++;
      if (ab || bb) uni++;
      absSum += Math.abs(av - bv);
    }
  }
  const iou = uni ? inter / uni : 1;
  if (iou < worst) { worst = iou; worstAt = i; }
  sumIoU += iou; sumMAD += absSum / (W * H); n++;
}
if (dimMsg) {
  console.log(dimMsg);
  console.error(`ERROR: the two clips are different sizes, so ${n} frame(s) were compared — NOTHING was measured.`);
  console.error('       Every number this tool exists to print is undefined here; it used to exit 0 anyway.');
  console.error('       Scale one to the other, or compare clips keyed from the same take.');
  die(2);
}
console.log(`frames=${n} alphaIoU avg=${(sumIoU / n).toFixed(5)} worst=${worst.toFixed(5)} meanAbsAlphaDiff=${(sumMAD / n).toFixed(4)}${MIRROR ? '  [MIRROR]' : ''}`);
if (countMismatch) {
  console.error(`ERROR: frame counts differ (${fa.length} vs ${fb.length}) — only the first ${n} frame(s) could be paired.`);
  console.error('       The numbers above cover the overlap only, so this is not the comparison you asked for.');
  die(2);
}
// `worst < MIN_IOU` — MIN_IOU is an INCLUSIVE FLOOR (worst == MIN_IOU passes). Decided and
// documented in the header: the tie used to be a defeat, because the reported figure pasted back in
// turned the gate green. The band now refuses that figure, so the tie is unreachable from here.
if (!NO_VERDICT && worst < MIN_IOU) {
  console.error(`\n⛔ THE ALPHAS DIFFER — worst-frame alphaIoU ${worst.toFixed(5)} @f${worstAt} is under the ${MIN_IOU} floor (the floor is inclusive: equal would pass).`);
  console.error(`  A genuine match measures >= 0.991 against its own VP9 re-encode${MIRROR ? '' : '; if these are a FLIP pair, you forgot --mirror (that reads ~0.12-0.34)'}.`);
  console.error('  Move the bar within the measured band [0.55, 0.99], or print the numbers with NO verdict');
  console.error('  using --no-verdict. Do NOT paste the worst figure above back in as --min-iou: it is');
  console.error('  rounded to 5dp, and a floor set to the value that just failed is a gate that cannot fail.');
  die(1);
}
die(0);
