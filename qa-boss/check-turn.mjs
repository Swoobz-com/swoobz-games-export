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
// Usage: node qa-boss/check-turn.mjs <file|dir> [--anchor <idle.webm>] [--margin 0.04]
//                                    [--min-run 4] [--min-agree 0.45]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const target = argv[0];
const num = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? Number(argv[i + 1]) : dflt; };
const str = (flag, dflt) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : dflt; };
const MARGIN = num('--margin', 0.04);
const MIN_RUN = num('--min-run', 4);
// Below this mirrored-fit the silhouette is not recognisably the character in EITHER orientation,
// so the comparison carries no information and the frame is abstained. See THE ABSTENTION RULE.
const MIN_AGREE = num('--min-agree', 0.45);
if (!target) {
  console.error('usage: node qa-boss/check-turn.mjs <file|dir> [--anchor <idle.webm>] [--margin 0.04] [--min-run 4]');
  process.exit(1);
}

const N = 64;
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'turngate-'));

function decode(webm) {
  const dir = fs.mkdtempSync(path.join(tmpRoot, 'f-'));
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-i', webm, '-pix_fmt', 'rgba', path.join(dir, 'f_%04d.png')]);
  return fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(dir, f));
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

const stat = fs.statSync(target);
const dir = stat.isDirectory() ? target : path.dirname(target);
const anchorPath = str('--anchor', path.join(dir, 'idle.webm'));
if (!fs.existsSync(anchorPath)) { console.error('no anchor clip at ' + anchorPath); process.exit(2); }
const anchor = normMask(decode(anchorPath)[0]);

const files = stat.isDirectory()
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.webm')).sort().map((f) => path.join(dir, f))
  : [target];

console.log('=== TURN GATE ===  anchor = ' + path.basename(anchorPath) + ' f0');
console.log('    mirror beats as-is by >= ' + MARGIN + ' for >= ' + MIN_RUN + ' frames == that span faces the WRONG WAY');
console.log('');
console.log('  clip                            turned/frames   worst gain   span');
console.log('  ' + '-'.repeat(74));
let bad = 0;
for (const f of files) {
  const frames = decode(f);
  const flags = [];
  let worst = 0, worstAt = -1, abstained = 0;
  frames.forEach((fr, i) => {
    const m = normMask(fr);
    if (!m) return;
    const a = iou(m, anchor);
    const b = iou(mirror(m), anchor);
    if (b - a < MARGIN) return;
    // ABSTAIN: the flip only means something if the flipped shape IS the character.
    if (b < MIN_AGREE) { abstained += 1; return; }
    flags.push(i);
    if (b - a > worst) { worst = b - a; worstAt = i; }
  });
  // longest contiguous run
  let run = 0, best = 0, bestStart = -1, cur = -1;
  for (let i = 0; i < frames.length; i++) {
    if (flags.includes(i)) { if (run === 0) cur = i; run++; if (run > best) { best = run; bestStart = cur; } }
    else run = 0;
  }
  const isKo = /(^|[-_])ko\.webm$/.test(path.basename(f));
  const verdict = best >= MIN_RUN ? (isKo ? 'ok (ko exempt: a prone body has no side)' : '*** TURNS ***') : 'ok';
  if (best >= MIN_RUN && !isKo) bad++;
  console.log(`  ${path.basename(f).padEnd(28)} ${String(flags.length).padStart(5)}/${String(frames.length).padEnd(5)} ${worst.toFixed(3).padStart(10)}${worstAt >= 0 ? ' @f' + worstAt : '   '}   ${best >= MIN_RUN ? 'run ' + best + ' @f' + bestStart + '  ' : ''}${verdict}${abstained ? '   [' + abstained + ' frames abstained]' : ''}`);
}
console.log('  ' + '-'.repeat(74));
console.log(bad ? `  ${bad} clip(s) face the wrong way mid-action.` : '  no turns.');
fs.rmSync(tmpRoot, { recursive: true, force: true });
