// CHECK-RAW-ANCHOR — anchor-lock for a FRESHLY GENERATED RAW mp4, before any keying.
//
// ############################################################################################
// # WHY THIS EXISTS (phase 87, 2026-07-31).                                                   #
// # Session 17 judged every fresh clip with an INLINE, never-committed script. The numbers     #
// # went into the ledger; the METHOD did not. That is the exact failure the measurement-       #
// # reference rule warns about — FIRE-PLAN.md §MEASUREMENT REFERENCE says "judge a fresh clip  #
// # only against clips measured the SAME way", but with the method unpersisted, a later        #
// # session cannot measure the same way even if it wants to. So the rule was unenforceable     #
// # from the moment the session ended. This file IS that method.                               #
// ############################################################################################
//
// THE THREE REFERENCES, AND WHY THIS TOOL IS A DIFFERENT ONE (FIRE-PLAN.md, phase 78)
//   1. keyed webm  vs idle.webm f0   <- qa-boss/check-anchor-lock.mjs  (the SHIPPED-kit gate)
//   2. keyed webm  vs anchor PLATE   <- ~0.15 LOWER than (1) on the same clip. Not comparable.
//   3. raw mp4     vs the kit anchor <- THIS TOOL. The pre-keying gate.
// Measured proof they are not interchangeable: hollow-pale special-c scores 0.988 as (1) and
// 0.832 as (2). Never compare a number from one reference against a threshold from another.
//
// THE MASK. check-anchor-lock builds its silhouette from the ALPHA plane (alpha > 24). A raw
// generation has no alpha — it is a green (or magenta) chroma screen. So the ONLY difference
// between this tool and check-anchor-lock is how the silhouette mask is derived: here a pixel
// is FOREGROUND when it is far enough from the border-sampled plate colour. Everything after
// that point — largest-connected-component body isolation, bbox normalisation, the 64x64
// resample, the IoU — is the same math, copied verbatim, so the two tools stay comparable in
// SHAPE even though their absolute scales differ.
//
// THE DEBRIS-DRAG CORRECTION IS INHERITED AND IT MATTERS MORE HERE (phase 72).
// This gate bbox-NORMALISES, so anything the beat leaves lying in frame drags the bbox and makes
// every cell of the grid sample a different part of the body. eclipse attack_strike v4 read
// fLast 0.415 over ALL pixels and 0.930 over the BODY — the pose was never broken, the number
// was measuring shed ofuda on the floor. Two earlier "failures" of that same state (0.502, 0.467)
// also shed ofuda and are therefore suspect. BODY is the POSE verdict. A large body-vs-all gap
// is itself the signal that the clip ENDS WITH LITTER ON SCREEN — a real defect, but a PROMPT
// defect (fix the vanish law in the acting line), not a re-roll-the-pose defect.
//
// VALIDATION — this port is only trustworthy if it reproduces numbers taken by the old inline
// method. Run `--selftest` to check it against the three ACCEPTED oni clips in the ledger:
//     hit   f0 0.997  fLast 0.995
//     ko    f0 0.994  fLast 0.249   (correctly off-anchor: a ko must end prone)
// If those do not reproduce within tolerance, THIS TOOL IS WRONG — do not use its numbers to
// accept or reject anything until they do.
//
// USAGE
//   node qa-boss/check-raw-anchor.mjs <clip.mp4> --anchor <anchorClip.mp4|plate.png> [--plate green|magenta]
//   node qa-boss/check-raw-anchor.mjs --selftest
// The anchor for a LIVE kit is idle.webm f0; for a NEW kit it is that kit's own idle RAW f0,
// NOT the anchor plate (oni's ledger records this explicitly).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';

const ROOT = 'C:/Users/Erstr/OneDrive/Bureaublad/swoobz-games-export/swoobz-games-export/streetfighter';
const require = createRequire(`${ROOT}/package.json`);
const { PNG } = require('pngjs');

// Distance from the border-sampled plate colour at which a pixel becomes FOREGROUND.
// Deliberately generous: chroma spill on a dark silhouette edge sits well inside this, and the
// bbox only cares about the OUTER extent, so a slightly fat mask does not move the numbers.
const CHROMA_T = 100;

