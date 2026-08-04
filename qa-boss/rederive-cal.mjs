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

// ⛔ THESE MUST MATCH key-idle-clips.mjs AND FOR A LONG TIME THEY DID NOT (TOOLCHAIN-AUDIT §6, fixed
// phase 269). This file shipped A_THR=8 / COV=1 while key-idle-clips.mjs:191-192 uses 128 / 3, under a
// header claiming the math was "copied verbatim below, same A_THR/COV". Comparability with the keyer
// is this tool's ENTIRE PURPOSE, so the mismatch attacked the one thing it exists to do: the shipped
// cals were produced by the KEYER's thresholds, and re-deriving with different ones makes the tool
// disagree with a correct value.
// MEASURED on real keyed dirs, 8/1 vs 128/3 on identical inputs:
//   hollow-pale-attack-throw-b  left 56.89 -> 57.10   h 93.27 -> 92.83   bottom 1.55 -> 1.77
//   hollow-pale-idle            left 54.17 -> 54.33   h 93.27 -> 93.04
//   hollow-pale-hit             left 53.22 -> 53.38   h 95.17 -> 94.93
// Every one of those deltas is at or past the 0.2 accept band below, so the drift ALONE could flip a
// verdict to "DRIFTED" against a cal that was right. If you change one file, change both.
const A_THR = 128; // must match key-idle-clips.mjs:191 — verified, not assumed
const COV = 3;     // must match key-idle-clips.mjs:192 — verified, not assumed

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

// ⛔ BOTH INPUTS MUST CARRY ALPHA, AND NOTHING USED TO CHECK (TOOLCHAIN-AUDIT §6, fixed phase 269).
// contentBBox finds the ALPHA content box. Handed a fully-opaque image it degenerates to the whole
// frame — and the result still LOOKS right: on an UNKEYED frames dir the old tool emitted h 98.95 /
// drift 7.98 / "DRIFTED — use the re-derived cal" at exit 0, and h≈99 is the correct ballpark, so
// nothing on screen said the number was meaningless. Pointed at the WRONG CHARACTER's still it gave
// h 74.04 / drift 26.04 with the same confident verdict. This tool's output is hand-transcribed into
// src/characters/<char>.ts as `cal: {h, bottom, left}`, which positions every clip on screen — a
// plausible wrong answer here puts a fighter's feet through the arena floor.
const readKeyed = (file, what) => {
  const png = PNG.sync.read(fs.readFileSync(file));
  let clear = 0;
  for (let i = 3; i < png.data.length; i += 4) if (png.data[i] < A_THR) clear += 1;
  if (clear === 0) {
    console.error(`\n⛔ REFUSING — the ${what} has NO pixel below alpha ${A_THR}: ${file}`);
    console.error('  It is fully opaque, so the alpha content box degenerates to the entire frame and');
    console.error('  every number derived from it is meaningless — while still landing in a plausible');
    console.error('  range (an unkeyed dir reads h~99). This is the UNKEYED-INPUT trap, not a drift.');
    console.error('  Point this at the FINAL KEYED frames and the character\'s KEYED still.');
    process.exit(2);
  }
  const bb = contentBBox(png);
  if (bb.x1 < bb.x0 || bb.y1 < bb.y0) {
    console.error(`\n⛔ REFUSING — the ${what} has no content at all above alpha ${A_THR}: ${file}`);
    process.exit(2);
  }
  return bb;
};

// The anchor frame is frame 0 of the crop, matching key-idle-clips.mjs's own convention.
const anchor = readKeyed(path.join(dir, frames[0]), 'anchor frame');
const still = readKeyed(stillPath, 'still');
const cal = computeCal(still, anchor);

// `still` and `anchorFrame` are echoed because NOTHING binds the frames dir to the still: pass another
// character's still and you get a confident, plausible, wrong cal. The pairing is the caller's
// responsibility, so it has to be visible in the record the caller pastes into the ledger.
const out = { dir, still: stillPath, anchorFrame: frames[0], frames: frames.length, cal };
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
