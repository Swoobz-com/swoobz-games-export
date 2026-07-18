// Per-frame chroma key for the idle clips (alpha-keying skill recipe):
// border-ring-sampled screen color, tight global key + border-seeded flood fill,
// 3px edge-band-only despill, 2px feather, neutral (non-black) transparent plane,
// union-bbox crop across all frames so feet calibration in-game still lands.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const [inDir, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(inDir).filter((f) => f.endsWith('.png')).sort();

const TIGHT = 45; // global key distance (real bg incl. see-through gaps)
const LOOSE = 70; // border-flood candidate distance
const BAND = 5; // despill band px
const FEATHER = 2; // alpha ramp px
const DESPILL = 0.12; // keep this fraction of the magenta excess in the band
const CLEAR = [88, 88, 96]; // non-black transparent plane (skill: never pure black)

const dist2 = (r, g, b, c) => {
  const dr = r - c[0], dg = g - c[1], db = b - c[2];
  return dr * dr + dg * dg + db * db;
};

// Union bbox across frames (pass 1 records it, pass 2 crops).
let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
const keyedPaths = [];

for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(inDir, f)));
  const { width: W, height: H, data: d } = png;

  // 1. Sample screen color: median of a 12px border ring.
  const rs = [], gs = [], bs = [];
  const ring = 12;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= ring && x < W - ring && y >= ring && y < H - ring) { x = W - ring - 1; continue; }
      const i = (y * W + x) * 4;
      rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]);
    }
  }
  const med = (a) => { a.sort((p, q) => p - q); return a[a.length >> 1]; };
  const screen = [med(rs), med(gs), med(bs)];

  // 2. Matte: tight global key + border-seeded flood fill over loose candidates.
  const alpha = new Uint8Array(W * H).fill(255);
  const cand = new Uint8Array(W * H);
  const t2 = TIGHT * TIGHT, l2 = LOOSE * LOOSE;
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    const q = dist2(d[i], d[i + 1], d[i + 2], screen);
    if (q < l2) cand[p] = 1;
    if (q < t2) alpha[p] = 0;
  }
  const stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  const seen = new Uint8Array(W * H);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !cand[p]) continue;
    seen[p] = 1; alpha[p] = 0;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < W - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - W);
    if (y < H - 1) stack.push(p + W);
  }

  // 3. Distance-to-transparent (chamfer, 2 passes) for feather + despill band.
  const INF = 1e9;
  const dt = new Float32Array(W * H);
  for (let p = 0; p < W * H; p++) dt[p] = alpha[p] === 0 ? 0 : INF;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x;
    if (x > 0) dt[p] = Math.min(dt[p], dt[p - 1] + 1);
    if (y > 0) dt[p] = Math.min(dt[p], dt[p - W] + 1);
    if (x > 0 && y > 0) dt[p] = Math.min(dt[p], dt[p - W - 1] + 1.4);
    if (x < W - 1 && y > 0) dt[p] = Math.min(dt[p], dt[p - W + 1] + 1.4);
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const p = y * W + x;
    if (x < W - 1) dt[p] = Math.min(dt[p], dt[p + 1] + 1);
    if (y < H - 1) dt[p] = Math.min(dt[p], dt[p + W] + 1);
    if (x < W - 1 && y < H - 1) dt[p] = Math.min(dt[p], dt[p + W + 1] + 1.4);
    if (x > 0 && y < H - 1) dt[p] = Math.min(dt[p], dt[p + W - 1] + 1.4);
  }

  // 4. Write alpha (feather ramp), edge-band despill, neutral clear plane, bbox.
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (alpha[p] === 0) {
      d[i] = CLEAR[0]; d[i + 1] = CLEAR[1]; d[i + 2] = CLEAR[2]; d[i + 3] = 0;
      continue;
    }
    const t = dt[p];
    d[i + 3] = t >= FEATHER ? 255 : Math.round(255 * (t / FEATHER));
    if (t <= BAND) {
      // Magenta spill only: both R and B exceed G. Cyan glows (G,B high, R low)
      // and warm rust (R high, B low) fail the condition and stay untouched.
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > g && b > g) {
        d[i] = Math.round(g + (r - g) * DESPILL);
        d[i + 2] = Math.round(g + (b - g) * DESPILL);
      }
    }
    const x = p % W, y = (p / W) | 0;
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
    if (y < by0) by0 = y; if (y > by1) by1 = y;
  }

  const out = path.join(outDir, f);
  fs.writeFileSync(out, PNG.sync.write(png));
  keyedPaths.push(out);
  process.stdout.write('.');
}

// Pass 2: crop every keyed frame to the union bbox (+4px pad, even dims for yuva420p).
const pad = 4;
bx0 = Math.max(0, bx0 - pad); by0 = Math.max(0, by0 - pad);
let first = PNG.sync.read(fs.readFileSync(keyedPaths[0]));
bx1 = Math.min(first.width - 1, bx1 + pad); by1 = Math.min(first.height - 1, by1 + pad);
let cw = bx1 - bx0 + 1, ch = by1 - by0 + 1;
if (cw % 2) cw--; if (ch % 2) ch--;
for (const kp of keyedPaths) {
  const src = PNG.sync.read(fs.readFileSync(kp));
  const dst = new PNG({ width: cw, height: ch });
  PNG.bitblt(src, dst, bx0, by0, cw, ch, 0, 0);
  fs.writeFileSync(kp, PNG.sync.write(dst));
}
console.log(`\nbbox x${bx0} y${by0} ${cw}x${ch} frames=${keyedPaths.length}`);
