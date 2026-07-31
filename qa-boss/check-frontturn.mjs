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
// Usage:
//   node qa-boss/check-frontturn.mjs <file.mp4|file.webm|dir> [--plate green|magenta]
//                                    [--sym-margin 0.12] [--aspect-margin 0.35] [--min-run 3]
// Exit 1 if any clip has a flagged run >= --min-run frames, so it can gate a ship step —
// but see the calibration box above before wiring it into anything.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(
  'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json',
);
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const target = argv[0];
if (!target) {
  console.error('usage: node qa-boss/check-frontturn.mjs <file|dir> [--plate green|magenta] [--sym-margin N] [--aspect-margin N] [--min-run N]');
  process.exit(2);
}
const opt = (n, d) => { const i = argv.indexOf(n); return i === -1 ? d : argv[i + 1]; };
const PLATE = String(opt('--plate', 'green'));
const SYM_MARGIN = Number(opt('--sym-margin', 0.12));
const ASPECT_MARGIN = Number(opt('--aspect-margin', 0.35));
const MIN_RUN = Number(opt('--min-run', 3));
const SCALE = 480;
const ALPHA_MIN = 40;
const N = 64;

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
  for (const fn of frames) {
    const p = PNG.sync.read(fs.readFileSync(path.join(tmpDir, fn)));
    const { width: w, height: h, data } = p;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) {
      const k = i * 4;
      if (isWebm) m[i] = data[k] > ALPHA_MIN ? 1 : 0;
      else {
        const [r0, g0, b0] = [data[k], data[k + 1], data[k + 2]];
        m[i] = (PLATE === 'magenta' ? !isMagenta(r0, g0, b0) : !isGreen(r0, g0, b0)) ? 1 : 0;
      }
    }
    const b = bbox(m, w, h);
    if (b.x1 < 0) { rows.push({ sym: 0, aspect: 0, empty: true }); continue; }
    const n = norm(m, w, h, b);
    rows.push({ sym: iou(n, mirror(n)), aspect: (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1), empty: false });
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const base = rows.find((r) => !r.empty) || { sym: 0, aspect: 1 };
  const flags = rows.map((r) => !r.empty
    && (r.sym > base.sym + SYM_MARGIN || r.aspect > base.aspect * (1 + ASPECT_MARGIN)));
  // longest contiguous flagged run
  let best = 0, cur = 0, bestStart = -1, curStart = 0;
  flags.forEach((f, i) => {
    if (f) { if (cur === 0) curStart = i; cur++; if (cur > best) { best = cur; bestStart = curStart; } }
    else cur = 0;
  });
  // report each signal's OWN maximum — reading aspect at the peak-sym frame understates a
  // front-turn whose widest frame is not its most symmetric one.
  const peakSym = Math.max(...rows.filter((r) => !r.empty).map((r) => r.sym));
  const peakAspect = Math.max(...rows.filter((r) => !r.empty).map((r) => r.aspect));
  return {
    file, frames: rows.length, baseSym: base.sym, baseAspect: base.aspect,
    peakSym, peakAspect,
    run: best, runStart: bestStart, flagged: flags.filter(Boolean).length,
  };
}

const files = fs.statSync(target).isDirectory()
  ? fs.readdirSync(target).filter((f) => /\.(webm|mp4)$/i.test(f)).map((f) => path.join(target, f))
  : [target];

console.log('=== FRONT-TURN GATE ===');
console.log('    selfSym = IoU(silhouette, its own mirror). side profile LOW, square-to-camera HIGH.');
console.log('    aspect  = bbox width / height. a frontal stance spreads the arms and widens the box.');
console.log(`    baseline = each clip's OWN frame 0; flag if sym > base+${SYM_MARGIN} or aspect > base*${1 + ASPECT_MARGIN}`);
console.log(`    a flagged run of >= ${MIN_RUN} frames is a defect\n`);

const tmpRoot = path.join(process.env.TEMP || '.', `frontturn_${process.pid}`);
let bad = 0;
for (const f of files) {
  const r = scan(f, tmpRoot);
  if (r.error) { console.log(`  [ERR ] ${path.basename(r.file)}: ${r.error}`); continue; }
  const isBad = r.run >= MIN_RUN;
  if (isBad) bad++;
  const tag = isBad ? '[FRONT]' : '[ ok  ]';
  console.log(`  ${tag} ${path.basename(r.file).padEnd(44)} sym ${r.baseSym.toFixed(3)}->${r.peakSym.toFixed(3)}  aspect ${r.baseAspect.toFixed(2)}->${r.peakAspect.toFixed(2)}  run ${r.run}/${r.frames}${isBad ? ` @f${r.runStart}` : ''}`);
}
console.log(`\nscanned ${files.length}  |  front-turns ${bad}`);
process.exit(bad ? 1 : 0);
