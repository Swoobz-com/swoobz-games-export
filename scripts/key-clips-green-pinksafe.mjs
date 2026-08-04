// PINK-SAFE GREEN keyer (ported from the ir37 QA agent fork, 2026-07-24).
// WHY: scripts/key-idle-clips.mjs has a GLOBAL magenta-family suppress that CRUSHES hot-pink
// trim to mauve (pink IS magenta-family) and its magenta despill leaves green halos on green
// screens. Use THIS for GREEN-screen clips of pink/magenta-trimmed characters (ir37, lady-
// kurotachi, hollow-pale crimson accents). Same flood/feather/union-bbox/cal math; only the
// color block neutralizes g>b spill. cal output byte-identical semantics.
// GREEN-chroma, PINK-SAFE fork of scripts/key-idle-clips.mjs (IR37 PINK TESSEN).
// IDENTICAL flood-fill / feather / union-bbox crop / cal-emission math as the repo script
// (so cal is contract-faithful). ONLY the three colour-condition blocks are swapped from the
// repo's MAGENTA family to the GREEN family, because:
//   - repo's global interior magenta-suppress crushes hot-pink trim to muddy mauve (pink IS
//     magenta-family) -> DISABLED / replaced with a green-only interior suppress (pink never
//     g-dominant, so pink is untouched).
//   - repo's edge despill targets magenta spill -> replaced with green edge despill so the
//     green fan/dagger halo is actually removed (no green fringe on black/white).
//   - flood candidacy lift swapped magenta-family -> green-family (bloomed green backdrop around
//     pink/white effects floods away; pink/white effects survive).
// alpha-keying skill: despill EDGE-BAND-ONLY, never global on a subject hue; key the sampled
// screen colour; verify over black+white+grey.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
let stillPath = null;
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--still') { stillPath = argv[i + 1]; i += 1; }
  else positional.push(argv[i]);
}
const [inDir, outDir] = positional;
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(inDir).filter((f) => f.endsWith('.png')).sort();

const TIGHT = 45;
const LOOSE = 70;
const BAND = 5;
const FEATHER = 2;
const DESPILL = 0.12;      // keep this fraction of the green excess in the edge band
const SUPPRESS_MIN = 28;   // min green excess before an interior pixel counts as green haze
const SUPPRESS_KEEP = 0.25;
const CLEAR = [88, 88, 96];

const dist2 = (r, g, b, c) => {
  const dr = r - c[0], dg = g - c[1], db = b - c[2];
  return dr * dr + dg * dg + db * db;
};

let bx0 = Infinity, by0 = Infinity, bx1 = -1, by1 = -1;
const keyedPaths = [];

for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(path.join(inDir, f)));
  const { width: W, height: H, data: d } = png;

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

  const alpha = new Uint8Array(W * H).fill(255);
  const cand = new Uint8Array(W * H);
  const t2 = TIGHT * TIGHT, l2 = LOOSE * LOOSE;
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const q = dist2(r, g, b, screen);
    // GREEN family: g exceeds both r and b (bloomed green backdrop). Pink (r,b>g) and white
    // (all high, g not dominant) fail and survive.
    if (q < l2 || (g - Math.max(r, b)) > 45) cand[p] = 1;
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

  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (alpha[p] === 0) {
      d[i] = CLEAR[0]; d[i + 1] = CLEAR[1]; d[i + 2] = CLEAR[2]; d[i + 3] = 0;
      continue;
    }
    const t = dt[p];
    d[i + 3] = t >= FEATHER ? 255 : Math.round(255 * (t / FEATHER));
    const r = d[i], g = d[i + 1], b = d[i + 2];
    // GREEN-YELLOW spill/bloom kill (this character wears NO green and NO warm/yellow — she is
    // black + hot-pink only, and hot-pink is MAGENTA family so its blue >= its green). Therefore
    // ANY opaque pixel with g > b is green-screen spill or the yellow-green bloom the white/pink
    // finisher VFX lights on the backdrop (that faint halo the black+white matte-check exposed).
    // Neutralise it to its blue level: g -> b, and r -> b when r also exceeds b (kills the yellow
    // component), collapsing the bloom to a neutral grey that disappears on any background. Pink
    // (b >= g) and white (r=g=b) and black are all untouched. Applied to every opaque pixel
    // (halos live INSIDE the matte, not just at the edge). Consts kept for provenance.
    void t; void BAND; void DESPILL; void SUPPRESS_MIN; void SUPPRESS_KEEP;
    if (g > b) { d[i + 1] = b; if (r > b) d[i] = b; }
    const x = p % W, y = (p / W) | 0;
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
    if (y < by0) by0 = y; if (y > by1) by1 = y;
  }

  const out = path.join(outDir, f);
  fs.writeFileSync(out, PNG.sync.write(png));
  keyedPaths.push(out);
  process.stdout.write('.');
}

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

const A_THR = 128;
const COV = 3;
function contentBBox(png) {
  const { width: W, height: H, data: d } = png;
  const rowc = new Int32Array(H);
  const colc = new Int32Array(W);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) {
    if (d[(y * W + x) * 4 + 3] >= A_THR) { rowc[y] += 1; colc[x] += 1; }
  }
  let x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
  while (y0 < H && rowc[y0] < COV) y0 += 1;
  while (y1 >= 0 && rowc[y1] < COV) y1 -= 1;
  while (x0 < W && colc[x0] < COV) x0 += 1;
  while (x1 >= 0 && colc[x1] < COV) x1 -= 1;
  return { W, H, x0, y0, x1, y1, ch: y1 - y0 + 1, cx: (x0 + x1 + 1) / 2, bottomGap: H - (y1 + 1) };
}
function computeCal(still, anchor) {
  const k = Math.min(1 / still.W, 1 / still.H);
  const onH = still.ch * k;
  const onBG = still.bottomGap * k;
  const onCX = (1 - still.W * k) / 2 + still.cx * k;
  const vchFrac = anchor.ch / anchor.H;
  const bgFracV = anchor.bottomGap / anchor.H;
  const cxFracV = anchor.cx / anchor.W;
  const AR = anchor.W / anchor.H;
  const h = (100 * onH) / vchFrac;
  const bottom = 100 * onBG - h * bgFracV;
  const left = 100 * onCX - h * (cxFracV - 0.5) * AR;
  const r = (n) => Math.round(n * 100) / 100;
  return { h: r(h), bottom: r(bottom), left: r(left) };
}
if (stillPath) {
  const still = contentBBox(PNG.sync.read(fs.readFileSync(stillPath)));
  const anchor = contentBBox(PNG.sync.read(fs.readFileSync(keyedPaths[0])));
  const cal = computeCal(still, anchor);
  const calPath = `${outDir}.cal.json`;
  fs.writeFileSync(calPath, JSON.stringify(cal, null, 2));
  console.log(`cal ${JSON.stringify(cal)} -> ${calPath}`);
}
