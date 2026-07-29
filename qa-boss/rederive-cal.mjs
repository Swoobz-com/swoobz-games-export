// RE-DERIVE a clip's placement `cal` from its FINAL processed frames.
//
// WHY THIS EXISTS. key-idle-clips.mjs emits the cal at KEY time, but the pipeline of record now
// runs green-neutralize AFTER keying, and neutralize DELETES pixels (the plate halo around a
// translucent effect). Deleting pixels can move the alpha bbox, which is exactly what cal is
// derived from — so an emitted cal can be STALE relative to the webm actually shipped. Any drift
// puts the fighter's feet off the arena floor line in game.
//
// This re-derives cal from whatever frames you point it at, using key-idle-clips.mjs's OWN
// contentBBox + computeCal math (copied verbatim below, same A_THR/COV), so the two are
// comparable. Run it on the FINAL frame dir and diff against the emitted value; ir56's manifest
// documents the same cross-check discipline.
//
// USAGE
//   node qa-boss/rederive-cal.mjs <finalFramesDir> <still.png> [--emitted '{"h":..,"bottom":..,"left":..}']
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(HERE, '..', 'noop.js'));
const { PNG } = require('pngjs');

const A_THR = 8;   // must match key-idle-clips.mjs
const COV = 1;     // must match key-idle-clips.mjs

function contentBBox(png) {
  const { width: W, height: H, data: d } = png;
  const rowc = new Int32Array(H);
  const colc = new Int32Array(W);
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (d[(y * W + x) * 4 + 3] >= A_THR) { rowc[y] += 1; colc[x] += 1; }
    }
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

const [dir, stillPath] = process.argv.slice(2);
if (!dir || !stillPath) {
  console.error('usage: rederive-cal.mjs <finalFramesDir> <still.png> [--emitted <json>]');
  process.exit(2);
}
const ei = process.argv.indexOf('--emitted');
const emitted = ei >= 0 ? JSON.parse(process.argv[ei + 1]) : null;

const frames = fs.readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
if (!frames.length) { console.error('no frames in ' + dir); process.exit(2); }

// The anchor frame is frame 0 of the crop, matching key-idle-clips.mjs's own convention.
const anchor = contentBBox(PNG.sync.read(fs.readFileSync(path.join(dir, frames[0]))));
const still = contentBBox(PNG.sync.read(fs.readFileSync(stillPath)));
const cal = computeCal(still, anchor);

const out = { dir, frames: frames.length, cal };
if (emitted) {
  const d = {
    h: +(cal.h - emitted.h).toFixed(2),
    bottom: +(cal.bottom - emitted.bottom).toFixed(2),
    left: +(cal.left - emitted.left).toFixed(2),
  };
  out.emitted = emitted;
  out.delta = d;
  out.drift = Math.max(Math.abs(d.h), Math.abs(d.bottom), Math.abs(d.left));
  // ir56 accepted <=0.18 in h / <=0.07 in left as lossy-decode noise. Anything larger is a real
  // bbox shift and the RE-DERIVED value must be used.
  out.verdict = out.drift <= 0.2 ? 'match (use either)' : 'DRIFTED - use the re-derived cal';
}
console.log(JSON.stringify(out));
