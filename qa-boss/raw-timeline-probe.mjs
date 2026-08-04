// RAW TIMELINE PROBE — read-only. Tracks a RAW take's silhouette agreement with a keyed reference
// clip's f0 ACROSS THE WHOLE TIMELINE, not just at f0.
//
// WHY THIS EXISTS: an f0-only anchor score qualifies the START pose and says NOTHING about the rest
// of the clip. lady-kurotachi idle_v3 is a recorded failure ("frame 0 = anchor profile but rotates
// FULLY FRONTAL by ~f6") that scores ~0.967 at f0. Any method that reads f0 alone would have passed
// a known-bad take. This samples the timeline so that failure mode is visible.
//
// The raw silhouette comes from a crude green-chroma test, NOT the production keyer's matte, so
// absolute values are approximate. v3 is the LABELLED NEGATIVE CONTROL: if this probe does not
// reproduce v3's documented collapse after ~f6, the probe is not measuring what it claims.
//
// Usage: node raw-timeline-probe.mjs <anchorClip.webm> <hflip|asis> <raw1.mp4,raw2.mp4,...> [samples=25]
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(new URL('../package.json', import.meta.url));
const { PNG } = require('pngjs');

const [anchorClip, orientArg, rawList, samplesArg] = process.argv.slice(2);
const die = (m) => { console.error('REFUSED: ' + m); process.exit(2); };
if (!anchorClip || !orientArg || !rawList) die('usage: node raw-timeline-probe.mjs <anchorClip.webm> <hflip|asis> <raw1,raw2,...> [samples]');
if (!['hflip', 'asis'].includes(orientArg)) die(`orientation must be hflip|asis, got ${orientArg}`);
if (!fs.existsSync(anchorClip)) die(`does not exist: ${anchorClip}`);
const SAMPLES = Number(samplesArg || 25);
if (!Number.isFinite(SAMPLES) || SAMPLES < 3 || SAMPLES > 200) die(`samples must be 3..200, got ${samplesArg}`);
const raws = rawList.split(',').map((s) => s.trim()).filter(Boolean);
if (!raws.length) die('no raws given');
for (const r of raws) if (!fs.existsSync(r)) die(`raw does not exist: ${r}`);

const N = 64;
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'rtp-'));
const cleanup = () => { try { fs.rmSync(tmpRoot, { recursive: true, force: true }); } catch { /* best effort */ } };
function frames(src, vp9) {
  const d = fs.mkdtempSync(path.join(tmpRoot, 'f-'));
  const args = ['-v', 'error', '-y'];
  if (vp9) args.push('-c:v', 'libvpx-vp9');
  args.push('-i', src, '-pix_fmt', 'rgba', path.join(d, 'f_%04d.png'));
  try { execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { cleanup(); die(`ffmpeg failed on ${src}`); }
  const fr = fs.readdirSync(d).filter((f) => f.endsWith('.png')).sort().map((f) => path.join(d, f));
  if (!fr.length) { cleanup(); die(`decoded 0 frames from ${src}`); }
  return fr;
}
function maskOf(file, isSubject) {
  const p = PNG.sync.read(fs.readFileSync(file));
  const at = (x, y) => { const i = (y * p.width + x) * 4; return isSubject(p.data[i], p.data[i + 1], p.data[i + 2], p.data[i + 3]); };
  let x0 = p.width, y0 = p.height, x1 = -1, y1 = -1;
  for (let y = 0; y < p.height; y += 1) for (let x = 0; x < p.width; x += 1) {
    if (at(x, y)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, m = new Uint8Array(N * N);
  for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) {
    m[j * N + i] = at(x0 + Math.floor((i + 0.5) * w / N), y0 + Math.floor((j + 0.5) * h / N)) ? 1 : 0;
  }
  return { m, w, h };
}
const ALPHA = (r, g, b, a) => a > 8;
const NOTGREEN = (r, g, b) => !(g > 90 && g - r > 40 && g - b > 40);
const mir = (m) => { const o = new Uint8Array(N * N); for (let j = 0; j < N; j += 1) for (let i = 0; i < N; i += 1) o[j * N + i] = m[j * N + (N - 1 - i)]; return o; };
const iou = (a, b) => { let I = 0, U = 0; for (let k = 0; k < a.length; k += 1) { if (a[k] & b[k]) I += 1; if (a[k] | b[k]) U += 1; } return U ? I / U : 0; };

// anchor may be a keyed .webm OR a keyed still (.png/.webp) — the PLATE is the kit's real reference,
// and forcing the vp9 decoder on a PNG would fail. Detect rather than assume.
const anchorIsWebm = anchorClip.toLowerCase().endsWith('.webm');
const A = maskOf(frames(anchorClip, anchorIsWebm)[0], ALPHA);
if (!A) { cleanup(); die('anchor silhouette blank'); }
console.log(`ANCHOR ${path.basename(anchorClip)} f0  bbox ${A.w}x${A.h} aspect ${(A.w / A.h).toFixed(3)}   |  raw read ${orientArg.toUpperCase()}, ${SAMPLES} samples/clip\n`);
for (const r of raws) {
  const fr = frames(r, false);
  const idx = Array.from({ length: SAMPLES }, (_, i) => Math.round(i * (fr.length - 1) / (SAMPLES - 1)));
  const series = [];
  for (const i of idx) {
    const g = maskOf(fr[i], NOTGREEN);
    series.push({ i, v: g ? iou(orientArg === 'hflip' ? mir(g.m) : g.m, A.m) : 0, ar: g ? g.w / g.h : 0 });
  }
  const vals = series.map((s) => s.v).sort((a, b) => a - b);
  const med = vals[Math.floor(vals.length / 2)];
  const worst = series.reduce((a, b) => (b.v < a.v ? b : a));
  console.log(`${path.basename(r)}   frames ${fr.length}`);
  console.log(`  f0 ${series[0].v.toFixed(3)}   min ${vals[0].toFixed(3)} @f${worst.i}   median ${med.toFixed(3)}   max ${vals[vals.length - 1].toFixed(3)}   below0.85 ${series.filter((s) => s.v < 0.85).length}/${series.length}`);
  console.log('  ' + series.map((s) => `f${s.i}:${s.v.toFixed(2)}`).join(' '));
  console.log('');
}
cleanup();
