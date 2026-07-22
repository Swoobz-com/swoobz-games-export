// Phase-20 chroma-key preprocessing for the 10 CONQUEST-MAP enemy stills.
//
// Tim supplied 10 final enemy characters as flat GREEN-screen full-body PNGs (one per map node)
// plus a square PFP portrait on dark studio grey per character. This script keys the green stills
// LOCALLY (no generation), despills the residual green edge, and encodes both the full-body cutout
// and the PFP to webp under public/assets/enemies/. Deterministic; run: node scripts/key-enemies.mjs
//
// Keying is the PROVEN key-fighters.mjs recipe (corner-median bg sample -> border flood fill ->
// largest connected opaque component -> inward-only feather r=2), extended with a GREEN DESPILL
// edge pass (the green backdrop leaves a faint green fringe on a soft matte edge). No head-ROI
// bracket fill is needed here (the characters own no green that matches the studio green).
//
// Output per enemy id:
//   public/assets/enemies/<id>.webp        (keyed full-body cutout, height 900, alpha, q90)
//   public/assets/enemies/<id>-pfp.webp    (square portrait 512x512, q88, as-is)
//   qa-phase20/shots/keyqa-<id>.png        (cutout over #07080c | #ffffff, halo/despill QA)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_BASE = join(ROOT, 'input', 'characters', 'playable characters', 'npc boss');
const OUT_DIR = join(ROOT, 'public', 'assets', 'enemies');
const QA_DIR = join(ROOT, 'qa-phase20', 'shots');
const TMP_DIR = join(ROOT, 'qa-phase20', 'tmp');

// The green backdrop is far from any character colour, so a generous tolerance is safe (per brief).
const BG_TOLERANCE = 60;
const FEATHER_RADIUS = 2;
// Green despill: an edge-ring kept pixel whose green channel exceeds max(R,B) by this margin is a
// green-fringe pixel; clamp its green down to max(R,B). Interior pixels are never touched globally.
const DESPILL_MARGIN = 8;
const DESPILL_EDGE_PX = 4; // "within ~4px of a transparent pixel" (chebyshev, via separable dilate)
// ENCLOSED-POCKET removal: the border flood can't reach backdrop green WALLED OFF by the
// character (a tail loop's interior, the triangle between an arm and a raised spear, the boss
// fan's hexagon holes, ring interiors on a spear). MEASURED RULING (orchestrator, phase 20):
// none of the 10 characters paints with its own screen color — the original art has NO
// chroma-matched green (Thorn Warden's eyes are amber; the boss fan holes sample identical to
// the bg median). So ANY non-border-reachable pixel matching the backdrop is a leak: cut at any
// blob size, no dominance test. Tolerance is tighter than the flood's (enclosed pixels get no
// contiguity protection; ir56's genuine olive armor must stay outside the sphere).
const POCKET_TOLERANCE = 45;
// Self-check: after keying, no image may keep more than this many bg-colored pixels. This bakes
// the defect class into the script permanently (a regression exits nonzero, never ships silently).
const SELF_CHECK_MAX = 150;

// source file (relative to SRC_BASE), enemy id, PFP file.
const ENEMIES = [
  { dir: 'map 1', base: 'Sora Yari.png', id: 'sora-yari', pfp: 'Sora Yari PFP.png' },
  { dir: 'map 2', base: 'Kitsune Tanto.png', id: 'kitsune-tanto', pfp: 'Kitsune Tanto PFP.png' },
  { dir: 'map 3', base: 'Thorn_Warden.png', id: 'thorn-warden', pfp: 'Thorn_Warden PFP.png' },
  { dir: 'map 4', base: 'Onryo Katana.png', id: 'onryo-katana', pfp: 'Onryo Katana PFP.png' },
  { dir: 'map 5', base: 'Satoshi Odachi.png', id: 'satoshi-odachi', pfp: 'Satoshi Odachi PFP.png' },
  { dir: 'map 6', base: 'Eclipse Ofuda.png', id: 'eclipse-ofuda', pfp: 'Eclipse Ofuda PFP.png' },
  { dir: 'map 7', base: 'IR-37 Pink Tessen.png', id: 'ir37-pink-tessen', pfp: 'IR-37 Pink Tessen PFP.png' },
  { dir: 'map 8', base: 'IR-56 Lion-Serpent.png', id: 'ir56-lion-serpent', pfp: 'IR-56 Lion-Serpent PFP.png' },
  { dir: 'map 9', base: 'Lady Kurotachi.png', id: 'lady-kurotachi', pfp: 'Lady Kurotachi PFP.png' },
  { dir: 'finalboss', base: 'IR-48 Hex Paper Lord.png', id: 'ir48-hex-paper-lord', pfp: 'IR-48 Hex Paper Lord PFP.png' },
];

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function medianCorner(png) {
  const { width, height, data } = png;
  const samples = [];
  const pad = 6;
  const corners = [
    [pad, pad],
    [width - 1 - pad, pad],
    [pad, height - 1 - pad],
    [width - 1 - pad, height - 1 - pad],
  ];
  for (const [cx, cy] of corners) {
    for (let dy = -4; dy <= 4; dy += 1) {
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        samples.push([data[i], data[i + 1], data[i + 2]]);
      }
    }
  }
  samples.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  return samples[Math.floor(samples.length / 2)];
}

