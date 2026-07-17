// One-time chroma-key preprocessing for the two fighter PNGs.
//
// The fighter art ships on a flat grey studio background. We must remove that grey WITHOUT
// eating the silver/grey armor inside the silhouette. Strategy:
//   1. Sample the true background colour from the four corners (median).
//   2. Flood-fill from every border pixel, marking as background any pixel within a colour
//      tolerance of a *local* border-connected grey. This is contiguous from the edges, so
//      interior silver armor (not reachable from the border without crossing the character)
//      is protected.
//   3. Keep only the largest connected OPAQUE component — this discards floating ember/spark
//      specks (fighter-1) that the flood-fill can't reach because they are not grey.
//   4. Feather the matte edge by ~1.5px (alpha erode-blur) to kill the hard fringe / halo.
//
// Output: public/assets/fighter-1-keyed.png / fighter-2-keyed.png (committed artifacts).
//
// Run: node scripts/key-fighters.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ASSETS = join(__dirname, '..', 'public', 'assets');

// Colour distance tolerance for "is this the grey background". Generous enough to sweep the
// soft studio gradient + JPEG-ish noise, tight enough to keep the metal armor which reads
// distinctly cooler/bluer and has strong local contrast (edges break the flood).
const BG_TOLERANCE = 42;
// Feather radius in pixels for the alpha edge.
const FEATHER_RADIUS = 2;

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

// Scanline hole-fill inside a region of interest: a flooded (background) pixel that is
// bracketed by kept foreground on BOTH sides of its row AND both sides of its column (within
// maxGap) is re-solidified. Used to recover a fighter's own grey skin that reads identical to
// the studio grey (e.g. GORVAK's skull highlight) — that interior grey is bounded left/right
// by his non-grey hair/face, whereas the true open background above the crown is NOT bracketed
// and so stays transparent. Off by default; only the head box is passed for the orc.
function bracketFillRoi(isBg, width, height, roi, maxGap) {
  const x0 = Math.max(0, Math.floor(roi[0] * width));
  const x1 = Math.min(width - 1, Math.ceil(roi[2] * width));
  const y0 = Math.max(0, Math.floor(roi[1] * height));
  const y1 = Math.min(height - 1, Math.ceil(roi[3] * height));
  const gap = Math.round(maxGap * width);
  const hor = new Uint8Array(width * height);
  const ver = new Uint8Array(width * height);
  const hasFgWithin = (from, to, step, get) => {
    for (let k = from; k !== to; k += step) {
      if (!isBg[get(k)]) return true;
      if (Math.abs(k - from) > gap) return false;
    }
    return false;
  };
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const p = y * width + x;
      if (!isBg[p]) continue;
      const left = hasFgWithin(x - 1, x0 - 1, -1, (k) => y * width + k);
      const right = hasFgWithin(x + 1, x1 + 1, 1, (k) => y * width + k);
      if (left && right) hor[p] = 1;
    }
  }
  for (let x = x0; x <= x1; x += 1) {
    for (let y = y0; y <= y1; y += 1) {
      const p = y * width + x;
      if (!isBg[p]) continue;
      const up = hasFgWithin(y - 1, y0 - 1, -1, (k) => k * width + x);
      const down = hasFgWithin(y + 1, y1 + 1, 1, (k) => k * width + x);
      if (up && down) ver[p] = 1;
    }
  }
  for (let p = 0; p < width * height; p += 1) {
    if (hor[p] && ver[p]) isBg[p] = 0;
  }
}

function key(fileIn, fileOut, headRoi) {
  const png = PNG.sync.read(readFileSync(join(ASSETS, fileIn)));
  const { width, height, data } = png;
  const n = width * height;
  const [bgR, bgG, bgB] = medianCorner(png);

  // --- 1. Border flood fill: mark background pixels reachable from the edges. ---
  const isBg = new Uint8Array(n); // 1 = background (transparent)
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

  // --- 1b. Recover fighter-own grey that matches the studio grey (head ROI only). ---
  if (headRoi) {
    bracketFillRoi(isBg, width, height, headRoi, 0.16);
  }

  // --- 2. Largest connected opaque component (drop floating specks like embers). ---
  const label = new Int32Array(n).fill(-1);
  let bestLabel = -1;
  let bestSize = 0;
  let cur = 0;
  const comp = [];
  for (let start = 0; start < n; start += 1) {
    if (isBg[start] || label[start] !== -1) continue;
    // BFS this component.
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

  // Anything not in the largest component becomes background too.
  for (let p = 0; p < n; p += 1) {
    if (!isBg[p] && label[p] !== bestLabel) {
      isBg[p] = 1;
    }
  }

  // --- 3. Build a hard alpha, then feather the edge. ---
  const alpha = new Float32Array(n);
  for (let p = 0; p < n; p += 1) {
    alpha[p] = isBg[p] ? 0 : 1;
  }

  // Separable box blur of alpha over FEATHER_RADIUS, but only pull alpha DOWN near edges so
  // interior stays fully opaque (erode + soften the boundary → no white/grey halo).
  const blurred = new Float32Array(n);
  const r = FEATHER_RADIUS;
  const win = r * 2 + 1;
  // Horizontal pass.
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
  // Vertical pass.
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
    // Background pixels stay fully transparent (never grow the matte outward → no grey halo).
    // Opaque pixels take the blurred value, which is <1 only in the inner transition ring, so
    // the character edge softens inward while the interior stays fully opaque.
    const outA = alpha[p] === 0 ? 0 : blurred[p];
    const i = p * 4;
    const av = Math.round(Math.max(0, Math.min(1, outA)) * 255);
    data[i + 3] = av;
    if (av > 0 && av < 255) keptEdge += 1;
  }

  writeFileSync(join(ASSETS, fileOut), PNG.sync.write(png));
  console.log(
    `${fileIn} -> ${fileOut}: bg=(${bgR},${bgG},${bgB}) largestComp=${bestSize}px featherEdgePx=${keptEdge}`,
  );
}

// GORVAK's grey skull highlight reads identical to the studio grey — recover it via the head
// ROI. VOLTA keys cleanly (no ambiguous grey skin), so no ROI needed.
key('fighter-1.png', 'fighter-1-keyed.png', [0.36, 0.03, 0.54, 0.24]);
key('fighter-2.png', 'fighter-2-keyed.png');
console.log('done');