function decodeFrames(file, want /* 'first' | 'last' | 'both' */) {
  const t = fs.mkdtempSync(path.join(os.tmpdir(), 'rawanchor-'));
  const isPng = /\.png$/i.test(file);
  const args = isPng
    ? ['-y', '-v', 'error', '-i', file, '-vf', 'scale=200:-1', '-frames:v', '1', '-update', '1', path.join(t, 'f_0001.png')]
    : ['-y', '-v', 'error', '-i', file, '-vf', 'scale=200:-1', '-vsync', '0', path.join(t, 'f_%04d.png')];
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status !== 0) { fs.rmSync(t, { recursive: true, force: true }); return null; }
  const names = fs.readdirSync(t).filter((x) => x.endsWith('.png')).sort();
  if (!names.length) { fs.rmSync(t, { recursive: true, force: true }); return null; }
  const first = PNG.sync.read(fs.readFileSync(path.join(t, names[0])));
  const last = PNG.sync.read(fs.readFileSync(path.join(t, names[names.length - 1])));
  fs.rmSync(t, { recursive: true, force: true });
  return { first, last, n: names.length };
}

// Border-ring median = the plate colour actually present in THIS frame, rather than a hard-coded
// #00b140. Generations drift in exposure and a hard-coded screen colour silently fattens the mask.
function plateColour(p) {
  const { width: w, height: h, data: d } = p;
  const rs = [], gs = [], bs = [];
  const push = (x, y) => { const i = (w * y + x) * 4; rs.push(d[i]); gs.push(d[i + 1]); bs.push(d[i + 2]); };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  const med = (a) => { a.sort((m, n) => m - n); return a[a.length >> 1]; };
  return [med(rs), med(gs), med(bs)];
}

// Verbatim from qa-boss/check-anchor-lock.mjs — the fighter and whatever the fighter holds,
// with shed debris discarded.
function largestComponent(m, w, h) {
  const seen = new Uint8Array(w * h);
  let best = null;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const id = w * y + x;
    if (!m[id] || seen[id]) continue;
    const px = [];
    const st = [x, y];
    while (st.length) {
      const yy = st.pop(), xx = st.pop();
      if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
      const i2 = w * yy + xx;
      if (seen[i2] || !m[i2]) continue;
      seen[i2] = 1; px.push(i2);
      st.push(xx + 1, yy); st.push(xx - 1, yy); st.push(xx, yy + 1); st.push(xx, yy - 1);
    }
    if (!best || px.length > best.length) best = px;
  }
  if (!best) return null;
  const out = new Uint8Array(w * h);
  for (const i of best) out[i] = 1;
  return out;
}

// bbox-normalised silhouette: compares POSE, with position and scale divided out.
// Same 64x64 grid and same sampling as check-anchor-lock; only the mask source differs.
function norm(p, bodyOnly) {
  const { width: w, height: h, data: d } = p;
  const [pr, pg, pb] = plateColour(p);
  let m = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = d[i * 4] - pr, g = d[i * 4 + 1] - pg, b = d[i * 4 + 2] - pb;
    if (Math.sqrt(r * r + g * g + b * b) > CHROMA_T) m[i] = 1;
  }
  if (bodyOnly) {
    const lc = largestComponent(m, w, h);
    if (lc) m = lc;
  }
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let i = 0; i < w * h; i++) {
    if (m[i]) {
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return null;
  const N = 64, o = new Uint8Array(N * N), bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    o[y * N + x] = m[(y0 + Math.floor((y + 0.5) * bh / N)) * w + (x0 + Math.floor((x + 0.5) * bw / N))];
  }
  return { grid: o, bbox: { x0, y0, w: bw, h: bh } };
}
const iou = (a, b) => { let i = 0, u = 0; for (let k = 0; k < a.length; k++) { if (a[k] || b[k]) u++; if (a[k] && b[k]) i++; } return u ? i / u : 0; };

function score(clipFile, anchorFile) {
  const A = decodeFrames(anchorFile);
  const C = decodeFrames(clipFile);
  if (!A || !C) return null;
  const anchorAll = norm(A.first), anchorBody = norm(A.first, true);
  const f0All = norm(C.first), f0Body = norm(C.first, true);
  const fLAll = norm(C.last), fLBody = norm(C.last, true);
  const g = (x) => (x ? x.grid : null);
  const r = {
    frames: C.n,
    f0_all: iou(g(anchorAll), g(f0All)),
    f0_body: iou(g(anchorBody), g(f0Body)),
    fLast_all: iou(g(anchorAll), g(fLAll)),
    fLast_body: iou(g(anchorBody), g(fLBody)),
  };
  // A ko must END PRONE, so a low fLast is CORRECT there and the tell that it is genuinely prone
  // (rather than merely crouched or a mess) is a wide/short last-frame bbox. oni ko measured 4.10.
  r.fLast_bbox_aspect = fLBody ? fLBody.bbox.w / fLBody.bbox.h : null;
  return r;
}

