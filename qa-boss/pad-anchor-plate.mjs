// pad-anchor-plate — rebuild a TIGHT-CROPPED character plate into a GENERATION-READY anchor plate.
//
// WHY THIS EXISTS. The `input/MK FINAL/` art is cropped tight to the subject: measured across the six
// chosen playables, the character fills 85-95% of frame height with only 18-63px of side margin and
// 39-144px of headroom. For scale, ir37 has 206/208/88 and STILL could not extend her fan without
// busting containment, and hollow-pale at 131/29/37 owns the worst anchor break in the roster. Firing
// clips off a plate that tight guarantees a containment failure on essentially every action, and would
// repeat the ir37 v2..v6 oscillation once per character.
//
// So: re-composite the character smaller and centred on a fresh plate, buying real margin. Same move
// as the phase-9 gorvak CLEAN PLATE rebuild. The generator anchors on THIS plate, not the raw art.
//
// WHAT IT DOES
//   1. measures the subject bbox with the same isGreen test check-containment.mjs uses,
//   2. crops to that bbox, scales the subject to FILL_H of the output height,
//   3. composites it centred horizontally with the FEET on the floor line (bottom margin FLOOR_PAD),
//      on a pure plate-green canvas,
//   4. RE-MEASURES the result and PRINTS the achieved budget, refusing quietly-bad output.
// The bottom edge is deliberately near-flush: check-containment.mjs treats bottom contact as expected
// (feet on the floor) and never counts it, so height spent there is free while headroom is not.
//
// Usage: node qa-boss/pad-anchor-plate.mjs <in.png> <out.png> [--size 1536] [--fill 0.68] [--min-margin 200]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire('C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter/package.json');
const { PNG } = require('pngjs');

const argv = process.argv.slice(2);
const [inFile, outFile] = argv.filter((a) => !a.startsWith('--') && !/^[\d.]+$/.test(a));
const num = (f, d) => { const i = argv.indexOf(f); return i >= 0 ? Number(argv[i + 1]) : d; };
const SIZE = num('--size', 1536);
const FILL_H = num('--fill', 0.68);      // subject height as a fraction of the output frame
const MIN_MARGIN = num('--min-margin', 200);
const FLOOR_PAD = num('--floor-pad', 24); // px of plate left under the feet
// PLATE COLOUR IS SAMPLED FROM THE SOURCE, NOT HARDCODED.
// First version filled the canvas with the prompts' nominal #00b140 while compositing an unkeyed crop
// on top. The MK FINAL art uses a BRIGHTER green, so every plate came out two-tone: a clearly visible
// rectangle of source-green sitting on a darker canvas. That is not cosmetic — the keyers sample a
// BORDER RING to learn the screen colour and then flood-fill from the border, so a second green with a
// hard rectangular boundary invites both a mis-sampled key and a rectangular seam in the alpha.
// Sampling the source's own border median keeps the plate UNIFORM and preserves the exact
// subject-edge-to-plate relationship the existing keyers are already tuned for.

if (!inFile || !outFile) {
  console.error('usage: node qa-boss/pad-anchor-plate.mjs <in.png> <out.png> [--size 1536] [--fill 0.68] [--min-margin 200]');
  process.exit(1);
}

const isGreen = (r, g, b) => g > 110 && g > r + 40 && g > b + 40;

function bbox(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  let x0 = p.width, x1 = -1, y0 = p.height, y1 = -1;
  for (let y = 0; y < p.height; y += 1) {
    for (let x = 0; x < p.width; x += 1) {
      const i = (y * p.width + x) * 4;
      // A fully-transparent pixel is also "not subject" — handles already-keyed inputs.
      if (p.data[i + 3] === 0) continue;
      if (isGreen(p.data[i], p.data[i + 1], p.data[i + 2])) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) throw new Error('no subject found in ' + file);
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1, W: p.width, H: p.height };
}

// Median of the source's border ring = the true screen colour, same idea as the keyers' own sampling.
function platePlateColour(file) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const rs = [], gs = [], bs = [];
  const push = (x, y) => {
    const i = (y * p.width + x) * 4;
    if (p.data[i + 3] === 0) return;
    if (!isGreen(p.data[i], p.data[i + 1], p.data[i + 2])) return;
    rs.push(p.data[i]); gs.push(p.data[i + 1]); bs.push(p.data[i + 2]);
  };
  for (let x = 0; x < p.width; x += 2) { push(x, 0); push(x, p.height - 1); }
  for (let y = 0; y < p.height; y += 2) { push(0, y); push(p.width - 1, y); }
  if (!rs.length) throw new Error('no green border pixels sampled in ' + file);
  const med = (a) => { a.sort((u, v) => u - v); return a[Math.floor(a.length / 2)]; };
  const hex = (n) => n.toString(16).padStart(2, '0');
  return { hex: `0x${hex(med(rs))}${hex(med(gs))}${hex(med(bs))}`, rgb: [med(rs), med(gs), med(bs)] };
}

const PLATE_SAMPLED = platePlateColour(inFile);
const PLATE = PLATE_SAMPLED.hex;
const src = bbox(inFile);
const targetH = Math.round(SIZE * FILL_H);
const scale = targetH / src.h;
const targetW = Math.round(src.w * scale);
const dx = Math.round((SIZE - targetW) / 2);
const dy = SIZE - FLOOR_PAD - targetH; // feet near the floor line, headroom above

if (targetW > SIZE - 2 * MIN_MARGIN) {
  console.error(
    `REFUSING: at fill ${FILL_H} the subject would be ${targetW}px wide in a ${SIZE}px frame, leaving `
    + `${Math.round((SIZE - targetW) / 2)}px per side (< ${MIN_MARGIN}). This subject is WIDE — lower --fill.`,
  );
  process.exit(2);
}

execFileSync('ffmpeg', [
  '-v', 'error', '-y',
  '-f', 'lavfi', '-i', `color=c=${PLATE}:s=${SIZE}x${SIZE}`,
  '-i', inFile,
  '-filter_complex',
  `[1:v]crop=${src.w}:${src.h}:${src.x0}:${src.y0},scale=${targetW}:${targetH}:flags=lanczos[fg];[0:v][fg]overlay=${dx}:${dy}`,
  '-frames:v', '1', '-update', '1', outFile,
]);

const got = bbox(outFile);
const L = got.x0;
const R = got.W - 1 - (got.x0 + got.w - 1);
const T = got.y0;
const ok = L >= MIN_MARGIN && R >= MIN_MARGIN && T >= MIN_MARGIN;
console.log(
  `${path.basename(inFile)}\n`
  + `  source : ${src.W}x${src.H}  subject ${src.w}x${src.h}  (fills ${((src.h / src.H) * 100).toFixed(0)}% of height)\n`
  + `  plate  : sampled ${PLATE} rgb(${PLATE_SAMPLED.rgb.join(',')}) from the source border ring\n`
  + `  padded : ${got.W}x${got.H}  subject ${got.w}x${got.h}  L${L} R${R} T${T}  bottom flush (free)\n`
  + `  budget : ${ok ? 'OK — all margins >= ' + MIN_MARGIN + 'px' : 'TIGHT — below ' + MIN_MARGIN + 'px, lower --fill'}`,
);
if (!ok) process.exit(3);