// Separable chebyshev dilation of a binary mask by radius r (max filter, two passes).
function dilate(mask, width, height, r) {
  const tmp = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 0; x < width; x += 1) {
      let v = 0;
      for (let dx = -r; dx <= r; dx += 1) {
        const xx = x + dx;
        if (xx < 0 || xx >= width) continue;
        if (mask[row + xx]) { v = 1; break; }
      }
      tmp[row + x] = v;
    }
  }
  const out = new Uint8Array(width * height);
  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      let v = 0;
      for (let dy = -r; dy <= r; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        if (tmp[yy * width + x]) { v = 1; break; }
      }
      out[y * width + x] = v;
    }
  }
  return out;
}

function key(pngIn) {
  const png = pngIn;
  const { width, height, data } = png;
  const n = width * height;
  const [bgR, bgG, bgB] = medianCorner(png);

  // --- 1. Border flood fill: mark background pixels reachable from the edges. ---
  const isBg = new Uint8Array(n);
  const stack = [];
  const pushIfBg = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (isBg[p]) return;
    const i = p * 4;
    if (colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= BG_TOLERANCE) {
      isBg[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < width; x += 1) {
    pushIfBg(x, 0);
    pushIfBg(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfBg(0, y);
    pushIfBg(width - 1, y);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % width;
    const y = (p - x) / width;
    pushIfBg(x + 1, y);
    pushIfBg(x - 1, y);
    pushIfBg(x, y + 1);
    pushIfBg(x, y - 1);
  }

  // --- 1b. Enclosed-pocket removal: any pixel the flood could not reach that still matches the
  // backdrop color is walled-off background (fan holes, ring interiors, limb gaps) — cut it,
  // whatever the blob size. Runs before largest-component and feather so hole edges soften like
  // the outer matte and the despill ring later treats hole boundaries as edges. ---
  let pocketPx = 0;
  for (let p = 0; p < n; p += 1) {
    if (isBg[p]) continue;
    const i = p * 4;
    if (colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= POCKET_TOLERANCE) {
      isBg[p] = 1;
      pocketPx += 1;
    }
  }

  // --- 2. Largest connected opaque component (drop floating specks). ---
  const label = new Int32Array(n).fill(-1);
  let bestLabel = -1;
  let bestSize = 0;
  let cur = 0;
  const comp = [];
  for (let start = 0; start < n; start += 1) {
    if (isBg[start] || label[start] !== -1) continue;
    let size = 0;
    comp.length = 0;
    comp.push(start);
    label[start] = cur;
    while (comp.length) {
      const p = comp.pop();
      size += 1;
      const x = p % width;
      const y = (p - x) / width;
      const nbrs = [
        x + 1 < width ? p + 1 : -1,
        x - 1 >= 0 ? p - 1 : -1,
        y + 1 < height ? p + width : -1,
        y - 1 >= 0 ? p - width : -1,
      ];
      for (const q of nbrs) {
        if (q < 0) continue;
        if (isBg[q] || label[q] !== -1) continue;
        label[q] = cur;
        comp.push(q);
      }
    }
    if (size > bestSize) {
      bestSize = size;
      bestLabel = cur;
    }
    cur += 1;
  }
  for (let p = 0; p < n; p += 1) {
    if (!isBg[p] && label[p] !== bestLabel) isBg[p] = 1;
  }

  // --- 3. Inward-only feather. ---
  const alpha = new Float32Array(n);
  for (let p = 0; p < n; p += 1) alpha[p] = isBg[p] ? 0 : 1;
  const r = FEATHER_RADIUS;
  const win = r * 2 + 1;
  const tmp = new Float32Array(n);
  for (let y = 0; y < height; y += 1) {
    let acc = 0;
    const row = y * width;
    for (let x = -r; x <= r; x += 1) acc += alpha[row + Math.min(width - 1, Math.max(0, x))];
    for (let x = 0; x < width; x += 1) {
      tmp[row + x] = acc / win;
      const outX = Math.max(0, x - r);
      const inX = Math.min(width - 1, x + r + 1);
      acc += alpha[row + inX] - alpha[row + outX];
    }
  }
  const blurred = new Float32Array(n);
  for (let x = 0; x < width; x += 1) {
    let acc = 0;
    for (let y = -r; y <= r; y += 1) acc += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
    for (let y = 0; y < height; y += 1) {
      blurred[y * width + x] = acc / win;
      const outY = Math.max(0, y - r);
      const inY = Math.min(height - 1, y + r + 1);
      acc += tmp[inY * width + x] - tmp[outY * width + x];
    }
  }
  let keptEdge = 0;
  for (let p = 0; p < n; p += 1) {
    const outA = alpha[p] === 0 ? 0 : blurred[p];
    const av = Math.round(Math.max(0, Math.min(1, outA)) * 255);
    data[p * 4 + 3] = av;
    if (av > 0 && av < 255) keptEdge += 1;
  }

  // --- 4. Green despill on the edge ring (within DESPILL_EDGE_PX of a transparent pixel). ---
  const transparent = new Uint8Array(n);
  for (let p = 0; p < n; p += 1) transparent[p] = data[p * 4 + 3] === 0 ? 1 : 0;
  const nearT = dilate(transparent, width, height, DESPILL_EDGE_PX);
  let despilled = 0;
  for (let p = 0; p < n; p += 1) {
    if (data[p * 4 + 3] === 0) continue; // skip transparent
    if (!nearT[p]) continue; // interior — never touched
    const i = p * 4;
    const R = data[i];
    const G = data[i + 1];
    const B = data[i + 2];
    const mrb = Math.max(R, B);
    if (G > mrb + DESPILL_MARGIN) {
      data[i + 1] = mrb;
      despilled += 1;
    }
  }

  // --- 5. Self-check: count kept pixels still matching the backdrop (should be ~0). ---
  let bgLikeKept = 0;
  for (let p = 0; p < n; p += 1) {
    if (data[p * 4 + 3] === 0) continue;
    const i = p * 4;
    if (colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= POCKET_TOLERANCE) bgLikeKept += 1;
  }

  return { bg: [bgR, bgG, bgB], comp: bestSize, edge: keptEdge, despilled, pocketPx, bgLikeKept };
}

// Composite the keyed PNG over dark | white side by side, downsampled for a compact QA sheet.
function writeQaComposite(png, outFile) {
  const { width, height, data } = png;
  const targetH = 760;
  const factor = Math.max(1, Math.ceil(height / targetH));
  const w = Math.floor(width / factor);
  const h = Math.floor(height / factor);
  const out = new PNG({ width: w * 2, height: h });
  const dark = [7, 8, 12];
  const white = [255, 255, 255];
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const sx = x * factor;
      const sy = y * factor;
      const si = (sy * width + sx) * 4;
      const a = data[si + 3] / 255;
      const R = data[si];
      const G = data[si + 1];
      const B = data[si + 2];
      // left half (dark bg)
      const li = (y * (w * 2) + x) * 4;
      out.data[li] = Math.round(R * a + dark[0] * (1 - a));
      out.data[li + 1] = Math.round(G * a + dark[1] * (1 - a));
      out.data[li + 2] = Math.round(B * a + dark[2] * (1 - a));
      out.data[li + 3] = 255;
      // right half (white bg)
      const ri = (y * (w * 2) + (x + w)) * 4;
      out.data[ri] = Math.round(R * a + white[0] * (1 - a));
      out.data[ri + 1] = Math.round(G * a + white[1] * (1 - a));
      out.data[ri + 2] = Math.round(B * a + white[2] * (1 - a));
      out.data[ri + 3] = 255;
    }
  }
  writeFileSync(outFile, PNG.sync.write(out));
}

