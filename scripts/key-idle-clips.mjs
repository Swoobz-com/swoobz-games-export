// Per-frame chroma key for the idle clips (alpha-keying skill recipe):
// border-ring-sampled screen color, tight global key + border-seeded flood fill,
// 3px edge-band-only despill, 2px feather, neutral (non-black) transparent plane,
// union-bbox crop across all frames so feet calibration in-game still lands.
//
// Usage: node scripts/key-idle-clips.mjs <inFramesDir> <outDir> [--still <anchor-png>]
//   --still <path>: after the crop, EMIT the placement cal to <outDir>.cal.json — the
//   { h, bottom, left } percentages that land the clip's ANCHOR frame (frame 0 of the crop)
//   pixel-on-pixel over the still PNG inside the square fighter box. cal is thus NEVER
//   hand-derived (contract §4). See computeCal() for the math.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

// Parse positional args + the optional --still flag (order-independent).
const argv = process.argv.slice(2);
let stillPath = null;
const positional = [];
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--still') {
    stillPath = argv[i + 1];
    i += 1;
  } else {
    positional.push(argv[i]);
  }
}
const [inDir, outDir] = positional;
fs.mkdirSync(outDir, { recursive: true });
const files = fs.readdirSync(inDir).filter((f) => f.endsWith('.png')).sort();

const TIGHT = 45; // global key distance (real bg incl. see-through gaps)
const LOOSE = 70; // border-flood candidate distance
const BAND = 5; // despill band px
const FEATHER = 2; // alpha ramp px
const DESPILL = 0.12; // keep this fraction of the magenta excess in the band
// GLOBAL magenta-family suppress (interior pockets): motion blur bakes screen-magenta ONTO the
// body (head/shoulder smears) far beyond the edge band. Only fires when BOTH R and B exceed G by
// a hard margin (true magenta family; warm rust fails b>g, cyan glow fails r>g), so costume
// shading is untouched. SAFE ONLY while no character wears magenta - gate per character then.
const SUPPRESS_MIN = 28; // minimum min(R-G, B-G) excess before a pixel counts as a pocket
const SUPPRESS_KEEP = 0.25; // fraction of the excess kept (full removal reads flat/grey)
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
  // Flood candidacy is distance-based PLUS magenta-family: an emissive effect (fire ring,
  // lightning arc) LIGHTS the magenta backdrop around the character, lifting it far beyond the
  // distance threshold while keeping the magenta structure (R and B both well above G). Fire is
  // R>>B and lightning cores are near-white (G high), so both fail the family test and survive;
  // washed/bloomed backdrop floods away. Border-seeded, so interiors stay protected. SAFE only
  // while no character wears magenta (same gate as the interior suppress).
  const alpha = new Uint8Array(W * H).fill(255);
  const cand = new Uint8Array(W * H);
  const t2 = TIGHT * TIGHT, l2 = LOOSE * LOOSE;
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const q = dist2(r, g, b, screen);
    if (q < l2 || Math.min(r - g, b - g) > 45) cand[p] = 1;
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
    } else {
      // Interior: the global magenta-family suppress (see consts above).
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (Math.min(r - g, b - g) > SUPPRESS_MIN) {
        d[i] = Math.round(g + (r - g) * SUPPRESS_KEEP);
        d[i + 2] = Math.round(g + (b - g) * SUPPRESS_KEEP);
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

// ---- Optional: emit the placement cal (contract §4) ---------------------------------------
// The alpha content bbox of a PNG. A row/col counts as content only when it has >= COV pixels
// with alpha >= A_THR, so a lossy feather/halo of a few stray semi-transparent pixels does not
// inflate the box. This is the ONE geometry primitive both measurements share.
const A_THR = 128;
const COV = 3;
function contentBBox(png) {
  const { width: W, height: H, data: d } = png;
  const rowc = new Int32Array(H);
  const colc = new Int32Array(W);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (d[(y * W + x) * 4 + 3] >= A_THR) {
        rowc[y] += 1;
        colc[x] += 1;
      }
    }
  }
  let x0 = 0;
  let x1 = W - 1;
  let y0 = 0;
  let y1 = H - 1;
  while (y0 < H && rowc[y0] < COV) y0 += 1;
  while (y1 >= 0 && rowc[y1] < COV) y1 -= 1;
  while (x0 < W && colc[x0] < COV) x0 += 1;
  while (x1 >= 0 && colc[x1] < COV) x1 -= 1;
  // Content edges in continuous coords: pixel i covers [i, i+1], so the right/bottom edge is
  // (x1+1)/(y1+1) and the centre is the midpoint of the covered span.
  return { W, H, x0, y0, x1, y1, ch: y1 - y0 + 1, cx: (x0 + x1 + 1) / 2, bottomGap: H - (y1 + 1) };
}

// Solve { h, bottom, left } (all % of the square fighter box) so the clip's anchor frame lands
// pixel-on-pixel over the still. The still is drawn object-fit:contain, object-position:bottom
// center; the video element is height=h%, bottom=bottom%, horizontally centred at left%.
function computeCal(still, anchor) {
  // --- Still geometry inside the box (box side = 1 unit). contain scale = min(1/W, 1/H). ---
  const k = Math.min(1 / still.W, 1 / still.H);
  const onH = still.ch * k; // still content height as a box fraction
  const onBG = still.bottomGap * k; // still content bottom gap as a box fraction
  //   contain centres the image horizontally: left edge at (1 - W*k)/2, content centre = that
  //   plus cx*k.
  const onCX = (1 - still.W * k) / 2 + still.cx * k; // still content centre-x as a box fraction

  // --- Anchor-frame geometry inside the crop (the crop canvas IS the video element box). ---
  const vchFrac = anchor.ch / anchor.H; // content height / crop height
  const bgFracV = anchor.bottomGap / anchor.H; // content bottom gap / crop height
  const cxFracV = anchor.cx / anchor.W; // content centre-x / crop width
  const AR = anchor.W / anchor.H; // crop aspect (width / height)

  //   video element height = h% of box; on-screen content height = (h/100)*vchFrac -> match onH
  const h = (100 * onH) / vchFrac;
  //   on-screen content bottom = bottom% + h*bgFracV -> match onBG
  const bottom = 100 * onBG - h * bgFracV;
  //   on-screen content centre-x = left% + h*(cxFracV - 0.5)*AR -> match onCX
  const left = 100 * onCX - h * (cxFracV - 0.5) * AR;

  const r = (n) => Math.round(n * 100) / 100;
  return { h: r(h), bottom: r(bottom), left: r(left) };
}

if (stillPath) {
  const still = contentBBox(PNG.sync.read(fs.readFileSync(stillPath)));
  // Frame 0 of the CROPPED clip IS the anchor pose (contract §2).
  const anchor = contentBBox(PNG.sync.read(fs.readFileSync(keyedPaths[0])));
  const cal = computeCal(still, anchor);
  const calPath = `${outDir}.cal.json`;
  fs.writeFileSync(calPath, JSON.stringify(cal, null, 2));
  console.log(`cal ${JSON.stringify(cal)} -> ${calPath}`);
}