const argv = process.argv.slice(2);

if (argv.includes('--selftest')) {
  // The ONLY thing that makes this port usable: it must reproduce the ledger's numbers, which
  // were taken by the old inline method. A mismatch means the port is wrong, not the ledger.
  const anchor = `${ROOT}/qa-boss/raw/oni-tetsubo-idle-v1.mp4`;
  const cases = [
    { name: 'hit', file: `${ROOT}/qa-boss/raw/oni-tetsubo-hit-v1.mp4`, want: { f0: 0.997, fLast: 0.995 } },
    { name: 'ko', file: `${ROOT}/qa-boss/raw/oni-tetsubo-ko-v1.mp4`, want: { f0: 0.994, fLast: 0.249 } },
  ];
  const TOL = 0.02;
  let bad = 0;
  console.log('SELFTEST — reproducing the ledger numbers taken by session 17\'s inline method');
  console.log('anchor = oni-tetsubo-idle-v1.mp4 f0 (the KIT ANCHOR, not the plate)\n');
  console.log('clip'.padEnd(8) + 'f0_body  (want)  |  fLast_body  (want)   verdict');
  console.log('-'.repeat(72));
  for (const c of cases) {
    const s = score(c.file, anchor);
    if (!s) { console.log(c.name.padEnd(8) + 'DECODE FAILED'); bad++; continue; }
    const okF0 = Math.abs(s.f0_body - c.want.f0) <= TOL;
    const okFL = Math.abs(s.fLast_body - c.want.fLast) <= TOL;
    if (!okF0 || !okFL) bad++;
    console.log(c.name.padEnd(8) + s.f0_body.toFixed(3) + '  (' + c.want.f0.toFixed(3) + ')  |  ' +
      s.fLast_body.toFixed(3) + '     (' + c.want.fLast.toFixed(3) + ')   ' +
      (okF0 && okFL ? 'MATCH' : 'MISMATCH — port is wrong, do not trust this tool'));
  }
  console.log('-'.repeat(72));
  console.log(bad ? `${bad} case(s) MISMATCH — fix the port before using it` : 'port reproduces the ledger. Tool is usable.');
  process.exit(bad ? 1 : 0);
}

const ai = argv.indexOf('--anchor');
const clip = argv.find((a) => !a.startsWith('--') && a !== argv[ai + 1]);
const anchorFile = ai >= 0 ? argv[ai + 1] : null;
if (!clip || !anchorFile) {
  console.error('usage: check-raw-anchor.mjs <clip.mp4> --anchor <anchorClip.mp4|plate.png>');
  console.error('       check-raw-anchor.mjs --selftest');
  process.exit(2);
}
const s = score(clip, anchorFile);
if (!s) { console.error('decode failed'); process.exit(2); }
console.log(`clip   = ${path.basename(clip)}  (${s.frames} frames)`);
console.log(`anchor = ${path.basename(anchorFile)} f0`);
console.log('');
console.log('           BODY (pose verdict)   ALL (includes debris)');
console.log(`f0         ${s.f0_body.toFixed(3).padStart(10)}          ${s.f0_all.toFixed(3).padStart(10)}`);
console.log(`fLast      ${s.fLast_body.toFixed(3).padStart(10)}          ${s.fLast_all.toFixed(3).padStart(10)}`);
console.log('');
console.log(`fLast bbox aspect (w/h) = ${s.fLast_bbox_aspect.toFixed(2)}   (a ko that truly ends PRONE reads ~4.0; a standing return reads ~0.6-1.2)`);
const gapF0 = s.f0_all - s.f0_body, gapFL = s.fLast_all - s.fLast_body;
if (gapFL < -0.15) {
  console.log('');
  console.log('[ENDS WITH DEBRIS ON SCREEN] body ' + s.fLast_body.toFixed(3) + ' vs all ' + s.fLast_all.toFixed(3) +
    ' — the POSE is fine; shed material is still in frame at the last frame and is dragging the bbox.');
  console.log('That is a PROMPT fix (the vanish law), not a pose re-roll. See phase 72.');
}
if (gapF0 < -0.15) console.log('[f0 already has debris in frame — check the start frame]');