function ffmpeg(args) {
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
}

for (const dir of [OUT_DIR, QA_DIR, TMP_DIR]) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

console.log('=== key-enemies: 10 CONQUEST enemies ===');
const offenders = [];
for (const e of ENEMIES) {
  const srcPath = join(SRC_BASE, e.dir, e.base);
  const pfpPath = join(SRC_BASE, e.dir, e.pfp);
  const png = PNG.sync.read(readFileSync(srcPath));
  const stats = key(png);

  const tmpPng = join(TMP_DIR, `${e.id}-keyed.png`);
  writeFileSync(tmpPng, PNG.sync.write(png));

  const qaFile = join(QA_DIR, `keyqa-${e.id}.png`);
  writeQaComposite(png, qaFile);

  const outWebp = join(OUT_DIR, `${e.id}.webp`);
  ffmpeg(['-y', '-i', tmpPng, '-vf', 'scale=-1:900:flags=lanczos', '-c:v', 'libwebp', '-q:v', '90', '-compression_level', '6', outWebp]);

  const outPfp = join(OUT_DIR, `${e.id}-pfp.webp`);
  ffmpeg(['-y', '-i', pfpPath, '-vf', 'scale=512:512:flags=lanczos', '-c:v', 'libwebp', '-q:v', '88', '-compression_level', '6', outPfp]);

  console.log(
    `${e.id.padEnd(20)} bg=(${stats.bg.join(',')}) comp=${stats.comp}px pocket=${stats.pocketPx}px edge=${stats.edge}px despilled=${stats.despilled}px bgLikeKept=${stats.bgLikeKept}px  [${e.dir}/${e.base}]`,
  );
  if (stats.bgLikeKept > SELF_CHECK_MAX) offenders.push(`${e.id} (${stats.bgLikeKept}px)`);
}
if (offenders.length) {
  console.error(`SELF-CHECK FAIL: backdrop-colored pixels survived keying in: ${offenders.join(', ')} (max ${SELF_CHECK_MAX}px)`);
  process.exit(1);
}
console.log('done. wrote public/assets/enemies/<id>.webp + -pfp.webp + qa-phase20/shots/keyqa-*.png');
