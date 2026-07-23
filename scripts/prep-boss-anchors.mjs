// Phase 23 — build MAGENTA anchor plates for the 10 conquest bosses (Seedance anchor-lock input).
//
// Per CHARACTER-CONTRACT §2 + §6 + genvideo-character-clip-lessons: the anchor is the still whose
// frame the model starts AND ends on (start_image==end_image==reference). We key each boss's
// GREEN-screen original at full res (the proven key-enemies pocket-cut recipe), then composite it
// onto a solid 1536x1536 MAGENTA (#a3005f) plate, feet planted near the floor with headroom + side
// room for weapon arcs. Magenta (not green) because the characters own no magenta but several own
// green accents; keying the GENERATED clip back out is then unambiguous (magenta-neutralize handles
// spill). Square 1:1 matches the GORVAK/VOLTA anchors (memory: "magenta 1536x1536") and Seedance's
// 1:1 aspect, so no outpainting (anchor-hygiene law).
//
// Run: node scripts/prep-boss-anchors.mjs  ->  qa-boss/anchors/<id>-anchor.png (10 plates)

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SRC_BASE = join(ROOT, 'input', 'characters', 'playable characters', 'npc boss');
const OUT = join(ROOT, 'qa-boss', 'anchors');

const CANVAS = 1536;
const MAG = [163, 0, 95]; // #a3005f
const GREEN = [0, 177, 64]; // #00b140 chroma green (Tim 2026-07-23: pink/warm-bodied bosses key on
// GREEN so the magenta plate never eats pink/red body parts). Green-bodied bosses (lion-serpent)
// keep the magenta plate. Both plates are emitted; pick per-character at upload.
const PLATE = (process.argv[2] === 'magenta') ? MAG : GREEN; // default GREEN now
const BG_TOLERANCE = 60;          // green bg flood tolerance (from key-enemies)
const POCKET_TOLERANCE = 45;      // enclosed-pocket cut (from key-enemies phase-20 fix)
const HEIGHT_FRAC = 0.86;         // character height as fraction of canvas
const BOTTOM_MARGIN = 0.05;       // feet gap from canvas bottom

const BOSSES = [
  { dir: 'map 1', base: 'Sora Yari.png', id: 'sora-yari' },
  { dir: 'map 2', base: 'Kitsune Tanto.png', id: 'kitsune-tanto' },
  { dir: 'map 3', base: 'Thorn_Warden.png', id: 'thorn-warden' },
  { dir: 'map 4', base: 'Onryo Katana.png', id: 'onryo-katana' },
  { dir: 'map 5', base: 'Satoshi Odachi.png', id: 'satoshi-odachi' },
  { dir: 'map 6', base: 'Eclipse Ofuda.png', id: 'eclipse-ofuda' },
  { dir: 'map 7', base: 'IR-37 Pink Tessen.png', id: 'ir37-pink-tessen' },
  { dir: 'map 8', base: 'IR-56 Lion-Serpent.png', id: 'ir56-lion-serpent' },
  { dir: 'map 9', base: 'Lady Kurotachi.png', id: 'lady-kurotachi' },
  { dir: 'finalboss', base: 'IR-48 Hex Paper Lord.png', id: 'ir48-hex-paper-lord' },
];

function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2, dg = g1 - g2, db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}
function medianCorner(png) {
  const { width, height, data } = png;
  const s = []; const pad = 6;
  for (const [cx, cy] of [[pad, pad], [width - 1 - pad, pad], [pad, height - 1 - pad], [width - 1 - pad, height - 1 - pad]])
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= width || y >= height) continue;
      const i = (y * width + x) * 4; s.push([data[i], data[i + 1], data[i + 2]]);
    }
  s.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2])); return s[s.length >> 1];
}

