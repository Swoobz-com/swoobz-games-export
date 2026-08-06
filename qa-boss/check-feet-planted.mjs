// FEET-PLANTED GATE — does the fighter LEAVE THE GROUND mid-clip?
//
// WHY THIS EXISTS (session 31). gargoyle-spear `attack_throw_b` v2 LEAPT 82px off the ground at f48,
// violating its prompt's own emphasised bound ("HIS FEET STAY FLAT ON THE GROUND FOR THE ENTIRE CLIP -
// he never jumps, never leaps, never hops"). It was invisible to EVERY existing gate:
//   check-containment   -> exit 0 CLEAR      (a leap moves AWAY from the edges, never toward them)
//   check-extra-objects -> exit 0 CLEAN      (one blob; a leap adds no second object)
//   check-floor-growth  -> exit 0 clean      (f0 vs fLAST only; the leap is mid-clip and it returns)
//   check-frontturn     -> the delta signals track SYMMETRY and ASPECT, not ELEVATION
// check-anchor-lock's f0/fLAST would also miss it: the clip returns to the anchor perfectly.
// So a mid-clip leap had NO detector. This is that detector.
//
// SIGNAL: the BOTTOM row of non-plate pixels per frame. Feet planted => bottom is ~constant (measured
// 943 on every sampled frame of two accepted clips, max deviation 1px). A leap raises it.
// Reported relative to the clip's OWN f0 bottom, so it needs no anchor file and no calibration.
// ⚠ Like every f0-relative measure this is blind to a defect present AT f0 (see the FRONTAL-AT-f0
// lesson) — it detects a LIFT, not a fighter who was already airborne in frame 0.
// ⚠ `ko` and any deliberately-airborne state are EXEMPT: a collapse legitimately changes the bbox.
import { spawnSync } from 'node:child_process';
const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith('--'));
const LIFT_FAIL = Number((argv.find((a) => a.startsWith('--lift=')) || '--lift=40').split('=')[1]);
if (!file) { console.error('usage: node qa-boss/check-feet-planted.mjs <clip.mp4> [--lift=40]'); process.exit(2); }
const W = 960, H = 960;
function edges(t) {
  const r = spawnSync('ffmpeg', ['-v','error','-i',file,'-ss',String(t),'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','-'], { maxBuffer: 1 << 28 });
  if (r.status !== 0 || !r.stdout || r.stdout.length < W*H*3) return null;
  const b = r.stdout;
  const isPlate = (i) => { const g = b[i+1]; return g > 110 && b[i] < 0.55*g && b[i+2] < 0.55*g; };
  let bot = -1, top = -1;
  for (let y = H-1; y >= 0 && bot < 0; y--) for (let x = 0; x < W; x++) if (!isPlate((y*W+x)*3)) { bot = y; break; }
  for (let y = 0; y < H && top < 0; y++) for (let x = 0; x < W; x++) if (!isPlate((y*W+x)*3)) { top = y; break; }
  return { bot, top };
}
if (/(?:^|[-_])ko(?:$|[-_.])/i.test(file.replace(/.*[\/]/,''))) {
  console.log(`${file.replace(/.*[\/]/,'')}  EXEMPT (ko collapses by spec)`); process.exit(0);
}
const f0 = edges(0);
if (!f0) { console.error('ERROR: could not decode frame 0 of ' + file); process.exit(2); }
const rows = [];
for (const n of [0,6,12,18,24,30,36,42,48,54,60,66,72,84,96]) {
  const s = edges((n/24).toFixed(4)); if (!s) continue;
  rows.push({ n, bot: s.bot, lift: f0.bot - s.bot });
}
if (rows.length < 8) { console.error(`ERROR: only decoded ${rows.length} frames — refusing to judge`); process.exit(2); }
const worst = rows.reduce((a, r) => (r.lift > a.lift ? r : a), rows[0]);
console.log(`${file.replace(/.*[\/]/,'').padEnd(44)} f0 bottom y=${f0.bot}  worst lift ${worst.lift}px @f${worst.n}  ${worst.lift > LIFT_FAIL ? '⛔ LEFT THE GROUND' : (worst.lift > 18 ? 'WATCH' : 'planted')}`);
if (worst.lift > 18) console.log('  per-frame lift: ' + rows.map((r) => `f${r.n}:${r.lift}`).join(' '));
process.exit(worst.lift > LIFT_FAIL ? 1 : 0);
