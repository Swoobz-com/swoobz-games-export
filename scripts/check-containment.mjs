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
// Usage:
//   node scripts/check-containment.mjs qa-boss/webm                 # whole dir
//   node scripts/check-containment.mjs qa-boss/raw/foo.mp4          # one raw clip
//   node scripts/check-containment.mjs <path> [--min 6] [--plate green|magenta] [--scale 480]
//
// Exit code 1 if any clip exceeds --min on a TOP/LEFT/RIGHT edge, so it can gate a ship step.
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
  console.error('usage: node scripts/check-containment.mjs <file|dir> [--min N] [--plate green|magenta] [--scale N]');
  process.exit(2);
}
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};
const MIN = Number(opt('--min', 6));       // contiguous px on an edge before it counts
const PLATE = String(opt('--plate', 'green'));
const SCALE = Number(opt('--scale', 480)); // analyse at this width; runs are reported in SOURCE px
const ALPHA_MIN = 40;

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

const files = fs.statSync(target).isDirectory()
  ? fs.readdirSync(target).filter((f) => /\.(webm|mp4)$/i.test(f)).map((f) => path.join(target, f))
  : [target];

const tmpRoot = path.join(process.env.TEMP || '.', `containment_${process.pid}`);
console.log('=== CONTAINMENT GATE ===');
console.log(`    (bottom edge is EXPECTED — feet on the floor line — and never counts as a defect)`);
console.log(`    threshold: ${MIN}px contiguous on TOP/LEFT/RIGHT, measured in source pixels\n`);

const rows = [];
for (const f of files) rows.push(scanClip(f, tmpRoot));

const bad = rows.filter((r) => !r.error && (r.top >= MIN || r.left >= MIN || r.right >= MIN));
bad.sort((a, b) => Math.max(b.top, b.left, b.right) - Math.max(a.top, a.left, a.right));

for (const r of bad) {
  const parts = [];
  if (r.top >= MIN) parts.push(`TOP ${r.top}px @f${r.at.top}`);
  if (r.left >= MIN) parts.push(`LEFT ${r.left}px @f${r.at.left}`);
  if (r.right >= MIN) parts.push(`RIGHT ${r.right}px @f${r.at.right}`);
  console.log(`  [OVER] ${path.basename(r.file).padEnd(46)} ${parts.join(' | ')}`);
}
for (const r of rows.filter((r) => r.error)) console.log(`  [ERR ] ${path.basename(r.file)}: ${r.error}`);

const clean = rows.length - bad.length - rows.filter((r) => r.error).length;
console.log(`\nscanned ${rows.length}  |  clean ${clean}  |  over threshold ${bad.length}`);
process.exit(bad.length ? 1 : 0);