// key the green -> alpha (border flood + enclosed-pocket cut + largest component), returns bbox too.
function key(png) {
  const { width, height, data } = png; const n = width * height;
  const [bgR, bgG, bgB] = medianCorner(png);
  const isBg = new Uint8Array(n); const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return; const p = y * width + x; if (isBg[p]) return;
    const i = p * 4; if (colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= BG_TOLERANCE) { isBg[p] = 1; stack.push(p); }
  };
  for (let x = 0; x < width; x++) { push(x, 0); push(x, height - 1); }
  for (let y = 0; y < height; y++) { push(0, y); push(width - 1, y); }
  while (stack.length) { const p = stack.pop(); const x = p % width, y = (p - x) / width; push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1); }
  // enclosed-pocket cut
  for (let p = 0; p < n; p++) { if (isBg[p]) continue; const i = p * 4; if (colorDist(data[i], data[i + 1], data[i + 2], bgR, bgG, bgB) <= POCKET_TOLERANCE) isBg[p] = 1; }
  // largest component
  const label = new Int32Array(n).fill(-1); let best = -1, bestSize = 0, cur = 0; const comp = [];
  for (let s0 = 0; s0 < n; s0++) {
    if (isBg[s0] || label[s0] !== -1) continue; let size = 0; comp.length = 0; comp.push(s0); label[s0] = cur;
    while (comp.length) { const p = comp.pop(); size++; const x = p % width, y = (p - x) / width;
      for (const q of [x + 1 < width ? p + 1 : -1, x - 1 >= 0 ? p - 1 : -1, y + 1 < height ? p + width : -1, y - 1 >= 0 ? p - width : -1]) {
        if (q < 0 || isBg[q] || label[q] !== -1) continue; label[q] = cur; comp.push(q);
      } }
    if (size > bestSize) { bestSize = size; best = cur; } cur++;
  }
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let p = 0; p < n; p++) {
    if (!isBg[p] && label[p] !== best) isBg[p] = 1;
    if (!isBg[p]) { const x = p % width, y = (p - x) / width; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  // feathered alpha (inward 2px)
  const alpha = new Float32Array(n); for (let p = 0; p < n; p++) alpha[p] = isBg[p] ? 0 : 1;
  const r = 2, win = r * 2 + 1, tmp = new Float32Array(n), blur = new Float32Array(n);
  for (let y = 0; y < height; y++) { let acc = 0; const row = y * width; for (let x = -r; x <= r; x++) acc += alpha[row + Math.min(width - 1, Math.max(0, x))];
    for (let x = 0; x < width; x++) { tmp[row + x] = acc / win; acc += alpha[row + Math.min(width - 1, x + r + 1)] - alpha[row + Math.max(0, x - r)]; } }
  for (let x = 0; x < width; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(height - 1, Math.max(0, y)) * width + x];
    for (let y = 0; y < height; y++) { blur[y * width + x] = acc / win; acc += tmp[Math.min(height - 1, y + r + 1) * width + x] - tmp[Math.max(0, y - r) * width + x]; } }
  for (let p = 0; p < n; p++) data[p * 4 + 3] = Math.round(Math.max(0, Math.min(1, alpha[p] === 0 ? 0 : blur[p])) * 255);
  return { bbox: [x0, y0, x1 - x0 + 1, y1 - y0 + 1] };
}

// nearest-neighbour-ish bilinear sample of the source into the plate.
function composite(src, bbox, id) {
  const [bx, by, bw, bh] = bbox;
  const targetH = Math.round(CANVAS * HEIGHT_FRAC);
  const scale = targetH / bh;
  const targetW = Math.round(bw * scale);
  const finalW = Math.min(targetW, Math.round(CANVAS * 0.94)); // never wider than 94%
  const finalScale = finalW / bw; const finalH = Math.round(bh * finalScale);
  const out = new PNG({ width: CANVAS, height: CANVAS });
  for (let i = 0; i < CANVAS * CANVAS; i++) { out.data[i * 4] = PLATE[0]; out.data[i * 4 + 1] = PLATE[1]; out.data[i * 4 + 2] = PLATE[2]; out.data[i * 4 + 3] = 255; }
  const offX = Math.round((CANVAS - finalW) / 2);
  const offY = Math.round(CANVAS - finalH - CANVAS * BOTTOM_MARGIN);
  for (let ty = 0; ty < finalH; ty++) for (let tx = 0; tx < finalW; tx++) {
    const sx = Math.min(bw - 1, tx / finalScale), sy = Math.min(bh - 1, ty / finalScale);
    const ix = bx + Math.floor(sx), iy = by + Math.floor(sy);
    const si = (iy * src.width + ix) * 4; const a = src.data[si + 3] / 255;
    if (a <= 0.01) continue;
    const dx = offX + tx, dy = offY + ty; if (dx < 0 || dy < 0 || dx >= CANVAS || dy >= CANVAS) continue;
    const di = (dy * CANVAS + dx) * 4;
    out.data[di] = Math.round(src.data[si] * a + PLATE[0] * (1 - a));
    out.data[di + 1] = Math.round(src.data[si + 1] * a + PLATE[1] * (1 - a));
    out.data[di + 2] = Math.round(src.data[si + 2] * a + PLATE[2] * (1 - a));
    out.data[di + 3] = 255;
  }
  return out;
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
console.log('=== prep-boss-anchors: 10 magenta anchor plates ===');
for (const b of BOSSES) {
  const png = PNG.sync.read(readFileSync(join(SRC_BASE, b.dir, b.base)));
  const { bbox } = key(png);
  const plate = composite(png, bbox, b.id);
  writeFileSync(join(OUT, `${b.id}-anchor-${PLATE===MAG?"magenta":"green"}.png`), PNG.sync.write(plate));
  console.log(`${b.id.padEnd(20)} bbox=${bbox.join(',')} -> ${CANVAS}x${CANVAS} magenta plate`);
}
console.log('done -> qa-boss/anchors/');
